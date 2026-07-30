-- Phase 8B hardening: every reference an operational record holds must belong
-- to the same company. Previously only commitment_id was checked, and only in
-- the create/link functions, so a direct write or a foreign counterparty could
-- slip through.

CREATE OR REPLACE FUNCTION public.tg_operational_same_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  v_ref uuid;
BEGIN
  IF j ? 'counterparty_id' AND (j ->> 'counterparty_id') IS NOT NULL THEN
    v_ref := (j ->> 'counterparty_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.counterparties c
                    WHERE c.id = v_ref AND c.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked counterparty belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'insurer_counterparty_id' AND (j ->> 'insurer_counterparty_id') IS NOT NULL THEN
    v_ref := (j ->> 'insurer_counterparty_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.counterparties c
                    WHERE c.id = v_ref AND c.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked insurer belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'broker_counterparty_id' AND (j ->> 'broker_counterparty_id') IS NOT NULL THEN
    v_ref := (j ->> 'broker_counterparty_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.counterparties c
                    WHERE c.id = v_ref AND c.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked broker belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'property_id' AND (j ->> 'property_id') IS NOT NULL THEN
    v_ref := (j ->> 'property_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.properties p
                    WHERE p.id = v_ref AND p.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked property belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'unit_id' AND (j ->> 'unit_id') IS NOT NULL THEN
    v_ref := (j ->> 'unit_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.property_units u
                    WHERE u.id = v_ref AND u.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked unit belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'obligation_id' AND (j ->> 'obligation_id') IS NOT NULL THEN
    v_ref := (j ->> 'obligation_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.operational_obligations o
                    WHERE o.id = v_ref AND o.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked obligation belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  IF j ? 'commitment_id' AND (j ->> 'commitment_id') IS NOT NULL THEN
    v_ref := (j ->> 'commitment_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.commitments c
                    WHERE c.id = v_ref AND c.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'The linked commitment belongs to another company' USING errcode = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_oo_same_company ON public.operational_obligations;
CREATE TRIGGER trg_oo_same_company BEFORE INSERT OR UPDATE ON public.operational_obligations
  FOR EACH ROW EXECUTE FUNCTION public.tg_operational_same_company();

DROP TRIGGER IF EXISTS trg_sc_same_company ON public.service_contracts;
CREATE TRIGGER trg_sc_same_company BEFORE INSERT OR UPDATE ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tg_operational_same_company();

DROP TRIGGER IF EXISTS trg_ip_same_company ON public.insurance_policies;
CREATE TRIGGER trg_ip_same_company BEFORE INSERT OR UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_operational_same_company();

DROP TRIGGER IF EXISTS trg_uc_same_company ON public.utility_contracts;
CREATE TRIGGER trg_uc_same_company BEFORE INSERT OR UPDATE ON public.utility_contracts
  FOR EACH ROW EXECUTE FUNCTION public.tg_operational_same_company();

DROP TRIGGER IF EXISTS trg_ts_same_company ON public.tax_schedules;
CREATE TRIGGER trg_ts_same_company BEFORE INSERT OR UPDATE ON public.tax_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_operational_same_company();