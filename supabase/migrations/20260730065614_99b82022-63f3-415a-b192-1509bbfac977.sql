do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'create_operational_obligation','update_operational_obligation',
         'create_service_contract','update_service_contract',
         'create_insurance_policy','update_insurance_policy',
         'create_utility_contract','update_utility_contract',
         'create_tax_schedule','update_tax_schedule','add_tax_schedule_date',
         'archive_operational_record','link_operational_commitment',
         'create_operational_commitment','upsert_operational_reminder',
         'resolve_operational_reminder','generate_operational_reminders',
         'operational_table_for','next_operational_due_date',
         'tg_guard_operational_row')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;