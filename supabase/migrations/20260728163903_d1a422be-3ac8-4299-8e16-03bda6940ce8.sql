REVOKE ALL ON FUNCTION public.tg_seed_company_scenarios() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_cash_flow_entry_date() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_guard_cash_flow_entry() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_recurring_cash_flow(uuid,date) FROM anon;
REVOKE ALL ON FUNCTION public.generate_company_cash_flow(uuid,date) FROM anon;
REVOKE ALL ON FUNCTION public.seed_company_scenarios(uuid) FROM anon, authenticated;