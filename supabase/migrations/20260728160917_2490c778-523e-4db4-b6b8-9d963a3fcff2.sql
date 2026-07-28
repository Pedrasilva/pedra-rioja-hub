-- ============ 1. schedule row extensions ============
ALTER TABLE public.financing_schedule_rows
  ADD COLUMN IF NOT EXISTS vat numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commissions numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_version_id uuid REFERENCES public.financing_schedule_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_id uuid;

ALTER TABLE public.financing_schedule_rows DROP CONSTRAINT IF EXISTS financing_schedule_rows_status_check;
ALTER TABLE public.financing_schedule_rows ADD CONSTRAINT financing_schedule_rows_status_check
  CHECK (status IN ('scheduled','due','settled','reconciled','skipped','superseded'));

CREATE INDEX IF NOT EXISTS financing_schedule_rows_due_idx
  ON public.financing_schedule_rows (company_id, due_date);

-- ============ 2. immutability of settled / reconciled instalments ============
CREATE OR REPLACE FUNCTION public.tg_protect_settled_instalment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('settled','reconciled') THEN
      RAISE EXCEPTION 'Instalment % is % and cannot be deleted', OLD.period_no, OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('settled','reconciled') THEN
    IF NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.period_no IS DISTINCT FROM OLD.period_no
       OR NEW.principal IS DISTINCT FROM OLD.principal
       OR NEW.interest IS DISTINCT FROM OLD.interest
       OR NEW.vat IS DISTINCT FROM OLD.vat
       OR NEW.commissions IS DISTINCT FROM OLD.commissions
       OR NEW.insurance IS DISTINCT FROM OLD.insurance
       OR NEW.fees IS DISTINCT FROM OLD.fees
       OR NEW.total_payment IS DISTINCT FROM OLD.total_payment
       OR NEW.version_id IS DISTINCT FROM OLD.version_id
       OR NEW.status = 'superseded'
    THEN
      RAISE EXCEPTION 'Instalment % is % and its amounts, dates and version are immutable', OLD.period_no, OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.status = 'reconciled' AND NEW.reconciled_at IS NULL THEN
    NEW.reconciled_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS financing_rows_protect ON public.financing_schedule_rows;
CREATE TRIGGER financing_rows_protect
  BEFORE UPDATE OR DELETE ON public.financing_schedule_rows
  FOR EACH ROW EXECUTE FUNCTION public.tg_protect_settled_instalment();

-- ============ 3. import staging ============
CREATE TABLE public.financing_schedule_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agreement_id uuid NOT NULL REFERENCES public.financing_agreements(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','xlsx')),
  file_name text,
  content_hash text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  effective_from date NOT NULL,
  reason text NOT NULL DEFAULT 'origination'
    CHECK (reason IN ('origination','rate_reset','early_repayment','restructure','correction')),
  index_rate_used numeric(7,4),
  rate_applied numeric(7,4),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','committed','discarded')),
  row_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  committed_version_id uuid REFERENCES public.financing_schedule_versions(id) ON DELETE SET NULL,
  committed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX financing_imports_unique_committed_hash
  ON public.financing_schedule_imports (agreement_id, content_hash)
  WHERE status = 'committed' AND content_hash IS NOT NULL;

CREATE TABLE public.financing_schedule_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.financing_schedule_imports(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  period_no int,
  due_date date,
  opening_balance numeric(14,2),
  interest numeric(14,2) NOT NULL DEFAULT 0,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  vat numeric(14,2) NOT NULL DEFAULT 0,
  commissions numeric(14,2) NOT NULL DEFAULT 0,
  insurance numeric(14,2) NOT NULL DEFAULT 0,
  fees numeric(14,2) NOT NULL DEFAULT 0,
  total_payment numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2),
  issues text[] NOT NULL DEFAULT '{}',
  include boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (import_id, line_no)
);
CREATE INDEX financing_import_rows_import_idx ON public.financing_schedule_import_rows (import_id);

-- ============ 4. projected cash-flow ledger ============
CREATE TABLE public.cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  direction text NOT NULL DEFAULT 'outflow' CHECK (direction IN ('inflow','outflow')),
  state text NOT NULL DEFAULT 'committed'
    CHECK (state IN ('forecast','committed','actual','reconciled')),
  category text NOT NULL DEFAULT 'financing',
  description text,
  currency char(3) NOT NULL DEFAULT 'EUR',
  amount_total numeric(14,2) NOT NULL DEFAULT 0,
  principal numeric(14,2) NOT NULL DEFAULT 0,
  interest numeric(14,2) NOT NULL DEFAULT 0,
  vat numeric(14,2) NOT NULL DEFAULT 0,
  commissions numeric(14,2) NOT NULL DEFAULT 0,
  insurance numeric(14,2) NOT NULL DEFAULT 0,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  agreement_id uuid REFERENCES public.financing_agreements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  UNIQUE (source_type, source_id)
);
CREATE INDEX cash_flow_entries_company_date_idx ON public.cash_flow_entries (company_id, entry_date);
CREATE INDEX cash_flow_entries_agreement_idx ON public.cash_flow_entries (agreement_id);

CREATE OR REPLACE FUNCTION public.tg_sync_financing_cash_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.financing_agreements%ROWTYPE;
  v_state text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cash_flow_entries
      WHERE source_type = 'financing_schedule_row' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT a2.* INTO a FROM public.financing_agreements a2
    JOIN public.financing_schedule_versions v ON v.agreement_id = a2.id
   WHERE v.id = NEW.version_id;

  IF NEW.status = 'superseded' OR NEW.status = 'skipped' THEN
    DELETE FROM public.cash_flow_entries
      WHERE source_type = 'financing_schedule_row' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  v_state := CASE NEW.status
    WHEN 'reconciled' THEN 'reconciled'
    WHEN 'settled' THEN 'actual'
    ELSE 'committed' END;

  INSERT INTO public.cash_flow_entries (
    company_id, property_id, entry_date, direction, state, category, description,
    currency, amount_total, principal, interest, vat, commissions, insurance,
    source_type, source_id, agreement_id)
  VALUES (
    NEW.company_id, a.property_id, NEW.due_date, 'outflow', v_state, 'financing',
    coalesce(a.lender, 'Financing') || ' instalment #' || NEW.period_no,
    coalesce(a.currency, 'EUR'), NEW.total_payment, NEW.principal, NEW.interest,
    NEW.vat, NEW.commissions, NEW.insurance,
    'financing_schedule_row', NEW.id, a.id)
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    entry_date = EXCLUDED.entry_date,
    state = EXCLUDED.state,
    property_id = EXCLUDED.property_id,
    amount_total = EXCLUDED.amount_total,
    principal = EXCLUDED.principal,
    interest = EXCLUDED.interest,
    vat = EXCLUDED.vat,
    commissions = EXCLUDED.commissions,
    insurance = EXCLUDED.insurance,
    description = EXCLUDED.description,
    updated_at = now();

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS financing_rows_cash_flow ON public.financing_schedule_rows;
CREATE TRIGGER financing_rows_cash_flow
  AFTER INSERT OR UPDATE OR DELETE ON public.financing_schedule_rows
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_financing_cash_flow();

-- ============ 5. grants, RLS, touch triggers ============
DO $$
DECLARE
  t text;
  manage_tables text[] := ARRAY['cash_flow_entries'];
  record_tables text[] := ARRAY['financing_schedule_imports','financing_schedule_import_rows'];
BEGIN
  FOREACH t IN ARRAY manage_tables || record_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_view_company(company_id))',
      t || '_select', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row()',
      t || '_touch', t);
  END LOOP;

  FOREACH t IN ARRAY manage_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id))',
      t || '_manage', t);
  END LOOP;

  FOREACH t IN ARRAY record_tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_record_company(company_id)) WITH CHECK (public.can_record_company(company_id))',
      t || '_manage', t);
  END LOOP;
END $$;

-- ============ 6. revise-schedule routine ============
CREATE OR REPLACE FUNCTION public.apply_financing_schedule(
  _agreement_id uuid,
  _effective_from date,
  _reason text,
  _rows jsonb,
  _notes text DEFAULT NULL,
  _import_id uuid DEFAULT NULL,
  _index_rate_used numeric DEFAULT NULL,
  _rate_applied numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  a public.financing_agreements%ROWTYPE;
  v_no int;
  v_id uuid;
  v_clash int;
BEGIN
  SELECT * INTO a FROM public.financing_agreements WHERE id = _agreement_id AND deleted_at IS NULL;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Financing agreement not found or not accessible';
  END IF;

  IF _rows IS NULL OR jsonb_array_length(_rows) = 0 THEN
    RAISE EXCEPTION 'A schedule version needs at least one instalment';
  END IF;

  -- reconciliation protection: never replace a locked instalment
  SELECT count(*) INTO v_clash
    FROM public.financing_schedule_rows r
    JOIN public.financing_schedule_versions v ON v.id = r.version_id
   WHERE v.agreement_id = _agreement_id
     AND r.status IN ('settled','reconciled')
     AND r.due_date >= _effective_from
     AND r.due_date IN (SELECT (x->>'due_date')::date FROM jsonb_array_elements(_rows) x);
  IF v_clash > 0 THEN
    RAISE EXCEPTION 'Revision overlaps % already settled or reconciled instalment(s); move the effective date forward', v_clash
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(max(version_no), 0) + 1 INTO v_no
    FROM public.financing_schedule_versions WHERE agreement_id = _agreement_id;

  INSERT INTO public.financing_schedule_versions (
    company_id, agreement_id, version_no, effective_from, reason,
    index_rate_used, rate_applied, is_current, notes)
  VALUES (a.company_id, _agreement_id, v_no, _effective_from,
          coalesce(_reason, CASE WHEN v_no = 1 THEN 'origination' ELSE 'restructure' END),
          _index_rate_used, _rate_applied, true, _notes)
  RETURNING id INTO v_id;

  -- retire only future, unreconciled projections
  UPDATE public.financing_schedule_rows r
     SET status = 'superseded',
         superseded_at = now(),
         superseded_by_version_id = v_id
    FROM public.financing_schedule_versions v
   WHERE r.version_id = v.id
     AND v.agreement_id = _agreement_id
     AND v.id <> v_id
     AND r.due_date >= _effective_from
     AND r.status IN ('scheduled','due');

  UPDATE public.financing_schedule_versions
     SET is_current = false
   WHERE agreement_id = _agreement_id AND id <> v_id AND is_current;

  INSERT INTO public.financing_schedule_rows (
    company_id, version_id, period_no, due_date, opening_balance, interest, principal,
    vat, commissions, insurance, fees, total_payment, closing_balance, status, import_id)
  SELECT a.company_id, v_id,
         coalesce((x->>'period_no')::int, row_number() OVER ())::int,
         (x->>'due_date')::date,
         coalesce((x->>'opening_balance')::numeric, 0),
         coalesce((x->>'interest')::numeric, 0),
         coalesce((x->>'principal')::numeric, 0),
         coalesce((x->>'vat')::numeric, 0),
         coalesce((x->>'commissions')::numeric, 0),
         coalesce((x->>'insurance')::numeric, 0),
         coalesce((x->>'fees')::numeric, 0),
         coalesce((x->>'total_payment')::numeric, 0),
         coalesce((x->>'closing_balance')::numeric, 0),
         'scheduled', _import_id
    FROM jsonb_array_elements(_rows) x
   WHERE (x->>'due_date')::date >= _effective_from;

  UPDATE public.financing_agreements
     SET current_version_id = v_id
   WHERE id = _agreement_id;

  IF _import_id IS NOT NULL THEN
    UPDATE public.financing_schedule_imports
       SET status = 'committed', committed_version_id = v_id, committed_at = now()
     WHERE id = _import_id;
  END IF;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_financing_schedule(uuid, date, text, jsonb, text, uuid, numeric, numeric) TO authenticated;

-- ============ 7. views ============
CREATE OR REPLACE VIEW public.v_financing_schedule_current WITH (security_invoker = on) AS
SELECT r.id, r.company_id, v.agreement_id, a.property_id, v.id AS version_id, v.version_no,
       r.period_no, r.due_date, r.opening_balance, r.interest, r.principal, r.vat,
       r.commissions, r.insurance, r.fees, r.total_payment, r.closing_balance,
       r.status, r.settled_amount, r.settled_on, r.reconciled_at,
       (r.status IN ('settled','reconciled')) AS is_locked
FROM public.financing_schedule_rows r
JOIN public.financing_schedule_versions v ON v.id = r.version_id
JOIN public.financing_agreements a ON a.id = v.agreement_id
WHERE r.status <> 'superseded' AND v.deleted_at IS NULL AND a.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_financing_agreement_summary WITH (security_invoker = on) AS
SELECT a.id AS agreement_id, a.company_id, a.property_id, a.lender, a.type, a.status,
       a.currency, a.principal AS original_principal, a.start_date, a.end_date,
       a.rate_type, a.fixed_rate, a.index_name, a.spread,
       (SELECT max(version_no) FROM public.financing_schedule_versions v WHERE v.agreement_id = a.id) AS version_count,
       s.instalment_count,
       s.paid_principal,
       CASE WHEN s.instalment_count IS NULL THEN NULL
            ELSE a.principal - coalesce(s.paid_principal, 0) END AS outstanding_principal,
       s.next_due_date,
       s.next_total_payment,
       s.interest_paid,
       s.remaining_total
FROM public.financing_agreements a
LEFT JOIN LATERAL (
  SELECT count(*) AS instalment_count,
         sum(c.principal) FILTER (WHERE c.status IN ('settled','reconciled')) AS paid_principal,
         sum(c.interest) FILTER (WHERE c.status IN ('settled','reconciled')) AS interest_paid,
         sum(c.total_payment) FILTER (WHERE c.status IN ('scheduled','due')) AS remaining_total,
         min(c.due_date) FILTER (WHERE c.status IN ('scheduled','due')) AS next_due_date,
         (SELECT c2.total_payment FROM public.v_financing_schedule_current c2
           WHERE c2.agreement_id = a.id AND c2.status IN ('scheduled','due')
           ORDER BY c2.due_date LIMIT 1) AS next_total_payment
  FROM public.v_financing_schedule_current c
  WHERE c.agreement_id = a.id
) s ON true
WHERE a.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_cash_flow_projection WITH (security_invoker = on) AS
SELECT e.company_id,
       date_trunc('month', e.entry_date)::date AS month,
       e.category, e.state, e.direction, e.property_id, e.agreement_id,
       sum(e.amount_total) AS amount_total,
       sum(e.principal) AS principal,
       sum(e.interest) AS interest,
       sum(e.vat) AS vat,
       sum(e.commissions) AS commissions,
       sum(e.insurance) AS insurance
FROM public.cash_flow_entries e
GROUP BY 1,2,3,4,5,6,7;