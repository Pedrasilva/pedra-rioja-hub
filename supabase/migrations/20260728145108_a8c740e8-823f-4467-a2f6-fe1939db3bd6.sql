-- 1. Generic audit trigger -------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _company uuid;
  _entity uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
  ELSE
    _action := 'update';
    IF to_jsonb(NEW) ? 'status' THEN
      IF (to_jsonb(NEW) ->> 'status') = 'archived' AND coalesce(to_jsonb(OLD) ->> 'status','') <> 'archived' THEN
        _action := 'archive';
      ELSIF (to_jsonb(OLD) ->> 'status') = 'archived' AND coalesce(to_jsonb(NEW) ->> 'status','') <> 'archived' THEN
        _action := 'restore';
      END IF;
    END IF;
    IF _action = 'update' AND to_jsonb(NEW) ? 'deleted_at' THEN
      IF (to_jsonb(NEW) ->> 'deleted_at') IS NOT NULL AND (to_jsonb(OLD) ->> 'deleted_at') IS NULL THEN
        _action := 'archive';
      ELSIF (to_jsonb(NEW) ->> 'deleted_at') IS NULL AND (to_jsonb(OLD) ->> 'deleted_at') IS NOT NULL THEN
        _action := 'restore';
      END IF;
    END IF;
    -- skip pure no-op updates
    IF to_jsonb(NEW) - 'updated_at' - 'updated_by' = to_jsonb(OLD) - 'updated_at' - 'updated_by' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    _company := (to_jsonb(OLD) ->> 'company_id')::uuid;
    _entity  := (to_jsonb(OLD) ->> 'id')::uuid;
  ELSE
    _company := (to_jsonb(NEW) ->> 'company_id')::uuid;
    _entity  := (to_jsonb(NEW) ->> 'id')::uuid;
  END IF;

  INSERT INTO public.audit_log (company_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    _company,
    auth.uid(),
    _action,
    TG_TABLE_NAME,
    _entity,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.tg_audit_row() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS properties_audit ON public.properties;
CREATE TRIGGER properties_audit AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS financing_agreements_audit ON public.financing_agreements;
CREATE TRIGGER financing_agreements_audit AFTER INSERT OR UPDATE OR DELETE ON public.financing_agreements
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS tenancy_agreements_audit ON public.tenancy_agreements;
CREATE TRIGGER tenancy_agreements_audit AFTER INSERT OR UPDATE OR DELETE ON public.tenancy_agreements
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS tenants_audit ON public.tenants;
CREATE TRIGGER tenants_audit AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS capex_projects_audit ON public.capex_projects;
CREATE TRIGGER capex_projects_audit AFTER INSERT OR UPDATE OR DELETE ON public.capex_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS property_units_audit ON public.property_units;
CREATE TRIGGER property_units_audit AFTER INSERT OR UPDATE OR DELETE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

-- 2. Cleanup of polymorphic links on hard delete ----------------------------
CREATE OR REPLACE FUNCTION public.tg_cleanup_entity_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.drive_folders
   WHERE company_id = OLD.company_id AND entity_id = OLD.id;
  DELETE FROM public.dimension_values
   WHERE company_id = OLD.company_id AND entity_id = OLD.id
     AND NOT EXISTS (SELECT 1 FROM public.transaction_dimensions td
                      WHERE td.dimension_value_id = dimension_values.id);
  DELETE FROM public.document_links
   WHERE entity_type = TG_TABLE_NAME AND entity_id = OLD.id;
  RETURN OLD;
END $$;

REVOKE ALL ON FUNCTION public.tg_cleanup_entity_links() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS properties_cleanup_links ON public.properties;
CREATE TRIGGER properties_cleanup_links BEFORE DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

DROP TRIGGER IF EXISTS property_units_cleanup_links ON public.property_units;
CREATE TRIGGER property_units_cleanup_links BEFORE DELETE ON public.property_units
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

DROP TRIGGER IF EXISTS capex_projects_cleanup_links ON public.capex_projects;
CREATE TRIGGER capex_projects_cleanup_links BEFORE DELETE ON public.capex_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

DROP TRIGGER IF EXISTS financing_agreements_cleanup_links ON public.financing_agreements;
CREATE TRIGGER financing_agreements_cleanup_links BEFORE DELETE ON public.financing_agreements
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

DROP TRIGGER IF EXISTS tenancy_agreements_cleanup_links ON public.tenancy_agreements;
CREATE TRIGGER tenancy_agreements_cleanup_links BEFORE DELETE ON public.tenancy_agreements
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

DROP TRIGGER IF EXISTS tenants_cleanup_links ON public.tenants;
CREATE TRIGGER tenants_cleanup_links BEFORE DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tg_cleanup_entity_links();

-- 3. No silent orphaning of financing when a property is removed ------------
ALTER TABLE public.financing_agreements
  DROP CONSTRAINT IF EXISTS financing_agreements_property_id_fkey;
ALTER TABLE public.financing_agreements
  ADD CONSTRAINT financing_agreements_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;