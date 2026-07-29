alter view public.v_capex_summary set (security_invoker = true);

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.proname like 'commitment%' or p.proname like '%_commitment%'
            or p.proname like '%maintenance_job%' or p.proname = 'can_approve_company'
            or p.proname = 'sync_commitment_cash_flow' or p.proname like 'tg_guard_commitment%'
            or p.proname = 'tg_guard_drawdown' or p.proname = 'tg_guard_approval'
            or p.proname = 'tg_guard_maintenance_job')
  loop
    execute format('revoke all on function %s from anon, public', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end $$;