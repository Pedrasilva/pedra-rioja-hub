-- =========================================================== bank accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  bank_name text,
  iban text,
  bic text,
  currency text NOT NULL DEFAULT 'EUR',
  account_type text NOT NULL DEFAULT 'current',
  opening_balance numeric(16,2) NOT NULL DEFAULT 0,
  opening_balance_date date NOT NULL DEFAULT current_date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_accounts_select ON public.bank_accounts FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY bank_accounts_manage ON public.bank_accounts FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER bank_accounts_touch BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER bank_accounts_audit AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- =============================================================== scenarios
CREATE TABLE public.cash_flow_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_scenarios TO authenticated;
GRANT ALL ON public.cash_flow_scenarios TO service_role;
ALTER TABLE public.cash_flow_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_scenarios_select ON public.cash_flow_scenarios FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY cash_flow_scenarios_manage ON public.cash_flow_scenarios FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER cash_flow_scenarios_touch BEFORE UPDATE ON public.cash_flow_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();

CREATE OR REPLACE FUNCTION public.seed_company_scenarios(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.cash_flow_scenarios (company_id, code, label, description, is_default, sort_order)
  VALUES
    (_company_id,'base','Base','Most likely plan',true,10),
    (_company_id,'conservative','Conservative','Prudent assumptions',false,20),
    (_company_id,'optimistic','Optimistic','Upside assumptions',false,30)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.tg_seed_company_scenarios()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.seed_company_scenarios(NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER companies_seed_scenarios AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_company_scenarios();

SELECT public.seed_company_scenarios(id) FROM public.companies;

-- ========================================================= recurring rules
CREATE TABLE public.cash_flow_recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  agreement_id uuid REFERENCES public.financing_agreements(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  direction text NOT NULL DEFAULT 'outflow' CHECK (direction IN ('inflow','outflow')),
  state text NOT NULL DEFAULT 'committed' CHECK (state IN ('committed','forecast')),
  counterparty_type text CHECK (counterparty_type IN ('supplier','client','tenant','lender','authority','other')),
  counterparty_name text,
  currency text NOT NULL DEFAULT 'EUR',
  amount_net numeric(16,2) NOT NULL DEFAULT 0,
  vat numeric(16,2) NOT NULL DEFAULT 0,
  amount_total numeric(16,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly','monthly','quarterly','semiannual','annual','custom')),
  interval_count int NOT NULL DEFAULT 1 CHECK (interval_count BETWEEN 1 AND 120),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  start_date date NOT NULL,
  end_date date,
  max_occurrences int CHECK (max_occurrences > 0),
  confidence text NOT NULL DEFAULT 'high' CHECK (confidence IN ('confirmed','high','medium','low')),
  scenario_code text,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_through date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX cash_flow_rules_company_idx ON public.cash_flow_recurring_rules (company_id, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_recurring_rules TO authenticated;
GRANT ALL ON public.cash_flow_recurring_rules TO service_role;
ALTER TABLE public.cash_flow_recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_flow_rules_select ON public.cash_flow_recurring_rules FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY cash_flow_rules_manage ON public.cash_flow_recurring_rules FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER cash_flow_rules_touch BEFORE UPDATE ON public.cash_flow_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER cash_flow_rules_audit AFTER INSERT OR UPDATE OR DELETE ON public.cash_flow_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- =================================================== cash_flow_entries grow
ALTER TABLE public.cash_flow_entries
  ADD COLUMN unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  ADD COLUMN project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  ADD COLUMN tenancy_id uuid REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
  ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN rule_id uuid REFERENCES public.cash_flow_recurring_rules(id) ON DELETE CASCADE,
  ADD COLUMN counterparty_type text,
  ADD COLUMN counterparty_name text,
  ADD COLUMN expected_date date,
  ADD COLUMN actual_date date,
  ADD COLUMN amount_net numeric(16,2) NOT NULL DEFAULT 0,
  ADD COLUMN confidence text NOT NULL DEFAULT 'high',
  ADD COLUMN scenario_code text,
  ADD COLUMN is_included boolean NOT NULL DEFAULT true,
  ADD COLUMN is_manual boolean NOT NULL DEFAULT true,
  ADD COLUMN reconciliation_state text NOT NULL DEFAULT 'unmatched',
  ADD COLUMN occurrence_key text NOT NULL DEFAULT '',
  ADD COLUMN notes text,
  ADD COLUMN deleted_at timestamptz;

UPDATE public.cash_flow_entries
   SET expected_date = entry_date,
       amount_net = amount_total - vat,
       is_manual = false,
       confidence = 'confirmed',
       actual_date = CASE WHEN state IN ('actual','reconciled') THEN entry_date END,
       reconciliation_state = CASE WHEN state = 'reconciled' THEN 'reconciled' ELSE 'unmatched' END;

ALTER TABLE public.cash_flow_entries
  ALTER COLUMN expected_date SET NOT NULL,
  ALTER COLUMN source_id DROP NOT NULL,
  ADD CONSTRAINT cash_flow_entries_state_chk
    CHECK (state IN ('actual','reconciled','committed','forecast')),
  ADD CONSTRAINT cash_flow_entries_confidence_chk
    CHECK (confidence IN ('confirmed','high','medium','low')),
  ADD CONSTRAINT cash_flow_entries_recon_chk
    CHECK (reconciliation_state IN ('unmatched','matched','reconciled','ignored')),
  ADD CONSTRAINT cash_flow_entries_direction_chk
    CHECK (direction IN ('inflow','outflow'));

ALTER TABLE public.cash_flow_entries
  DROP CONSTRAINT IF EXISTS cash_flow_entries_source_type_source_id_key;
CREATE UNIQUE INDEX cash_flow_entries_source_key
  ON public.cash_flow_entries (source_type, source_id, occurrence_key);
CREATE INDEX cash_flow_entries_expected_idx
  ON public.cash_flow_entries (company_id, expected_date);
CREATE INDEX cash_flow_entries_rule_idx ON public.cash_flow_entries (rule_id);

-- entry_date always reflects the bank-timing date
CREATE OR REPLACE FUNCTION public.tg_cash_flow_entry_date()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.expected_date IS NULL THEN NEW.expected_date := NEW.entry_date; END IF;
  NEW.entry_date := coalesce(NEW.actual_date, NEW.expected_date);
  NEW.amount_total := coalesce(NEW.amount_total, 0);
  RETURN NEW;
END $$;
CREATE TRIGGER cash_flow_entries_dates BEFORE INSERT OR UPDATE ON public.cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_cash_flow_entry_date();

-- system-owned rows are consumed, never re-typed; reconciled rows are frozen
CREATE OR REPLACE FUNCTION public.tg_guard_cash_flow_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE syncing boolean := coalesce(current_setting('pedra.cf_sync', true), '') = 'on';
BEGIN
  IF syncing THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.state = 'reconciled' OR OLD.reconciliation_state = 'reconciled' THEN
      RAISE EXCEPTION 'Reconciled cash-flow entries cannot be deleted'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT OLD.is_manual THEN
      RAISE EXCEPTION 'This entry is owned by its source record and cannot be deleted here'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_manual THEN
      RAISE EXCEPTION 'Only source modules may create linked cash-flow entries'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.state = 'reconciled' OR OLD.reconciliation_state = 'reconciled' THEN
    RAISE EXCEPTION 'Reconciled cash-flow entries are immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT OLD.is_manual THEN
    IF NEW.amount_total IS DISTINCT FROM OLD.amount_total
       OR NEW.amount_net IS DISTINCT FROM OLD.amount_net
       OR NEW.vat IS DISTINCT FROM OLD.vat
       OR NEW.principal IS DISTINCT FROM OLD.principal
       OR NEW.interest IS DISTINCT FROM OLD.interest
       OR NEW.commissions IS DISTINCT FROM OLD.commissions
       OR NEW.insurance IS DISTINCT FROM OLD.insurance
       OR NEW.expected_date IS DISTINCT FROM OLD.expected_date
       OR NEW.direction IS DISTINCT FROM OLD.direction
       OR NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.source_id IS DISTINCT FROM OLD.source_id
       OR NEW.is_manual IS DISTINCT FROM OLD.is_manual
    THEN
      RAISE EXCEPTION 'Amounts and dates of a linked cash-flow entry are maintained by its source record'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF OLD.state = 'actual' AND NEW.state NOT IN ('actual','reconciled') THEN
    RAISE EXCEPTION 'An actual bank movement cannot go back to a projected state'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cash_flow_entries_guard BEFORE INSERT OR UPDATE OR DELETE ON public.cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_cash_flow_entry();

CREATE TRIGGER cash_flow_entries_audit AFTER INSERT OR UPDATE OR DELETE ON public.cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- recorders may register settlements; managers keep full rights
DROP POLICY IF EXISTS cash_flow_entries_manage ON public.cash_flow_entries;
CREATE POLICY cash_flow_entries_manage ON public.cash_flow_entries FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE POLICY cash_flow_entries_record ON public.cash_flow_entries FOR UPDATE TO authenticated
  USING (public.can_record_company(company_id)) WITH CHECK (public.can_record_company(company_id));

-- financing sync keeps the new columns coherent
CREATE OR REPLACE FUNCTION public.tg_sync_financing_cash_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  a public.financing_agreements%ROWTYPE;
  v_state text;
BEGIN
  PERFORM set_config('pedra.cf_sync', 'on', true);

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.cash_flow_entries
      WHERE source_type = 'financing_schedule_row' AND source_id = OLD.id;
    PERFORM set_config('pedra.cf_sync', 'off', true);
    RETURN OLD;
  END IF;

  SELECT a2.* INTO a FROM public.financing_agreements a2
    JOIN public.financing_schedule_versions v ON v.agreement_id = a2.id
   WHERE v.id = NEW.version_id;

  IF NEW.status IN ('superseded','skipped') THEN
    DELETE FROM public.cash_flow_entries
      WHERE source_type = 'financing_schedule_row' AND source_id = NEW.id;
    PERFORM set_config('pedra.cf_sync', 'off', true);
    RETURN NEW;
  END IF;

  v_state := CASE NEW.status
    WHEN 'reconciled' THEN 'reconciled'
    WHEN 'settled' THEN 'actual'
    ELSE 'committed' END;

  INSERT INTO public.cash_flow_entries (
    company_id, property_id, entry_date, expected_date, actual_date, direction, state, category,
    description, currency, amount_total, amount_net, principal, interest, vat, commissions, insurance,
    source_type, source_id, agreement_id, is_manual, confidence, counterparty_type, counterparty_name,
    reconciliation_state)
  VALUES (
    NEW.company_id, a.property_id, NEW.due_date, NEW.due_date,
    CASE WHEN v_state IN ('actual','reconciled') THEN coalesce(NEW.settled_on, NEW.due_date) END,
    'outflow', v_state, 'financing',
    coalesce(a.lender, 'Financing') || ' instalment #' || NEW.period_no,
    coalesce(a.currency, 'EUR'), NEW.total_payment, NEW.total_payment - NEW.vat,
    NEW.principal, NEW.interest, NEW.vat, NEW.commissions, NEW.insurance,
    'financing_schedule_row', NEW.id, a.id, false, 'confirmed', 'lender', a.lender,
    CASE WHEN v_state = 'reconciled' THEN 'reconciled' ELSE 'unmatched' END)
  ON CONFLICT (source_type, source_id, occurrence_key) DO UPDATE SET
    entry_date = EXCLUDED.entry_date,
    expected_date = EXCLUDED.expected_date,
    actual_date = EXCLUDED.actual_date,
    state = EXCLUDED.state,
    property_id = EXCLUDED.property_id,
    amount_total = EXCLUDED.amount_total,
    amount_net = EXCLUDED.amount_net,
    principal = EXCLUDED.principal,
    interest = EXCLUDED.interest,
    vat = EXCLUDED.vat,
    commissions = EXCLUDED.commissions,
    insurance = EXCLUDED.insurance,
    description = EXCLUDED.description,
    reconciliation_state = EXCLUDED.reconciliation_state,
    updated_at = now();

  PERFORM set_config('pedra.cf_sync', 'off', true);
  RETURN NEW;
END $$;

-- =============================================== recurring occurrence engine
CREATE OR REPLACE FUNCTION public.generate_recurring_cash_flow(_rule_id uuid, _through date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r public.cash_flow_recurring_rules%ROWTYPE;
  step interval;
  d date;
  n int := 0;
  made int := 0;
  horizon date;
BEGIN
  SELECT * INTO r FROM public.cash_flow_recurring_rules
   WHERE id = _rule_id AND deleted_at IS NULL;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Recurring rule not found'; END IF;
  IF NOT public.can_record_company(r.company_id) THEN
    RAISE EXCEPTION 'Not allowed to generate occurrences for this company';
  END IF;
  IF NOT r.is_active THEN RETURN 0; END IF;

  step := CASE r.frequency
    WHEN 'weekly' THEN make_interval(weeks => r.interval_count)
    WHEN 'monthly' THEN make_interval(months => r.interval_count)
    WHEN 'quarterly' THEN make_interval(months => 3 * r.interval_count)
    WHEN 'semiannual' THEN make_interval(months => 6 * r.interval_count)
    WHEN 'annual' THEN make_interval(years => r.interval_count)
    ELSE make_interval(months => r.interval_count) END;

  horizon := least(coalesce(r.end_date, _through), _through);
  d := r.start_date;

  PERFORM set_config('pedra.cf_sync', 'on', true);
  WHILE d <= horizon LOOP
    n := n + 1;
    EXIT WHEN r.max_occurrences IS NOT NULL AND n > r.max_occurrences;

    INSERT INTO public.cash_flow_entries (
      company_id, property_id, unit_id, project_id, agreement_id, tenancy_id, bank_account_id,
      document_id, rule_id, entry_date, expected_date, direction, state, category, description,
      currency, amount_total, amount_net, vat, source_type, source_id, occurrence_key,
      is_manual, confidence, scenario_code, counterparty_type, counterparty_name, notes)
    VALUES (
      r.company_id, r.property_id, r.unit_id, r.project_id, r.agreement_id, r.tenancy_id,
      r.bank_account_id, r.document_id, r.id, d, d, r.direction, r.state, r.category, r.name,
      r.currency, r.amount_total, r.amount_net, r.vat, 'cash_flow_recurring_rule', r.id, d::text,
      false, r.confidence, r.scenario_code, r.counterparty_type, r.counterparty_name, r.notes)
    ON CONFLICT (source_type, source_id, occurrence_key) DO NOTHING;

    IF FOUND THEN made := made + 1; END IF;
    d := (d + step)::date;
  END LOOP;
  PERFORM set_config('pedra.cf_sync', 'off', true);

  UPDATE public.cash_flow_recurring_rules
     SET last_generated_through = greatest(coalesce(last_generated_through, horizon), horizon)
   WHERE id = r.id;

  RETURN made;
END $$;

CREATE OR REPLACE FUNCTION public.generate_company_cash_flow(_company_id uuid, _through date)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t int := 0; x uuid;
BEGIN
  IF NOT public.can_record_company(_company_id) THEN
    RAISE EXCEPTION 'Not allowed to generate occurrences for this company';
  END IF;
  FOR x IN SELECT id FROM public.cash_flow_recurring_rules
            WHERE company_id = _company_id AND is_active AND deleted_at IS NULL LOOP
    t := t + public.generate_recurring_cash_flow(x, _through);
  END LOOP;
  RETURN t;
END $$;

-- ==================================================================== views
CREATE OR REPLACE VIEW public.v_cash_flow_entries
WITH (security_invoker = true) AS
SELECT e.*,
       p.code  AS property_code,
       p.name  AS property_name,
       p.status AS property_status,
       (p.id IS NOT NULL AND (p.deleted_at IS NOT NULL OR p.status IN ('archived','sold'))) AS property_inactive,
       u.name  AS unit_name,
       pr.name AS project_name,
       fa.lender AS lender,
       ba.name AS bank_account_name,
       (e.state IN ('actual','reconciled')) AS is_actual,
       CASE WHEN e.direction = 'inflow' THEN e.amount_total ELSE -e.amount_total END AS signed_amount
  FROM public.cash_flow_entries e
  LEFT JOIN public.properties p ON p.id = e.property_id
  LEFT JOIN public.property_units u ON u.id = e.unit_id
  LEFT JOIN public.capex_projects pr ON pr.id = e.project_id
  LEFT JOIN public.financing_agreements fa ON fa.id = e.agreement_id
  LEFT JOIN public.bank_accounts ba ON ba.id = e.bank_account_id
 WHERE e.deleted_at IS NULL;
GRANT SELECT ON public.v_cash_flow_entries TO authenticated;

-- monthly report with running liquidity
CREATE OR REPLACE FUNCTION public.cash_flow_monthly(
  _company_id uuid,
  _from date,
  _months int DEFAULT 12,
  _scenario text DEFAULT 'base',
  _property_id uuid DEFAULT NULL,
  _bank_account_id uuid DEFAULT NULL,
  _project_id uuid DEFAULT NULL,
  _category text DEFAULT NULL,
  _states text[] DEFAULT NULL,
  _include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  month date,
  opening_balance numeric,
  inflows numeric,
  outflows numeric,
  financing numeric,
  recurring numeric,
  projects numeric,
  taxes numeric,
  other_outflows numeric,
  net_movement numeric,
  closing_balance numeric,
  cumulative_liquidity numeric,
  actual_net numeric,
  forecast_net numeric,
  variance numeric
)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
WITH months AS (
  SELECT (date_trunc('month', _from)::date + make_interval(months => g))::date AS m
    FROM generate_series(0, greatest(_months, 1) - 1) g
),
filtered AS (
  SELECT e.*
    FROM public.v_cash_flow_entries e
   WHERE e.company_id = _company_id
     AND e.is_included
     AND (_include_inactive OR NOT e.property_inactive)
     AND (e.scenario_code IS NULL OR e.scenario_code = coalesce(_scenario, 'base'))
     AND (_property_id IS NULL OR e.property_id = _property_id)
     AND (_bank_account_id IS NULL OR e.bank_account_id = _bank_account_id)
     AND (_project_id IS NULL OR e.project_id = _project_id)
     AND (_category IS NULL OR e.category = _category)
     AND (_states IS NULL OR e.state = ANY(_states))
),
opening AS (
  SELECT coalesce((SELECT sum(b.opening_balance) FROM public.bank_accounts b
                    WHERE b.company_id = _company_id AND b.deleted_at IS NULL
                      AND (_bank_account_id IS NULL OR b.id = _bank_account_id)), 0)
       + coalesce((SELECT sum(f.signed_amount) FROM filtered f
                    WHERE f.entry_date < date_trunc('month', _from)::date), 0) AS bal
),
agg AS (
  SELECT m.m AS month,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'inflow'), 0) AS inflows,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'outflow'), 0) AS outflows,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'outflow' AND f.category = 'financing'), 0) AS financing,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'outflow' AND f.rule_id IS NOT NULL AND f.category <> 'financing'), 0) AS recurring,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'outflow' AND f.category IN ('capex','works','maintenance')), 0) AS projects,
         coalesce(sum(f.amount_total) FILTER (WHERE f.direction = 'outflow' AND f.category = 'tax'), 0) AS taxes,
         coalesce(sum(f.signed_amount), 0) AS net_movement,
         coalesce(sum(f.signed_amount) FILTER (WHERE f.is_actual), 0) AS actual_net,
         coalesce(sum(f.signed_amount) FILTER (WHERE NOT f.is_actual), 0) AS forecast_net
    FROM months m
    LEFT JOIN filtered f ON date_trunc('month', f.entry_date)::date = m.m
   GROUP BY m.m
)
SELECT a.month,
       (SELECT bal FROM opening) + coalesce(sum(a.net_movement) OVER w_prev, 0) AS opening_balance,
       a.inflows, a.outflows, a.financing, a.recurring, a.projects, a.taxes,
       a.outflows - a.financing - a.recurring - a.projects - a.taxes AS other_outflows,
       a.net_movement,
       (SELECT bal FROM opening) + sum(a.net_movement) OVER w_run AS closing_balance,
       (SELECT bal FROM opening) + sum(a.net_movement) OVER w_run AS cumulative_liquidity,
       a.actual_net, a.forecast_net,
       a.actual_net - a.forecast_net AS variance
  FROM agg a
WINDOW w_run AS (ORDER BY a.month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
       w_prev AS (ORDER BY a.month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
ORDER BY a.month;
$$;

REVOKE ALL ON FUNCTION public.cash_flow_monthly(uuid,date,int,text,uuid,uuid,uuid,text,text[],boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.cash_flow_monthly(uuid,date,int,text,uuid,uuid,uuid,text,text[],boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_recurring_cash_flow(uuid,date) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_recurring_cash_flow(uuid,date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_company_cash_flow(uuid,date) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_company_cash_flow(uuid,date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.seed_company_scenarios(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_company_scenarios(uuid) TO service_role;