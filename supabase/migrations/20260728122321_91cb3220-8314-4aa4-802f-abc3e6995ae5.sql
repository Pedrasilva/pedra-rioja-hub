DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'tg_touch_row','tg_property_code','tg_seed_company_dimensions','tg_sync_dimension_value',
        'tg_event_property_purchase','tg_event_financing','tg_event_financing_version',
        'tg_event_tenancy','tg_event_project','tg_event_valuation','tg_event_insurance',
        'seed_company_dimensions','record_property_event',
        'can_view_company','can_manage_company','can_record_company')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.can_view_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_record_company(uuid) TO authenticated;