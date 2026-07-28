-- ============================================================ counterparties
CREATE TABLE public.counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  legal_name text,
  trading_name text,
  counterparty_type text NOT NULL DEFAULT 'supplier'
    CHECK (counterparty_type IN ('supplier','client','both')),
  is_supplier boolean NOT NULL DEFAULT false,
  is_client boolean NOT NULL DEFAULT false,
  nif text,
  country_code char(2) NOT NULL DEFAULT 'PT',
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  email text,
  phone text,
  contact_name text,
  website text,
  payment_terms_days int,
  payment_method text,
  iban text,
  bic text,
  default_classification_id uuid,
  currency char(3) NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX counterparties_company_nif_uq
  ON public.counterparties (company_id, upper(nif)) WHERE nif IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX counterparties_company_code_uq
  ON public.counterparties (company_id, upper(code)) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX counterparties_company_idx ON public.counterparties (company_id, status, name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counterparties TO authenticated;
GRANT ALL ON public.counterparties TO service_role;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;
CREATE POLICY counterparties_select ON public.counterparties FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY counterparties_manage ON public.counterparties FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

CREATE OR REPLACE FUNCTION public.tg_counterparty_flags()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.is_supplier := NEW.counterparty_type IN ('supplier','both');
  NEW.is_client := NEW.counterparty_type IN ('client','both');
  IF NEW.nif IS NOT NULL THEN NEW.nif := upper(trim(NEW.nif)); END IF;
  IF NEW.deleted_at IS NOT NULL THEN NEW.status := 'archived'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER counterparties_flags BEFORE INSERT OR UPDATE ON public.counterparties
  FOR EACH ROW EXECUTE FUNCTION public.tg_counterparty_flags();
CREATE TRIGGER counterparties_touch BEFORE UPDATE ON public.counterparties
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER counterparties_audit AFTER INSERT OR UPDATE OR DELETE ON public.counterparties
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ==================================================== financial_classifications
CREATE TABLE public.financial_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.financial_classifications(id) ON DELETE RESTRICT,
  level int NOT NULL DEFAULT 1,
  code text NOT NULL,
  name_pt text,
  name_en text NOT NULL,
  nature text NOT NULL DEFAULT 'expense'
    CHECK (nature IN ('income','expense','asset','liability','equity','transfer')),
  default_vat_rate numeric(6,3),
  default_vat_code text,
  vat_recoverable boolean NOT NULL DEFAULT true,
  affects_cash_flow boolean NOT NULL DEFAULT true,
  affects_profit boolean NOT NULL DEFAULT true,
  counterparty_required boolean NOT NULL DEFAULT false,
  property_link_allowed boolean NOT NULL DEFAULT true,
  project_link_allowed boolean NOT NULL DEFAULT true,
  cash_flow_category text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX financial_classifications_company_code_uq
  ON public.financial_classifications (company_id, upper(code)) WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX financial_classifications_global_code_uq
  ON public.financial_classifications (upper(code)) WHERE company_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_classifications TO authenticated;
GRANT ALL ON public.financial_classifications TO service_role;
ALTER TABLE public.financial_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_classifications_select ON public.financial_classifications
  FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.can_view_company(company_id));
CREATE POLICY financial_classifications_manage ON public.financial_classifications
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.can_manage_company(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.can_manage_company(company_id));
CREATE TRIGGER financial_classifications_touch BEFORE UPDATE ON public.financial_classifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();

ALTER TABLE public.counterparties
  ADD CONSTRAINT counterparties_default_classification_fk
  FOREIGN KEY (default_classification_id)
  REFERENCES public.financial_classifications(id) ON DELETE SET NULL;

-- ======================================================== financial_periods
CREATE TABLE public.financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  period_type text NOT NULL DEFAULT 'quarter'
    CHECK (period_type IN ('month','quarter','year')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','filed')),
  closed_at timestamptz,
  closed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (company_id, code),
  CHECK (period_end >= period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_periods TO authenticated;
GRANT ALL ON public.financial_periods TO service_role;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_periods_select ON public.financial_periods FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY financial_periods_manage ON public.financial_periods FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER financial_periods_touch BEFORE UPDATE ON public.financial_periods
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER financial_periods_audit AFTER INSERT OR UPDATE OR DELETE ON public.financial_periods
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ======================================================= financial_documents
CREATE TABLE public.financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  counterparty_id uuid REFERENCES public.counterparties(id) ON DELETE RESTRICT,
  counterparty_name text,
  counterparty_nif text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  doc_type text NOT NULL DEFAULT 'invoice'
    CHECK (doc_type IN ('invoice','credit_note','debit_note','receipt','bill','simplified_invoice','other')),
  series text,
  document_number text,
  atcud text,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  tax_period text,
  period_id uuid REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','cancelled')),
  payment_state text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_state IN ('unpaid','partially_paid','paid','overpaid')),
  currency char(3) NOT NULL DEFAULT 'EUR',
  net_amount numeric(16,2) NOT NULL DEFAULT 0,
  vat_amount numeric(16,2) NOT NULL DEFAULT 0,
  gross_amount numeric(16,2) NOT NULL DEFAULT 0,
  withholding_rate numeric(6,3),
  withholding_amount numeric(16,2) NOT NULL DEFAULT 0,
  payable_amount numeric(16,2) NOT NULL DEFAULT 0,
  paid_amount numeric(16,2) NOT NULL DEFAULT 0,
  outstanding_amount numeric(16,2) NOT NULL DEFAULT 0,
  classification_id uuid REFERENCES public.financial_classifications(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  source_type text,
  source_id uuid,
  corrects_document_id uuid REFERENCES public.financial_documents(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  posted_at timestamptz,
  posted_by uuid,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX financial_documents_number_uq
  ON public.financial_documents
     (company_id, counterparty_id, doc_type, upper(coalesce(series,'')), upper(document_number))
  WHERE document_number IS NOT NULL AND deleted_at IS NULL AND status <> 'cancelled';
CREATE UNIQUE INDEX financial_documents_atcud_uq
  ON public.financial_documents (company_id, upper(atcud))
  WHERE atcud IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX financial_documents_source_uq
  ON public.financial_documents (company_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX financial_documents_company_idx
  ON public.financial_documents (company_id, issue_date DESC);
CREATE INDEX financial_documents_counterparty_idx
  ON public.financial_documents (counterparty_id, issue_date DESC);
CREATE INDEX financial_documents_property_idx ON public.financial_documents (property_id);
CREATE INDEX financial_documents_state_idx
  ON public.financial_documents (company_id, status, payment_state);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_documents TO authenticated;
GRANT ALL ON public.financial_documents TO service_role;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_documents_select ON public.financial_documents FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY financial_documents_manage ON public.financial_documents FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- ==================================================== financial_document_lines
CREATE TABLE public.financial_document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 1,
  description text,
  quantity numeric(16,4) NOT NULL DEFAULT 1,
  unit_price numeric(16,4) NOT NULL DEFAULT 0,
  discount_pct numeric(6,3) NOT NULL DEFAULT 0,
  net_amount numeric(16,2) NOT NULL DEFAULT 0,
  vat_rate numeric(6,3) NOT NULL DEFAULT 0,
  vat_code text,
  vat_amount numeric(16,2) NOT NULL DEFAULT 0,
  gross_amount numeric(16,2) NOT NULL DEFAULT 0,
  vat_recoverable boolean NOT NULL DEFAULT true,
  classification_id uuid REFERENCES public.financial_classifications(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (document_id, line_no)
);
CREATE INDEX financial_document_lines_doc_idx ON public.financial_document_lines (document_id, line_no);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_document_lines TO authenticated;
GRANT ALL ON public.financial_document_lines TO service_role;
ALTER TABLE public.financial_document_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_document_lines_select ON public.financial_document_lines
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
CREATE POLICY financial_document_lines_manage ON public.financial_document_lines
  FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

-- ========================================================= financial_payments
CREATE TABLE public.financial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric(16,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'EUR',
  method text,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  bank_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  entry_id uuid REFERENCES public.cash_flow_entries(id) ON DELETE SET NULL,
  match_id uuid REFERENCES public.bank_reconciliation_matches(id) ON DELETE SET NULL,
  source_type text,
  source_id uuid,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','reversed')),
  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CHECK (amount <> 0)
);
CREATE UNIQUE INDEX financial_payments_source_uq
  ON public.financial_payments (company_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
CREATE UNIQUE INDEX financial_payments_tx_uq
  ON public.financial_payments (document_id, bank_transaction_id)
  WHERE bank_transaction_id IS NOT NULL AND status = 'confirmed';
CREATE INDEX financial_payments_doc_idx ON public.financial_payments (document_id, payment_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_payments TO authenticated;
GRANT ALL ON public.financial_payments TO service_role;
ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_payments_select ON public.financial_payments FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY financial_payments_record ON public.financial_payments FOR INSERT TO authenticated
  WITH CHECK (public.can_record_company(company_id));
CREATE POLICY financial_payments_update ON public.financial_payments FOR UPDATE TO authenticated
  USING (public.can_record_company(company_id)) WITH CHECK (public.can_record_company(company_id));

CREATE OR REPLACE FUNCTION public.tg_no_delete_financial_payments()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Payments are reversed, never deleted'
    USING ERRCODE = 'check_violation';
END $$;
REVOKE ALL ON FUNCTION public.tg_no_delete_financial_payments() FROM public, anon, authenticated;
CREATE TRIGGER financial_payments_no_delete BEFORE DELETE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_no_delete_financial_payments();

-- ==================================================== financial_period_totals
CREATE TABLE public.financial_period_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.financial_periods(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  direction text CHECK (direction IN ('inbound','outbound')),
  vat_rate numeric(6,3),
  vat_code text,
  net_amount numeric(16,2) NOT NULL DEFAULT 0,
  vat_amount numeric(16,2) NOT NULL DEFAULT 0,
  gross_amount numeric(16,2) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX financial_period_totals_uq
  ON public.financial_period_totals
     (period_id, bucket, coalesce(direction,''), coalesce(vat_rate, -1), coalesce(vat_code,''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_period_totals TO authenticated;
GRANT ALL ON public.financial_period_totals TO service_role;
ALTER TABLE public.financial_period_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_period_totals_select ON public.financial_period_totals
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
CREATE POLICY financial_period_totals_manage ON public.financial_period_totals
  FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER financial_period_totals_touch BEFORE UPDATE ON public.financial_period_totals
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();

-- =================================================== bank_classification_rules
CREATE TABLE public.bank_classification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  match_field text NOT NULL DEFAULT 'description'
    CHECK (match_field IN ('description','counterparty_name','counterparty_account','bank_reference')),
  match_type text NOT NULL DEFAULT 'contains'
    CHECK (match_type IN ('contains','equals','starts_with','regex')),
  match_value text NOT NULL,
  direction text CHECK (direction IN ('inflow','outflow')),
  min_amount numeric(16,2),
  max_amount numeric(16,2),
  classification_id uuid REFERENCES public.financial_classifications(id) ON DELETE SET NULL,
  counterparty_id uuid REFERENCES public.counterparties(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.capex_projects(id) ON DELETE SET NULL,
  cash_flow_category text,
  is_internal_transfer boolean NOT NULL DEFAULT false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX bank_classification_rules_company_idx
  ON public.bank_classification_rules (company_id, is_active, priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_classification_rules TO authenticated;
GRANT ALL ON public.bank_classification_rules TO service_role;
ALTER TABLE public.bank_classification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_classification_rules_select ON public.bank_classification_rules
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
CREATE POLICY bank_classification_rules_manage ON public.bank_classification_rules
  FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
CREATE TRIGGER bank_classification_rules_touch BEFORE UPDATE ON public.bank_classification_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER bank_classification_rules_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_classification_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ================================================================== line math
CREATE OR REPLACE FUNCTION public.tg_financial_line_math()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE d public.financial_documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.financial_documents WHERE id = NEW.document_id;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Unknown document' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF d.company_id <> NEW.company_id THEN
    RAISE EXCEPTION 'Line company must match its document' USING ERRCODE = 'check_violation';
  END IF;
  NEW.net_amount := round(NEW.quantity * NEW.unit_price * (1 - NEW.discount_pct / 100.0), 2);
  NEW.vat_amount := round(NEW.net_amount * NEW.vat_rate / 100.0, 2);
  NEW.gross_amount := NEW.net_amount + NEW.vat_amount;
  RETURN NEW;
END $$;
CREATE TRIGGER financial_document_lines_math
  BEFORE INSERT OR UPDATE ON public.financial_document_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_financial_line_math();

CREATE OR REPLACE FUNCTION public.recompute_document_totals(_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n numeric(16,2); v numeric(16,2); w numeric(16,2); d public.financial_documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.financial_documents WHERE id = _document_id;
  IF d.id IS NULL THEN RETURN; END IF;
  SELECT coalesce(sum(net_amount), 0), coalesce(sum(vat_amount), 0)
    INTO n, v FROM public.financial_document_lines WHERE document_id = _document_id;
  IF NOT EXISTS (SELECT 1 FROM public.financial_document_lines WHERE document_id = _document_id) THEN
    n := d.net_amount; v := d.vat_amount;
  END IF;
  w := round(n * coalesce(d.withholding_rate, 0) / 100.0, 2);
  PERFORM set_config('pedra.fd_sync', 'on', true);
  UPDATE public.financial_documents SET
    net_amount = n,
    vat_amount = v,
    gross_amount = n + v,
    withholding_amount = w,
    payable_amount = n + v - w
  WHERE id = _document_id;
  PERFORM set_config('pedra.fd_sync', 'off', true);
  PERFORM public.recompute_document_payment_state(_document_id);
END $$;
REVOKE ALL ON FUNCTION public.recompute_document_totals(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.tg_financial_line_rollup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_document_totals(coalesce(NEW.document_id, OLD.document_id));
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.tg_financial_line_rollup() FROM public, anon, authenticated;
CREATE TRIGGER financial_document_lines_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_document_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_financial_line_rollup();

-- ============================================================= payment state
CREATE OR REPLACE FUNCTION public.recompute_document_payment_state(_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.financial_documents%ROWTYPE; p numeric(16,2); st text;
BEGIN
  SELECT * INTO d FROM public.financial_documents WHERE id = _document_id;
  IF d.id IS NULL THEN RETURN; END IF;
  SELECT coalesce(sum(amount), 0) INTO p FROM public.financial_payments
    WHERE document_id = _document_id AND status = 'confirmed';
  st := CASE
    WHEN p = 0 THEN 'unpaid'
    WHEN p > d.payable_amount + 0.005 THEN 'overpaid'
    WHEN p + 0.005 >= d.payable_amount THEN 'paid'
    ELSE 'partially_paid' END;
  PERFORM set_config('pedra.fd_sync', 'on', true);
  UPDATE public.financial_documents
    SET paid_amount = p,
        outstanding_amount = greatest(d.payable_amount - p, 0),
        payment_state = st
  WHERE id = _document_id;
  PERFORM set_config('pedra.fd_sync', 'off', true);
  PERFORM public.sync_document_cash_flow(_document_id);
END $$;
REVOKE ALL ON FUNCTION public.recompute_document_payment_state(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.tg_financial_payment_rollup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_document_payment_state(coalesce(NEW.document_id, OLD.document_id));
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.tg_financial_payment_rollup() FROM public, anon, authenticated;
CREATE TRIGGER financial_payments_rollup
  AFTER INSERT OR UPDATE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_financial_payment_rollup();
CREATE TRIGGER financial_payments_touch BEFORE UPDATE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER financial_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- ================================================= document guard + lifecycle
CREATE OR REPLACE FUNCTION public.tg_guard_financial_document()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE syncing boolean := coalesce(current_setting('pedra.fd_sync', true), '') = 'on';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Posted or cancelled documents are archived, never deleted'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL THEN NEW.status := 'cancelled'; END IF;
    RETURN NEW;
  END IF;

  IF syncing THEN RETURN NEW; END IF;

  IF OLD.status IN ('posted','cancelled') THEN
    IF NEW.net_amount IS DISTINCT FROM OLD.net_amount
       OR NEW.vat_amount IS DISTINCT FROM OLD.vat_amount
       OR NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
       OR NEW.withholding_amount IS DISTINCT FROM OLD.withholding_amount
       OR NEW.payable_amount IS DISTINCT FROM OLD.payable_amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.direction IS DISTINCT FROM OLD.direction
       OR NEW.doc_type IS DISTINCT FROM OLD.doc_type
       OR NEW.document_number IS DISTINCT FROM OLD.document_number
       OR NEW.series IS DISTINCT FROM OLD.series
       OR NEW.atcud IS DISTINCT FROM OLD.atcud
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.counterparty_id IS DISTINCT FROM OLD.counterparty_id THEN
      RAISE EXCEPTION 'Confirmed document amounts and fiscal identifiers are immutable; issue a correction instead'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled documents cannot be reopened' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'posted' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'Posted documents cannot return to draft' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    IF coalesce(NEW.cancellation_reason, '') = '' THEN
      RAISE EXCEPTION 'A cancellation reason is required' USING ERRCODE = 'check_violation';
    END IF;
    NEW.cancelled_at := now();
    NEW.cancelled_by := auth.uid();
  END IF;
  IF NEW.status = 'posted' AND OLD.status <> 'posted' THEN
    NEW.posted_at := now();
    NEW.posted_by := auth.uid();
  END IF;
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.status = 'draft' THEN
    NEW.status := 'cancelled';
    NEW.cancellation_reason := coalesce(NEW.cancellation_reason, 'archived');
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_guard_financial_document() FROM public, anon, authenticated;
CREATE TRIGGER financial_documents_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_financial_document();
CREATE TRIGGER financial_documents_touch BEFORE UPDATE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();
CREATE TRIGGER financial_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

CREATE OR REPLACE FUNCTION public.tg_guard_financial_line()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE st text;
BEGIN
  SELECT status INTO st FROM public.financial_documents
    WHERE id = coalesce(NEW.document_id, OLD.document_id);
  IF st IS NOT NULL AND st <> 'draft' THEN
    RAISE EXCEPTION 'Lines of a posted or cancelled document cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_guard_financial_line() FROM public, anon, authenticated;
CREATE TRIGGER financial_document_lines_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.financial_document_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_financial_line();
CREATE TRIGGER financial_document_lines_touch BEFORE UPDATE ON public.financial_document_lines
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row();

-- ============================================== cash flow linkage (no duplication)
CREATE OR REPLACE FUNCTION public.sync_document_cash_flow(_document_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.financial_documents%ROWTYPE; cat text; dir text; eid uuid;
BEGIN
  SELECT * INTO d FROM public.financial_documents WHERE id = _document_id;
  IF d.id IS NULL THEN RETURN NULL; END IF;

  IF d.status <> 'posted' OR d.deleted_at IS NOT NULL THEN
    PERFORM set_config('pedra.cf_sync', 'on', true);
    DELETE FROM public.cash_flow_entries
      WHERE source_type = 'financial_document' AND source_id = _document_id;
    PERFORM set_config('pedra.cf_sync', 'off', true);
    RETURN NULL;
  END IF;

  dir := CASE WHEN d.direction = 'outbound' THEN 'inflow' ELSE 'outflow' END;
  SELECT coalesce(c.cash_flow_category, c.code) INTO cat
    FROM public.financial_classifications c WHERE c.id = d.classification_id;
  cat := coalesce(cat, CASE WHEN dir = 'inflow' THEN 'other_income' ELSE 'other_expense' END);

  PERFORM set_config('pedra.cf_sync', 'on', true);
  INSERT INTO public.cash_flow_entries (
    company_id, property_id, unit_id, project_id, bank_account_id, document_id,
    entry_date, expected_date, actual_date, direction, state, category, description,
    currency, amount_total, amount_net, vat, forecast_amount, actual_amount, matched_amount,
    source_type, source_id, occurrence_key, is_manual, confidence,
    counterparty_type, counterparty_name, reconciliation_state
  ) VALUES (
    d.company_id, d.property_id, d.unit_id, d.project_id, d.bank_account_id, d.document_id,
    coalesce(d.due_date, d.issue_date), coalesce(d.due_date, d.issue_date),
    CASE WHEN d.paid_amount > 0 THEN d.issue_date END,
    dir,
    CASE WHEN d.payment_state IN ('paid','overpaid') THEN 'reconciled'
         WHEN d.paid_amount > 0 THEN 'actual' ELSE 'committed' END,
    cat,
    coalesce(nullif(concat_ws(' ', d.doc_type, d.series, d.document_number), ''), 'Financial document'),
    d.currency, d.payable_amount, d.net_amount, d.vat_amount,
    d.payable_amount,
    nullif(d.paid_amount, 0), d.paid_amount,
    'financial_document', d.id, '', false, 'confirmed',
    CASE WHEN d.direction = 'inbound' THEN 'supplier' ELSE 'client' END,
    d.counterparty_name,
    CASE WHEN d.payment_state IN ('paid','overpaid') THEN 'reconciled'
         WHEN d.paid_amount > 0 THEN 'partially_matched' ELSE 'unmatched' END
  )
  ON CONFLICT (source_type, source_id, occurrence_key) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    property_id = EXCLUDED.property_id,
    unit_id = EXCLUDED.unit_id,
    project_id = EXCLUDED.project_id,
    bank_account_id = EXCLUDED.bank_account_id,
    entry_date = EXCLUDED.entry_date,
    expected_date = EXCLUDED.expected_date,
    actual_date = EXCLUDED.actual_date,
    direction = EXCLUDED.direction,
    state = EXCLUDED.state,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    currency = EXCLUDED.currency,
    amount_total = EXCLUDED.amount_total,
    amount_net = EXCLUDED.amount_net,
    vat = EXCLUDED.vat,
    forecast_amount = EXCLUDED.forecast_amount,
    actual_amount = EXCLUDED.actual_amount,
    matched_amount = EXCLUDED.matched_amount,
    counterparty_name = EXCLUDED.counterparty_name,
    reconciliation_state = EXCLUDED.reconciliation_state,
    updated_at = now()
  RETURNING id INTO eid;
  PERFORM set_config('pedra.cf_sync', 'off', true);
  RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.sync_document_cash_flow(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.tg_financial_document_cash_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.sync_document_cash_flow(NEW.id);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.tg_financial_document_cash_flow() FROM public, anon, authenticated;
CREATE TRIGGER financial_documents_cash_flow
  AFTER INSERT OR UPDATE OF status, payment_state, payable_amount, due_date, classification_id,
    property_id, unit_id, project_id, bank_account_id, deleted_at
  ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_financial_document_cash_flow();

-- ================================================ settle a document from banking
CREATE OR REPLACE FUNCTION public.settle_financial_document(
  _document_id uuid,
  _amount numeric,
  _payment_date date DEFAULT current_date,
  _bank_transaction_id uuid DEFAULT NULL,
  _method text DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.financial_documents%ROWTYPE; pid uuid;
BEGIN
  SELECT * INTO d FROM public.financial_documents WHERE id = _document_id;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Unknown document'; END IF;
  IF NOT public.can_record_company(d.company_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF d.status <> 'posted' THEN
    RAISE EXCEPTION 'Only posted documents can be settled' USING ERRCODE = 'check_violation';
  END IF;

  IF _bank_transaction_id IS NOT NULL THEN
    SELECT id INTO pid FROM public.financial_payments
      WHERE document_id = _document_id AND bank_transaction_id = _bank_transaction_id
        AND status = 'confirmed';
    IF pid IS NOT NULL THEN
      UPDATE public.financial_payments
        SET amount = _amount, payment_date = _payment_date, notes = coalesce(_notes, notes)
        WHERE id = pid;
      RETURN pid;
    END IF;
  END IF;

  INSERT INTO public.financial_payments (
    company_id, document_id, payment_date, amount, currency, method,
    bank_account_id, bank_transaction_id, notes, created_by
  ) VALUES (
    d.company_id, d.id, _payment_date, _amount, d.currency, _method,
    d.bank_account_id, _bank_transaction_id, _notes, auth.uid()
  ) RETURNING id INTO pid;
  RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.settle_financial_document(uuid,numeric,date,uuid,text,text) FROM anon;

CREATE OR REPLACE FUNCTION public.reverse_financial_payment(_payment_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.financial_payments%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.financial_payments WHERE id = _payment_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Unknown payment'; END IF;
  IF NOT public.can_record_company(p.company_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(_reason, '') = '' THEN
    RAISE EXCEPTION 'A reversal reason is required' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.financial_payments
    SET status = 'reversed', reversed_at = now(), reversed_by = auth.uid(), reversal_reason = _reason
  WHERE id = _payment_id AND status = 'confirmed';
  RETURN _payment_id;
END $$;
REVOKE ALL ON FUNCTION public.reverse_financial_payment(uuid,text) FROM anon;

-- ============================================================ rule suggestion
CREATE OR REPLACE FUNCTION public.suggest_bank_classification(_bank_transaction_id uuid)
RETURNS TABLE (
  rule_id uuid, rule_name text, priority int, classification_id uuid,
  counterparty_id uuid, property_id uuid, project_id uuid,
  cash_flow_category text, is_internal_transfer boolean
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.bank_transactions%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = _bank_transaction_id;
  IF t.id IS NULL OR NOT public.can_view_company(t.company_id) THEN RETURN; END IF;

  RETURN QUERY
  SELECT r.id, r.name, r.priority, r.classification_id, r.counterparty_id,
         r.property_id, r.project_id, r.cash_flow_category, r.is_internal_transfer
  FROM public.bank_classification_rules r
  WHERE r.company_id = t.company_id
    AND r.is_active
    AND r.deleted_at IS NULL
    AND (r.bank_account_id IS NULL OR r.bank_account_id = t.bank_account_id)
    AND (r.direction IS NULL
         OR (r.direction = 'inflow' AND t.amount > 0)
         OR (r.direction = 'outflow' AND t.amount < 0))
    AND (r.min_amount IS NULL OR abs(t.amount) >= r.min_amount)
    AND (r.max_amount IS NULL OR abs(t.amount) <= r.max_amount)
    AND CASE r.match_type
      WHEN 'contains' THEN coalesce(
        CASE r.match_field
          WHEN 'description' THEN t.description
          WHEN 'counterparty_name' THEN t.counterparty_name
          WHEN 'counterparty_account' THEN t.counterparty_account
          ELSE t.bank_reference END, '') ILIKE '%' || r.match_value || '%'
      WHEN 'equals' THEN upper(coalesce(
        CASE r.match_field
          WHEN 'description' THEN t.description
          WHEN 'counterparty_name' THEN t.counterparty_name
          WHEN 'counterparty_account' THEN t.counterparty_account
          ELSE t.bank_reference END, '')) = upper(r.match_value)
      WHEN 'starts_with' THEN coalesce(
        CASE r.match_field
          WHEN 'description' THEN t.description
          WHEN 'counterparty_name' THEN t.counterparty_name
          WHEN 'counterparty_account' THEN t.counterparty_account
          ELSE t.bank_reference END, '') ILIKE r.match_value || '%'
      ELSE coalesce(
        CASE r.match_field
          WHEN 'description' THEN t.description
          WHEN 'counterparty_name' THEN t.counterparty_name
          WHEN 'counterparty_account' THEN t.counterparty_account
          ELSE t.bank_reference END, '') ~* r.match_value
    END
  ORDER BY r.priority ASC, r.created_at ASC;
END $$;
REVOKE ALL ON FUNCTION public.suggest_bank_classification(uuid) FROM anon;

-- ============================================================ period totals
CREATE OR REPLACE FUNCTION public.recompute_period_totals(_period_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.financial_periods%ROWTYPE; n int;
BEGIN
  SELECT * INTO p FROM public.financial_periods WHERE id = _period_id;
  IF p.id IS NULL THEN RETURN 0; END IF;
  IF NOT public.can_view_company(p.company_id) THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.financial_period_totals WHERE period_id = _period_id;

  INSERT INTO public.financial_period_totals (
    company_id, period_id, bucket, direction, vat_rate, vat_code,
    net_amount, vat_amount, gross_amount
  )
  SELECT p.company_id, p.id, 'vat', d.direction, l.vat_rate, l.vat_code,
         sum(l.net_amount), sum(l.vat_amount), sum(l.gross_amount)
  FROM public.financial_documents d
  JOIN public.financial_document_lines l ON l.document_id = d.id
  WHERE d.company_id = p.company_id
    AND d.status = 'posted'
    AND d.deleted_at IS NULL
    AND d.issue_date BETWEEN p.period_start AND p.period_end
  GROUP BY d.direction, l.vat_rate, l.vat_code;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.recompute_period_totals(uuid) FROM anon;