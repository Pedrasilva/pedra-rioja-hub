-- ============================================================ bank accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_identifier text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

ALTER TABLE public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_status_chk;
ALTER TABLE public.bank_accounts ADD CONSTRAINT bank_accounts_status_chk
  CHECK (status IN ('active','archived'));

CREATE OR REPLACE FUNCTION public.tg_bank_account_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_active IS DISTINCT FROM OLD.is_active
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'archived' END;
  END IF;
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bank_accounts_status ON public.bank_accounts;
CREATE TRIGGER bank_accounts_status BEFORE INSERT OR UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_bank_account_status();

CREATE TABLE IF NOT EXISTS public.bank_account_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (bank_account_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_documents TO authenticated;
GRANT ALL ON public.bank_account_documents TO service_role;
ALTER TABLE public.bank_account_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_account_documents_select ON public.bank_account_documents;
CREATE POLICY bank_account_documents_select ON public.bank_account_documents
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_account_documents_manage ON public.bank_account_documents;
CREATE POLICY bank_account_documents_manage ON public.bank_account_documents
  FOR ALL TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- ======================================================= statement batches
CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'csv' CHECK (source IN ('csv','xlsx','manual')),
  file_name text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  content_hash text,
  period_start date,
  period_end date,
  statement_opening_balance numeric,
  statement_closing_balance numeric,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','committed','discarded','reconciled')),
  row_count int NOT NULL DEFAULT 0,
  duplicate_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  imported_count int NOT NULL DEFAULT 0,
  committed_at timestamptz,
  committed_by uuid,
  reconciled_at timestamptz,
  reconciled_by uuid,
  balance_override_reason text,
  balance_override_by uuid,
  balance_override_at timestamptz,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX IF NOT EXISTS bank_statement_imports_account_idx
  ON public.bank_statement_imports (bank_account_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_imports TO authenticated;
GRANT ALL ON public.bank_statement_imports TO service_role;
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_statement_imports_select ON public.bank_statement_imports;
CREATE POLICY bank_statement_imports_select ON public.bank_statement_imports
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_statement_imports_manage ON public.bank_statement_imports;
CREATE POLICY bank_statement_imports_manage ON public.bank_statement_imports
  FOR ALL TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- ========================================================= bank transactions
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.bank_statement_imports(id) ON DELETE SET NULL,
  transaction_date date NOT NULL,
  value_date date,
  description text,
  bank_reference text,
  counterparty_name text,
  counterparty_account text,
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  running_balance numeric,
  source_row_id text,
  fingerprint text NOT NULL,
  reconciliation_status text NOT NULL DEFAULT 'unmatched'
    CHECK (reconciliation_status IN ('unmatched','partially_matched','reconciled','ignored','transfer')),
  matched_amount numeric NOT NULL DEFAULT 0,
  is_internal_transfer boolean NOT NULL DEFAULT false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_fingerprint_uq
  ON public.bank_transactions (bank_account_id, fingerprint);
CREATE INDEX IF NOT EXISTS bank_transactions_account_date_idx
  ON public.bank_transactions (bank_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS bank_transactions_status_idx
  ON public.bank_transactions (company_id, reconciliation_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_transactions_select ON public.bank_transactions;
CREATE POLICY bank_transactions_select ON public.bank_transactions
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_transactions_manage ON public.bank_transactions;
CREATE POLICY bank_transactions_manage ON public.bank_transactions
  FOR ALL TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- =================================================== statement staging rows
CREATE TABLE IF NOT EXISTS public.bank_statement_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  transaction_date date NOT NULL,
  value_date date,
  description text,
  bank_reference text,
  counterparty_name text,
  counterparty_account text,
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  running_balance numeric,
  source_row_id text,
  fingerprint text NOT NULL,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  include boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (import_id, line_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_import_rows TO authenticated;
GRANT ALL ON public.bank_statement_import_rows TO service_role;
ALTER TABLE public.bank_statement_import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_statement_import_rows_select ON public.bank_statement_import_rows;
CREATE POLICY bank_statement_import_rows_select ON public.bank_statement_import_rows
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_statement_import_rows_manage ON public.bank_statement_import_rows;
CREATE POLICY bank_statement_import_rows_manage ON public.bank_statement_import_rows
  FOR ALL TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- ====================================================== reconciliation matches
CREATE TABLE IF NOT EXISTS public.bank_reconciliation_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES public.cash_flow_entries(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL,
  forecast_amount numeric,
  variance_amount numeric NOT NULL DEFAULT 0,
  variance_reason text,
  match_type text NOT NULL DEFAULT 'manual'
    CHECK (match_type IN ('manual','suggested','partial','allocation','fee','conversion')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','reversed')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid,
  reversed_at timestamptz,
  reversed_by uuid,
  reversal_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_matches_active_uq
  ON public.bank_reconciliation_matches (bank_transaction_id, entry_id)
  WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS bank_matches_entry_idx
  ON public.bank_reconciliation_matches (entry_id, status);
GRANT SELECT, INSERT, UPDATE ON public.bank_reconciliation_matches TO authenticated;
GRANT ALL ON public.bank_reconciliation_matches TO service_role;
ALTER TABLE public.bank_reconciliation_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_matches_select ON public.bank_reconciliation_matches;
CREATE POLICY bank_matches_select ON public.bank_reconciliation_matches
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_matches_insert ON public.bank_reconciliation_matches;
CREATE POLICY bank_matches_insert ON public.bank_reconciliation_matches
  FOR INSERT TO authenticated WITH CHECK (public.can_record_company(company_id));
DROP POLICY IF EXISTS bank_matches_update ON public.bank_reconciliation_matches;
CREATE POLICY bank_matches_update ON public.bank_reconciliation_matches
  FOR UPDATE TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- Audit records are never deleted.
CREATE OR REPLACE FUNCTION public.tg_no_delete_matches()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  RAISE EXCEPTION 'Reconciliation records are reversed, never deleted'
    USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS bank_matches_no_delete ON public.bank_reconciliation_matches;
CREATE TRIGGER bank_matches_no_delete BEFORE DELETE ON public.bank_reconciliation_matches
FOR EACH ROW WHEN (pg_trigger_depth() = 0) EXECUTE FUNCTION public.tg_no_delete_matches();

-- ========================================================= internal transfers
CREATE TABLE IF NOT EXISTS public.bank_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_transaction_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  to_transaction_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transfer_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (from_transaction_id, to_transaction_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transfers TO authenticated;
GRANT ALL ON public.bank_transfers TO service_role;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_transfers_select ON public.bank_transfers;
CREATE POLICY bank_transfers_select ON public.bank_transfers
  FOR SELECT TO authenticated USING (public.can_view_company(company_id));
DROP POLICY IF EXISTS bank_transfers_manage ON public.bank_transfers;
CREATE POLICY bank_transfers_manage ON public.bank_transfers
  FOR ALL TO authenticated USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

-- ============================================ expected items: actual vs forecast
ALTER TABLE public.cash_flow_entries
  ADD COLUMN IF NOT EXISTS forecast_amount numeric,
  ADD COLUMN IF NOT EXISTS actual_amount numeric,
  ADD COLUMN IF NOT EXISTS matched_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance_amount numeric;

ALTER TABLE public.cash_flow_entries DROP CONSTRAINT IF EXISTS cash_flow_entries_recon_chk;
ALTER TABLE public.cash_flow_entries ADD CONSTRAINT cash_flow_entries_recon_chk
  CHECK (reconciliation_state IN ('unmatched','matched','partially_matched','reconciled','ignored'));

-- =============================================== touch + audit on new tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_account_documents','bank_statement_imports',
                           'bank_statement_import_rows','bank_transactions',
                           'bank_reconciliation_matches','bank_transfers'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_touch_row()', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I_audit ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row()', t, t);
  END LOOP;
END $$;

-- ================================================================= routines
CREATE OR REPLACE FUNCTION public.commit_bank_statement_import(_import_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i public.bank_statement_imports%ROWTYPE; n int := 0; dup int := 0;
BEGIN
  SELECT * INTO i FROM public.bank_statement_imports WHERE id = _import_id FOR UPDATE;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Statement batch not found'; END IF;
  IF NOT public.can_record_company(i.company_id) THEN
    RAISE EXCEPTION 'Not allowed to import statements for this company';
  END IF;
  IF i.status <> 'draft' THEN RAISE EXCEPTION 'This batch is already %', i.status; END IF;
  IF EXISTS (SELECT 1 FROM public.bank_statement_import_rows r
              WHERE r.import_id = _import_id AND r.include
                AND jsonb_array_length(r.issues) > 0) THEN
    RAISE EXCEPTION 'Some included rows still have validation issues';
  END IF;

  WITH ins AS (
    INSERT INTO public.bank_transactions (
      company_id, bank_account_id, import_id, transaction_date, value_date, description,
      bank_reference, counterparty_name, counterparty_account, debit_amount, credit_amount,
      amount, running_balance, source_row_id, fingerprint)
    SELECT i.company_id, i.bank_account_id, i.id, r.transaction_date, r.value_date, r.description,
           r.bank_reference, r.counterparty_name, r.counterparty_account, r.debit_amount,
           r.credit_amount, r.amount, r.running_balance, r.source_row_id, r.fingerprint
      FROM public.bank_statement_import_rows r
     WHERE r.import_id = _import_id AND r.include
     ORDER BY r.line_no
    ON CONFLICT (bank_account_id, fingerprint) DO NOTHING
    RETURNING 1)
  SELECT count(*) INTO n FROM ins;

  SELECT count(*) INTO dup FROM public.bank_statement_import_rows
   WHERE import_id = _import_id AND is_duplicate;

  UPDATE public.bank_statement_imports
     SET status = 'committed', committed_at = now(), committed_by = auth.uid(),
         imported_count = n, duplicate_count = dup
   WHERE id = _import_id;

  RETURN jsonb_build_object('imported', n, 'duplicates', dup);
END $$;

CREATE OR REPLACE FUNCTION public.recompute_entry_reconciliation(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e public.cash_flow_entries%ROWTYPE; m numeric; d date; base numeric;
BEGIN
  SELECT * INTO e FROM public.cash_flow_entries WHERE id = _entry_id;
  IF e.id IS NULL THEN RETURN; END IF;

  SELECT coalesce(sum(k.allocated_amount), 0), max(t.transaction_date)
    INTO m, d
    FROM public.bank_reconciliation_matches k
    JOIN public.bank_transactions t ON t.id = k.bank_transaction_id
   WHERE k.entry_id = _entry_id AND k.status = 'confirmed';

  base := coalesce(e.forecast_amount, e.amount_total);

  PERFORM set_config('pedra.cf_sync', 'on', true);
  UPDATE public.cash_flow_entries SET
    forecast_amount = CASE WHEN m > 0 THEN base ELSE e.forecast_amount END,
    matched_amount = m,
    actual_amount = CASE WHEN m > 0 THEN m ELSE NULL END,
    variance_amount = CASE WHEN m > 0 THEN m - base ELSE NULL END,
    actual_date = CASE WHEN m > 0 THEN d ELSE NULL END,
    state = CASE WHEN m = 0 THEN 'committed'
                 WHEN m + 0.01 >= base THEN 'reconciled' ELSE 'actual' END,
    reconciliation_state = CASE WHEN m = 0 THEN 'unmatched'
                 WHEN m + 0.01 >= base THEN 'reconciled' ELSE 'partially_matched' END
  WHERE id = _entry_id;
  PERFORM set_config('pedra.cf_sync', 'off', true);
END $$;

CREATE OR REPLACE FUNCTION public.sync_source_settlement(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE e public.cash_flow_entries%ROWTYPE;
BEGIN
  SELECT * INTO e FROM public.cash_flow_entries WHERE id = _entry_id;
  IF e.id IS NULL OR e.source_id IS NULL THEN RETURN; END IF;

  IF e.source_type = 'financing_schedule_row' THEN
    UPDATE public.financing_schedule_rows SET
      status = CASE WHEN e.reconciliation_state = 'reconciled' THEN 'reconciled'
                    WHEN coalesce(e.matched_amount, 0) > 0 THEN 'settled'
                    ELSE 'due' END,
      settled_amount = nullif(e.matched_amount, 0),
      settled_on = CASE WHEN coalesce(e.matched_amount, 0) > 0 THEN e.actual_date END,
      settled_source_type = CASE WHEN coalesce(e.matched_amount, 0) > 0 THEN 'bank_transaction' END,
      reconciled_at = CASE WHEN e.reconciliation_state = 'reconciled' THEN now() END
    WHERE id = e.source_id
      AND status <> 'superseded';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_transaction_reconciliation(_tx_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.bank_transactions%ROWTYPE; m numeric;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = _tx_id;
  IF t.id IS NULL THEN RETURN; END IF;
  SELECT coalesce(sum(allocated_amount), 0) INTO m
    FROM public.bank_reconciliation_matches
   WHERE bank_transaction_id = _tx_id AND status = 'confirmed';

  UPDATE public.bank_transactions SET
    matched_amount = m,
    reconciliation_status = CASE
      WHEN t.is_internal_transfer THEN 'transfer'
      WHEN m = 0 THEN 'unmatched'
      WHEN m + 0.01 >= abs(t.amount) THEN 'reconciled'
      ELSE 'partially_matched' END
  WHERE id = _tx_id;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_bank_match(
  _bank_transaction_id uuid, _allocations jsonb, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  t public.bank_transactions%ROWTYPE;
  e public.cash_flow_entries%ROWTYPE;
  a jsonb; amt numeric; total numeric := 0; ids uuid[] := '{}'; k uuid;
BEGIN
  SELECT * INTO t FROM public.bank_transactions
   WHERE id = _bank_transaction_id AND deleted_at IS NULL FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Bank transaction not found'; END IF;
  IF NOT public.can_record_company(t.company_id) THEN
    RAISE EXCEPTION 'Not allowed to reconcile in this company';
  END IF;
  IF t.is_internal_transfer THEN
    RAISE EXCEPTION 'An internal transfer cannot be matched to portfolio income or expenditure'
      USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(jsonb_array_length(_allocations), 0) = 0 THEN
    RAISE EXCEPTION 'At least one allocation is required';
  END IF;

  FOR a IN SELECT * FROM jsonb_array_elements(_allocations) LOOP
    SELECT * INTO e FROM public.cash_flow_entries
     WHERE id = (a ->> 'entry_id')::uuid AND deleted_at IS NULL;
    IF e.id IS NULL THEN RAISE EXCEPTION 'Expected item not found'; END IF;
    IF e.company_id <> t.company_id THEN
      RAISE EXCEPTION 'Expected item belongs to another company' USING ERRCODE = 'check_violation';
    END IF;
    amt := round(coalesce((a ->> 'amount')::numeric, abs(t.amount)), 2);
    IF amt <= 0 THEN RAISE EXCEPTION 'Allocated amounts must be positive'; END IF;

    INSERT INTO public.bank_reconciliation_matches (
      company_id, bank_account_id, bank_transaction_id, entry_id, allocated_amount,
      forecast_amount, variance_amount, variance_reason, match_type, status,
      confirmed_at, confirmed_by, notes)
    VALUES (t.company_id, t.bank_account_id, t.id, e.id, amt,
      coalesce(e.forecast_amount, e.amount_total),
      amt - coalesce(e.forecast_amount, e.amount_total),
      a ->> 'variance_reason', coalesce(a ->> 'match_type', 'manual'), 'confirmed',
      now(), auth.uid(), _notes)
    ON CONFLICT (bank_transaction_id, entry_id) WHERE status = 'confirmed'
    DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount,
                  variance_amount = EXCLUDED.variance_amount,
                  variance_reason = EXCLUDED.variance_reason,
                  updated_at = now();

    ids := ids || e.id;
  END LOOP;

  SELECT coalesce(sum(allocated_amount), 0) INTO total
    FROM public.bank_reconciliation_matches
   WHERE bank_transaction_id = t.id AND status = 'confirmed';
  IF total > abs(t.amount) + 0.01 THEN
    RAISE EXCEPTION 'Allocations (%) exceed the bank transaction amount (%)', total, abs(t.amount)
      USING ERRCODE = 'check_violation';
  END IF;

  FOREACH k IN ARRAY ids LOOP
    PERFORM public.recompute_entry_reconciliation(k);
    PERFORM public.sync_source_settlement(k);
  END LOOP;
  PERFORM public.recompute_transaction_reconciliation(t.id);

  RETURN jsonb_build_object('allocated', total, 'entries', array_length(ids, 1));
END $$;

CREATE OR REPLACE FUNCTION public.reverse_bank_match(_match_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.bank_reconciliation_matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.bank_reconciliation_matches WHERE id = _match_id FOR UPDATE;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT public.can_manage_company(m.company_id) THEN
    RAISE EXCEPTION 'Only owners and managers can reverse a confirmed match';
  END IF;
  IF m.status <> 'confirmed' THEN RAISE EXCEPTION 'This match is already reversed'; END IF;
  IF coalesce(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required to unreconcile'; END IF;

  UPDATE public.bank_reconciliation_matches
     SET status = 'reversed', reversed_at = now(), reversed_by = auth.uid(),
         reversal_reason = _reason
   WHERE id = _match_id;

  PERFORM public.recompute_entry_reconciliation(m.entry_id);
  PERFORM public.sync_source_settlement(m.entry_id);
  PERFORM public.recompute_transaction_reconciliation(m.bank_transaction_id);
  RETURN jsonb_build_object('reversed', _match_id);
END $$;

CREATE OR REPLACE FUNCTION public.mark_internal_transfer(
  _from_transaction_id uuid, _to_transaction_id uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f public.bank_transactions%ROWTYPE; t public.bank_transactions%ROWTYPE; id uuid;
BEGIN
  SELECT * INTO f FROM public.bank_transactions WHERE id = _from_transaction_id;
  SELECT * INTO t FROM public.bank_transactions WHERE id = _to_transaction_id;
  IF f.id IS NULL OR t.id IS NULL THEN RAISE EXCEPTION 'Both bank transactions are required'; END IF;
  IF f.company_id <> t.company_id THEN
    RAISE EXCEPTION 'Both transactions must belong to the same company' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT public.can_record_company(f.company_id) THEN
    RAISE EXCEPTION 'Not allowed to record transfers for this company';
  END IF;
  IF f.bank_account_id = t.bank_account_id THEN
    RAISE EXCEPTION 'An internal transfer must move between two different accounts'
      USING ERRCODE = 'check_violation';
  END IF;
  IF f.amount >= 0 OR t.amount <= 0 THEN
    RAISE EXCEPTION 'A transfer needs one outgoing and one incoming transaction'
      USING ERRCODE = 'check_violation';
  END IF;
  IF abs(abs(f.amount) - abs(t.amount)) > 0.02 THEN
    RAISE EXCEPTION 'Transfer amounts do not agree' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bank_reconciliation_matches
              WHERE status = 'confirmed' AND bank_transaction_id IN (f.id, t.id)) THEN
    RAISE EXCEPTION 'Reverse the confirmed matches before marking this as a transfer'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.bank_transfers (company_id, from_transaction_id, to_transaction_id,
    from_account_id, to_account_id, amount, transfer_date, notes)
  VALUES (f.company_id, f.id, t.id, f.bank_account_id, t.bank_account_id,
          abs(f.amount), f.transaction_date, _notes)
  ON CONFLICT (from_transaction_id, to_transaction_id) DO UPDATE SET notes = EXCLUDED.notes
  RETURNING bank_transfers.id INTO id;

  UPDATE public.bank_transactions
     SET is_internal_transfer = true, reconciliation_status = 'transfer'
   WHERE id IN (f.id, t.id);
  RETURN id;
END $$;

CREATE OR REPLACE FUNCTION public.cash_flow_entry_from_transaction(
  _bank_transaction_id uuid,
  _category text DEFAULT 'other',
  _description text DEFAULT NULL,
  _property_id uuid DEFAULT NULL,
  _counterparty_name text DEFAULT NULL,
  _vat numeric DEFAULT 0,
  _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.bank_transactions%ROWTYPE; e uuid; gross numeric;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = _bank_transaction_id AND deleted_at IS NULL;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Bank transaction not found'; END IF;
  IF NOT public.can_record_company(t.company_id) THEN
    RAISE EXCEPTION 'Not allowed to record items for this company';
  END IF;
  IF t.is_internal_transfer THEN
    RAISE EXCEPTION 'Internal transfers are not portfolio income or expenditure'
      USING ERRCODE = 'check_violation';
  END IF;
  gross := abs(t.amount) - coalesce(t.matched_amount, 0);
  IF gross <= 0 THEN RAISE EXCEPTION 'This transaction is already fully allocated'; END IF;

  INSERT INTO public.cash_flow_entries (
    company_id, property_id, bank_account_id, entry_date, expected_date, direction, state,
    category, description, currency, amount_total, amount_net, vat, forecast_amount,
    source_type, source_id, is_manual, confidence, counterparty_name, notes)
  VALUES (t.company_id, _property_id, t.bank_account_id, t.transaction_date, t.transaction_date,
    CASE WHEN t.amount >= 0 THEN 'inflow' ELSE 'outflow' END, 'committed',
    _category, coalesce(_description, t.description, 'Bank movement'), t.currency,
    gross, gross - coalesce(_vat, 0), coalesce(_vat, 0), gross,
    'manual', NULL, true, 'confirmed', coalesce(_counterparty_name, t.counterparty_name), _notes)
  RETURNING id INTO e;

  PERFORM public.confirm_bank_match(
    t.id, jsonb_build_array(jsonb_build_object('entry_id', e, 'amount', gross,
                                               'match_type', 'conversion')), _notes);
  RETURN e;
END $$;

CREATE OR REPLACE FUNCTION public.suggest_bank_matches(
  _bank_transaction_id uuid,
  _amount_tolerance numeric DEFAULT 0.02,
  _date_tolerance int DEFAULT 7,
  _limit int DEFAULT 10)
RETURNS TABLE(entry_id uuid, description text, expected_date date, amount_total numeric,
              outstanding numeric, category text, counterparty_name text, property_id uuid,
              source_type text, score int, reasons text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.bank_transactions%ROWTYPE; dir text; want numeric;
BEGIN
  SELECT * INTO t FROM public.bank_transactions WHERE id = _bank_transaction_id;
  IF t.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_view_company(t.company_id) THEN RETURN; END IF;
  dir := CASE WHEN t.amount >= 0 THEN 'inflow' ELSE 'outflow' END;
  want := abs(t.amount) - coalesce(t.matched_amount, 0);

  RETURN QUERY
  WITH candidates AS (
    SELECT e.*, coalesce(e.forecast_amount, e.amount_total) - coalesce(e.matched_amount, 0) AS open_amount,
           a.reference AS agreement_reference, a.lender AS lender
      FROM public.cash_flow_entries e
      LEFT JOIN public.financing_agreements a ON a.id = e.agreement_id
     WHERE e.company_id = t.company_id
       AND e.deleted_at IS NULL
       AND e.is_included
       AND e.direction = dir
       AND e.reconciliation_state <> 'reconciled'
       AND abs(e.expected_date - t.transaction_date) <= greatest(_date_tolerance, 1) * 6
  ), scored AS (
    SELECT c.*,
      (CASE WHEN abs(c.open_amount - want) <= _amount_tolerance THEN 50
            WHEN abs(c.open_amount - want) <= greatest(_amount_tolerance, abs(want) * 0.01) THEN 35
            WHEN c.open_amount > want THEN 15 ELSE 0 END)
    + (CASE WHEN abs(c.expected_date - t.transaction_date) = 0 THEN 20
            WHEN abs(c.expected_date - t.transaction_date) <= 3 THEN 15
            WHEN abs(c.expected_date - t.transaction_date) <= _date_tolerance THEN 10 ELSE 0 END)
    + (CASE WHEN t.counterparty_name IS NOT NULL AND c.counterparty_name IS NOT NULL
              AND (c.counterparty_name ILIKE '%' || t.counterparty_name || '%'
                   OR t.counterparty_name ILIKE '%' || c.counterparty_name || '%') THEN 15 ELSE 0 END)
    + (CASE WHEN t.description IS NOT NULL AND c.description IS NOT NULL
              AND (c.description ILIKE '%' || split_part(t.description, ' ', 1) || '%') THEN 8 ELSE 0 END)
    + (CASE WHEN t.bank_reference IS NOT NULL AND c.agreement_reference IS NOT NULL
              AND t.bank_reference ILIKE '%' || c.agreement_reference || '%' THEN 12 ELSE 0 END)
    + (CASE WHEN t.description IS NOT NULL AND c.lender IS NOT NULL
              AND t.description ILIKE '%' || c.lender || '%' THEN 10 ELSE 0 END)
    + (CASE WHEN c.rule_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.bank_reconciliation_matches k
                JOIN public.cash_flow_entries pe ON pe.id = k.entry_id
                JOIN public.bank_transactions pt ON pt.id = k.bank_transaction_id
               WHERE k.status = 'confirmed' AND pe.rule_id = c.rule_id
                 AND pt.bank_account_id = t.bank_account_id) THEN 10 ELSE 0 END)
    + (CASE WHEN c.bank_account_id = t.bank_account_id THEN 5 ELSE 0 END) AS s,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN abs(c.open_amount - want) <= _amount_tolerance THEN 'amount matches' END,
        CASE WHEN abs(c.expected_date - t.transaction_date) <= _date_tolerance THEN 'date within tolerance' END,
        CASE WHEN t.counterparty_name IS NOT NULL AND c.counterparty_name IS NOT NULL
              AND (c.counterparty_name ILIKE '%' || t.counterparty_name || '%'
                   OR t.counterparty_name ILIKE '%' || c.counterparty_name || '%') THEN 'counterparty' END,
        CASE WHEN t.bank_reference IS NOT NULL AND c.agreement_reference IS NOT NULL
              AND t.bank_reference ILIKE '%' || c.agreement_reference || '%' THEN 'contract reference' END,
        CASE WHEN c.property_id IS NOT NULL THEN 'property linked' END,
        CASE WHEN c.rule_id IS NOT NULL THEN 'recurrence history' END
      ], NULL) AS rs
      FROM candidates c
  )
  SELECT s.id, s.description, s.expected_date, s.amount_total, s.open_amount, s.category,
         s.counterparty_name, s.property_id, s.source_type, s.s::int, s.rs
    FROM scored s
   WHERE s.s > 0
   ORDER BY s.s DESC, abs(s.expected_date - t.transaction_date)
   LIMIT greatest(_limit, 1);
END $$;

CREATE OR REPLACE FUNCTION public.bank_statement_balance_check(_import_id uuid)
RETURNS TABLE(system_closing numeric, statement_closing numeric, difference numeric,
              unreconciled_count int, unreconciled_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i public.bank_statement_imports%ROWTYPE; acc public.bank_accounts%ROWTYPE; sys numeric;
BEGIN
  SELECT * INTO i FROM public.bank_statement_imports WHERE id = _import_id;
  IF i.id IS NULL THEN RETURN; END IF;
  IF NOT public.can_view_company(i.company_id) THEN RETURN; END IF;
  SELECT * INTO acc FROM public.bank_accounts WHERE id = i.bank_account_id;

  SELECT acc.opening_balance + coalesce(sum(bt.amount), 0) INTO sys
    FROM public.bank_transactions bt
   WHERE bt.bank_account_id = i.bank_account_id
     AND bt.deleted_at IS NULL
     AND bt.transaction_date <= coalesce(i.period_end, bt.transaction_date);

  RETURN QUERY
  SELECT sys,
         i.statement_closing_balance,
         CASE WHEN i.statement_closing_balance IS NULL THEN NULL
              ELSE round(sys - i.statement_closing_balance, 2) END,
         (SELECT count(*)::int FROM public.bank_transactions bt
           WHERE bt.import_id = i.id AND bt.deleted_at IS NULL
             AND bt.reconciliation_status IN ('unmatched','partially_matched')),
         (SELECT coalesce(sum(abs(bt.amount) - coalesce(bt.matched_amount, 0)), 0)
            FROM public.bank_transactions bt
           WHERE bt.import_id = i.id AND bt.deleted_at IS NULL
             AND bt.reconciliation_status IN ('unmatched','partially_matched'));
END $$;

CREATE OR REPLACE FUNCTION public.mark_statement_batch_reconciled(
  _import_id uuid, _override_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE i public.bank_statement_imports%ROWTYPE; chk record;
BEGIN
  SELECT * INTO i FROM public.bank_statement_imports WHERE id = _import_id FOR UPDATE;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Statement batch not found'; END IF;
  IF NOT public.can_record_company(i.company_id) THEN
    RAISE EXCEPTION 'Not allowed to close batches for this company';
  END IF;
  IF i.status <> 'committed' THEN
    RAISE EXCEPTION 'Only a committed batch can be marked reconciled';
  END IF;

  SELECT * INTO chk FROM public.bank_statement_balance_check(_import_id);

  IF chk.unreconciled_count > 0 OR coalesce(abs(chk.difference), 0) > 0.01 THEN
    IF coalesce(btrim(_override_reason), '') = '' THEN
      RAISE EXCEPTION 'Unexplained differences remain: % unreconciled transaction(s), balance difference %',
        chk.unreconciled_count, coalesce(chk.difference, 0)
        USING ERRCODE = 'check_violation';
    END IF;
    IF NOT public.can_manage_company(i.company_id) THEN
      RAISE EXCEPTION 'Only owners and managers can override a balance difference';
    END IF;
    UPDATE public.bank_statement_imports
       SET balance_override_reason = _override_reason,
           balance_override_by = auth.uid(), balance_override_at = now()
     WHERE id = _import_id;
  END IF;

  UPDATE public.bank_statement_imports
     SET status = 'reconciled', reconciled_at = now(), reconciled_by = auth.uid()
   WHERE id = _import_id;

  RETURN jsonb_build_object('status', 'reconciled',
                            'difference', coalesce(chk.difference, 0),
                            'unreconciled', chk.unreconciled_count);
END $$;

REVOKE ALL ON FUNCTION public.commit_bank_statement_import(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_bank_match(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reverse_bank_match(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_internal_transfer(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cash_flow_entry_from_transaction(uuid, text, text, uuid, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suggest_bank_matches(uuid, numeric, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bank_statement_balance_check(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_statement_batch_reconciled(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_entry_reconciliation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_transaction_reconciliation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_source_settlement(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.commit_bank_statement_import(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_bank_match(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_bank_match(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_internal_transfer(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cash_flow_entry_from_transaction(uuid, text, text, uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_bank_matches(uuid, numeric, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bank_statement_balance_check(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_statement_batch_reconciled(uuid, text) TO authenticated;

-- ==================================================================== views
CREATE OR REPLACE VIEW public.v_bank_transactions
WITH (security_invoker = true) AS
SELECT bt.*,
       ba.name AS account_name,
       ba.bank_name,
       ba.currency AS account_currency,
       abs(bt.amount) - coalesce(bt.matched_amount, 0) AS outstanding_amount,
       (SELECT count(*) FROM public.bank_reconciliation_matches k
         WHERE k.bank_transaction_id = bt.id AND k.status = 'confirmed') AS match_count
  FROM public.bank_transactions bt
  JOIN public.bank_accounts ba ON ba.id = bt.bank_account_id
 WHERE bt.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_bank_account_balances
WITH (security_invoker = true) AS
SELECT ba.id AS bank_account_id,
       ba.company_id,
       ba.name,
       ba.bank_name,
       ba.iban,
       ba.account_identifier,
       ba.currency,
       ba.account_type,
       ba.status,
       ba.opening_balance,
       ba.opening_balance_date,
       coalesce(sum(bt.amount), 0) AS movement,
       ba.opening_balance + coalesce(sum(bt.amount), 0) AS system_balance,
       coalesce(sum(bt.amount) FILTER (WHERE NOT bt.is_internal_transfer AND bt.amount > 0), 0) AS inflows,
       coalesce(sum(-bt.amount) FILTER (WHERE NOT bt.is_internal_transfer AND bt.amount < 0), 0) AS outflows,
       count(bt.id) FILTER (WHERE bt.reconciliation_status IN ('unmatched','partially_matched')) AS unreconciled_count,
       coalesce(sum(abs(bt.amount) - coalesce(bt.matched_amount, 0))
                FILTER (WHERE bt.reconciliation_status IN ('unmatched','partially_matched')), 0) AS unreconciled_value,
       max(bt.transaction_date) AS last_transaction_date
  FROM public.bank_accounts ba
  LEFT JOIN public.bank_transactions bt
    ON bt.bank_account_id = ba.id AND bt.deleted_at IS NULL
 WHERE ba.deleted_at IS NULL
 GROUP BY ba.id;

CREATE OR REPLACE VIEW public.v_bank_expected_items
WITH (security_invoker = true) AS
SELECT e.id AS entry_id, e.company_id, e.property_id, e.bank_account_id, e.category,
       e.direction, e.state, e.reconciliation_state, e.description, e.counterparty_name,
       e.expected_date, e.currency,
       coalesce(e.forecast_amount, e.amount_total) AS expected_amount,
       coalesce(e.matched_amount, 0) AS matched_amount,
       coalesce(e.forecast_amount, e.amount_total) - coalesce(e.matched_amount, 0) AS outstanding_amount,
       e.source_type, e.agreement_id, e.rule_id, p.code AS property_code, p.name AS property_name
  FROM public.cash_flow_entries e
  LEFT JOIN public.properties p ON p.id = e.property_id
 WHERE e.deleted_at IS NULL
   AND e.is_included
   AND e.reconciliation_state <> 'reconciled';

CREATE OR REPLACE VIEW public.v_bank_reconciliation_exceptions
WITH (security_invoker = true) AS
SELECT k.id AS match_id, k.company_id, k.bank_transaction_id, k.entry_id, k.allocated_amount,
       k.forecast_amount, k.variance_amount, k.variance_reason, k.match_type, k.status,
       bt.transaction_date, bt.description AS transaction_description, bt.bank_account_id,
       e.description AS entry_description, e.category, e.property_id
  FROM public.bank_reconciliation_matches k
  JOIN public.bank_transactions bt ON bt.id = k.bank_transaction_id
  JOIN public.cash_flow_entries e ON e.id = k.entry_id
 WHERE k.status = 'confirmed' AND abs(coalesce(k.variance_amount, 0)) > 0.01;

GRANT SELECT ON public.v_bank_transactions, public.v_bank_account_balances,
  public.v_bank_expected_items, public.v_bank_reconciliation_exceptions TO authenticated;