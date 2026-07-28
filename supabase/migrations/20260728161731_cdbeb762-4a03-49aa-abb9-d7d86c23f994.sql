-- Operational roles may record settlement/reconciliation state on instalments,
-- but never alter the contractual amounts of a projection.
CREATE POLICY financing_schedule_rows_record_state
  ON public.financing_schedule_rows
  FOR UPDATE
  TO authenticated
  USING (public.can_record_company(company_id))
  WITH CHECK (public.can_record_company(company_id));

CREATE OR REPLACE FUNCTION public.tg_guard_instalment_amounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Managers/owners keep full edit rights; everyone else may only move the
  -- settlement state forward.
  IF public.can_manage_company(NEW.company_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.period_no IS DISTINCT FROM OLD.period_no
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.opening_balance IS DISTINCT FROM OLD.opening_balance
     OR NEW.closing_balance IS DISTINCT FROM OLD.closing_balance
     OR NEW.principal IS DISTINCT FROM OLD.principal
     OR NEW.interest IS DISTINCT FROM OLD.interest
     OR NEW.vat IS DISTINCT FROM OLD.vat
     OR NEW.commissions IS DISTINCT FROM OLD.commissions
     OR NEW.insurance IS DISTINCT FROM OLD.insurance
     OR NEW.fees IS DISTINCT FROM OLD.fees
     OR NEW.total_payment IS DISTINCT FROM OLD.total_payment
     OR NEW.version_id IS DISTINCT FROM OLD.version_id
     OR NEW.superseded_at IS DISTINCT FROM OLD.superseded_at
     OR NEW.superseded_by_version_id IS DISTINCT FROM OLD.superseded_by_version_id
  THEN
    RAISE EXCEPTION 'Only owners and managers can change instalment amounts or schedule versions';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_instalment_amounts ON public.financing_schedule_rows;
CREATE TRIGGER guard_instalment_amounts
  BEFORE UPDATE ON public.financing_schedule_rows
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_instalment_amounts();