create or replace function public.seed_company_dimensions(_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dimensions (company_id, code, label, target_table, is_system, sort_order)
  values
    (_company_id, 'property',    'Property',     'properties',           true, 10),
    (_company_id, 'unit',        'Unit',         'property_units',       true, 20),
    (_company_id, 'project',     'Project',      'capex_projects',       true, 30),
    (_company_id, 'financing',   'Financing',    'financing_agreements', true, 40),
    (_company_id, 'tenancy',     'Tenancy',      'tenancy_agreements',   true, 50),
    (_company_id, 'tenant',      'Tenant',       'tenants',              true, 60),
    (_company_id, 'tenant_loan', 'Tenant loan',  'tenant_fitout_loans',  true, 70),
    (_company_id, 'commitment',  'Commitment',   'commitments',          true, 75),
    (_company_id, 'supplier',    'Supplier',     null,                   true, 80),
    (_company_id, 'client',      'Client',       null,                   true, 90),
    (_company_id, 'cost_centre', 'Cost centre',  null,                   true, 100),
    (_company_id, 'vat_category','VAT category', null,                   true, 110)
  on conflict (company_id, code) do nothing;
end $$;

insert into public.dimensions (company_id, code, label, target_table, is_system, sort_order)
select c.id, 'commitment', 'Commitment', 'commitments', true, 75
  from public.companies c
on conflict (company_id, code) do nothing;