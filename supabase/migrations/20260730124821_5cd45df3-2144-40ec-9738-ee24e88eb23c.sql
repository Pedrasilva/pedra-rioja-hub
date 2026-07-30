-- =====================================================================
-- Phase 8E — Lease & Asset Management
--
-- Frozen contract compliance (§5C / §5D / §5E):
--   * Leases are OPERATIONAL contracts. They own relationships only.
--   * No table below writes to commitments, cash_flow_entries,
--     bookkeeping documents or banking records.
--   * Contractual rent/charge figures are CONTRACT TERMS, never ledger
--     amounts; all reported financials are derived in views.
--   * Records are archived, never deleted.
--   * Reminders reuse the existing operational reminder engine.
-- =====================================================================

-- ------------------------------------------------------------- guard fn
create or replace function public.tg_guard_lease_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Lease records are archived, never deleted'
    using errcode = 'check_violation';
end;
$$;

-- =============================================== tenants (register extras)
alter table public.tenants
  add column if not exists trading_name text,
  add column if not exists registration_number text,
  add column if not exists website text,
  add column if not exists sector text,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

create table public.tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.tenant_contacts to authenticated;
grant all on public.tenant_contacts to service_role;
alter table public.tenant_contacts enable row level security;

create policy tc_select on public.tenant_contacts
  for select to authenticated using (public.can_view_company(company_id));
create policy tc_insert on public.tenant_contacts
  for insert to authenticated with check (public.can_record_company(company_id));
create policy tc_update on public.tenant_contacts
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_tc_tenant on public.tenant_contacts (tenant_id, is_primary);

create trigger trg_tc_touch before update on public.tenant_contacts
  for each row execute function public.tg_touch_row();
create trigger trg_tc_guard before delete on public.tenant_contacts
  for each row execute function public.tg_guard_lease_row();
create trigger trg_tc_audit after insert or update or delete on public.tenant_contacts
  for each row execute function public.tg_audit_row();

-- =============================================================== leases
create table public.leases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  code text,
  title text,
  primary_tenant_id uuid references public.tenants(id) on delete restrict,
  lease_type text not null default 'commercial'
    check (lease_type in ('commercial','retail','office','industrial','residential','parking','storage','other')),
  status text not null default 'draft'
    check (status in ('draft','negotiation','approved','active','expiring','renewed','terminated','expired','archived')),
  current_version_id uuid,
  commencement_date date,
  termination_date date,
  termination_reason text,
  renewed_from_lease_id uuid references public.leases(id) on delete set null,
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.leases to authenticated;
grant all on public.leases to service_role;
alter table public.leases enable row level security;

create policy lease_select on public.leases
  for select to authenticated using (public.can_view_company(company_id));
create policy lease_insert on public.leases
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lease_update on public.leases
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lease_company on public.leases (company_id, status);
create index idx_lease_property on public.leases (property_id);
create index idx_lease_tenant on public.leases (primary_tenant_id);

create trigger trg_lease_touch before update on public.leases
  for each row execute function public.tg_touch_row();
create trigger trg_lease_guard before delete on public.leases
  for each row execute function public.tg_guard_lease_row();
create trigger trg_lease_audit after insert or update or delete on public.leases
  for each row execute function public.tg_audit_row();

-- ====================================================== lease_versions
create table public.lease_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_no integer not null,
  version_reason text not null default 'origination'
    check (version_reason in ('origination','renewal','variation','rent_review','regularisation','correction')),
  status text not null default 'draft'
    check (status in ('draft','active','superseded')),
  effective_from date not null,
  effective_to date,
  start_date date not null,
  end_date date,
  is_open_ended boolean not null default false,
  currency char(3) not null default 'EUR',
  base_rent numeric(14,2) not null default 0,
  service_charge numeric(14,2) not null default 0,
  payment_frequency text not null default 'monthly'
    check (payment_frequency in ('monthly','quarterly','semiannual','annual')),
  payment_day integer,
  vat_applicable boolean not null default false,
  indexation_type text not null default 'none'
    check (indexation_type in ('none','ipc','cpi','fixed_pct','open_market','negotiated')),
  indexation_index text,
  indexation_month integer,
  indexation_pct numeric(7,4),
  review_cycle_months integer,
  notice_period_days integer,
  deposit_amount numeric(14,2) not null default 0,
  deposit_reference text,
  deposit_expiry_date date,
  notes text,
  activated_at timestamptz,
  activated_by uuid,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (lease_id, version_no)
);

grant select, insert, update on public.lease_versions to authenticated;
grant all on public.lease_versions to service_role;
alter table public.lease_versions enable row level security;

create policy lv_select on public.lease_versions
  for select to authenticated using (public.can_view_company(company_id));
create policy lv_insert on public.lease_versions
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lv_update on public.lease_versions
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lv_lease on public.lease_versions (lease_id, version_no desc);
create index idx_lv_status on public.lease_versions (company_id, status);

alter table public.leases
  add constraint leases_current_version_fk
  foreign key (current_version_id) references public.lease_versions(id) on delete set null;

-- Immutability: once a version is activated its commercial terms are frozen.
create or replace function public.tg_lease_version_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'draft' then
    return new;
  end if;

  if new.version_no is distinct from old.version_no
     or new.lease_id is distinct from old.lease_id
     or new.version_reason is distinct from old.version_reason
     or new.effective_from is distinct from old.effective_from
     or new.start_date is distinct from old.start_date
     or new.end_date is distinct from old.end_date
     or new.currency is distinct from old.currency
     or new.base_rent is distinct from old.base_rent
     or new.service_charge is distinct from old.service_charge
     or new.payment_frequency is distinct from old.payment_frequency
     or new.vat_applicable is distinct from old.vat_applicable
     or new.indexation_type is distinct from old.indexation_type
     or new.indexation_pct is distinct from old.indexation_pct
     or new.deposit_amount is distinct from old.deposit_amount
  then
    raise exception 'Lease version % is activated and its terms are immutable', old.id
      using errcode = 'check_violation';
  end if;

  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'A superseded lease version cannot be reactivated'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_lv_immutable before update on public.lease_versions
  for each row execute function public.tg_lease_version_immutable();
create trigger trg_lv_touch before update on public.lease_versions
  for each row execute function public.tg_touch_row();
create trigger trg_lv_guard before delete on public.lease_versions
  for each row execute function public.tg_guard_lease_row();
create trigger trg_lv_audit after insert or update or delete on public.lease_versions
  for each row execute function public.tg_audit_row();

-- ========================================================= lease_units
create table public.lease_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_id uuid not null references public.lease_versions(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete restrict,
  demise_label text,
  area_m2 numeric(12,2),
  apportionment_pct numeric(7,4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (version_id, unit_id)
);

grant select, insert, update on public.lease_units to authenticated;
grant all on public.lease_units to service_role;
alter table public.lease_units enable row level security;

create policy lu_select on public.lease_units
  for select to authenticated using (public.can_view_company(company_id));
create policy lu_insert on public.lease_units
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lu_update on public.lease_units
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lu_version on public.lease_units (version_id);
create index idx_lu_unit on public.lease_units (unit_id);

create trigger trg_lu_touch before update on public.lease_units
  for each row execute function public.tg_touch_row();
create trigger trg_lu_audit after insert or update or delete on public.lease_units
  for each row execute function public.tg_audit_row();

-- ======================================================= lease_tenants
create table public.lease_tenants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_id uuid not null references public.lease_versions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  is_primary boolean not null default false,
  share_pct numeric(7,4),
  role text not null default 'tenant' check (role in ('tenant','co_tenant','occupier','assignee')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (version_id, tenant_id)
);

grant select, insert, update on public.lease_tenants to authenticated;
grant all on public.lease_tenants to service_role;
alter table public.lease_tenants enable row level security;

create policy lt_select on public.lease_tenants
  for select to authenticated using (public.can_view_company(company_id));
create policy lt_insert on public.lease_tenants
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lt_update on public.lease_tenants
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lt_version on public.lease_tenants (version_id);
create index idx_lt_tenant on public.lease_tenants (tenant_id);

create trigger trg_lt_touch before update on public.lease_tenants
  for each row execute function public.tg_touch_row();
create trigger trg_lt_audit after insert or update or delete on public.lease_tenants
  for each row execute function public.tg_audit_row();

-- ======================================================= lease_charges
-- Contract terms for the charge schedule. Not an invoice, not a ledger.
create table public.lease_charges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_id uuid not null references public.lease_versions(id) on delete cascade,
  charge_type text not null default 'base_rent'
    check (charge_type in ('base_rent','service_charge','insurance_recharge','utilities_recharge',
                           'parking','storage','marketing','turnover_rent','other')),
  label text,
  amount numeric(14,2) not null default 0,
  currency char(3) not null default 'EUR',
  frequency text not null default 'monthly'
    check (frequency in ('monthly','quarterly','semiannual','annual','one_off')),
  vat_applicable boolean not null default false,
  vat_rate numeric(7,4),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.lease_charges to authenticated;
grant all on public.lease_charges to service_role;
alter table public.lease_charges enable row level security;

create policy lc_select on public.lease_charges
  for select to authenticated using (public.can_view_company(company_id));
create policy lc_insert on public.lease_charges
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lc_update on public.lease_charges
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lc_version on public.lease_charges (version_id, charge_type);

create trigger trg_lc_touch before update on public.lease_charges
  for each row execute function public.tg_touch_row();
create trigger trg_lc_audit after insert or update or delete on public.lease_charges
  for each row execute function public.tg_audit_row();

-- ==================================================== lease_guarantors
create table public.lease_guarantors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  name text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  guarantee_type text not null default 'parent_company'
    check (guarantee_type in ('parent_company','personal','bank_guarantee','deposit','insurance_bond','other')),
  guarantee_amount numeric(14,2),
  currency char(3) not null default 'EUR',
  reference text,
  start_date date,
  expiry_date date,
  status text not null default 'active'
    check (status in ('active','expired','released','called')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.lease_guarantors to authenticated;
grant all on public.lease_guarantors to service_role;
alter table public.lease_guarantors enable row level security;

create policy lg_select on public.lease_guarantors
  for select to authenticated using (public.can_view_company(company_id));
create policy lg_insert on public.lease_guarantors
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lg_update on public.lease_guarantors
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lg_lease on public.lease_guarantors (lease_id, status);

create trigger trg_lg_touch before update on public.lease_guarantors
  for each row execute function public.tg_touch_row();
create trigger trg_lg_guard before delete on public.lease_guarantors
  for each row execute function public.tg_guard_lease_row();
create trigger trg_lg_audit after insert or update or delete on public.lease_guarantors
  for each row execute function public.tg_audit_row();

-- ======================================================= lease_reviews
create table public.lease_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_id uuid references public.lease_versions(id) on delete set null,
  review_type text not null default 'scheduled'
    check (review_type in ('scheduled','manual','indexation','open_market','stepped')),
  review_date date not null,
  effective_date date not null,
  index_name text,
  index_value numeric(12,4),
  index_pct numeric(7,4),
  current_rent numeric(14,2),
  proposed_rent numeric(14,2),
  agreed_rent numeric(14,2),
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','proposed','agreed','rejected','applied','cancelled')),
  approval_request_id uuid,
  applied_version_id uuid references public.lease_versions(id) on delete set null,
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.lease_reviews to authenticated;
grant all on public.lease_reviews to service_role;
alter table public.lease_reviews enable row level security;

create policy lr_select on public.lease_reviews
  for select to authenticated using (public.can_view_company(company_id));
create policy lr_insert on public.lease_reviews
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lr_update on public.lease_reviews
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lr_lease on public.lease_reviews (lease_id, review_date);
create index idx_lr_status on public.lease_reviews (company_id, status, effective_date);

-- Applied reviews are history and cannot be re-opened or re-priced.
create or replace function public.tg_lease_review_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'applied' and (
       new.agreed_rent is distinct from old.agreed_rent
    or new.effective_date is distinct from old.effective_date
    or new.status <> 'applied'
    or new.applied_version_id is distinct from old.applied_version_id)
  then
    raise exception 'Applied rent reviews are immutable'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_lr_immutable before update on public.lease_reviews
  for each row execute function public.tg_lease_review_immutable();
create trigger trg_lr_touch before update on public.lease_reviews
  for each row execute function public.tg_touch_row();
create trigger trg_lr_guard before delete on public.lease_reviews
  for each row execute function public.tg_guard_lease_row();
create trigger trg_lr_audit after insert or update or delete on public.lease_reviews
  for each row execute function public.tg_audit_row();

-- ======================================================== lease_breaks
create table public.lease_breaks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  version_id uuid references public.lease_versions(id) on delete set null,
  break_type text not null default 'tenant'
    check (break_type in ('tenant','landlord','mutual')),
  window_start date not null,
  window_end date,
  notice_days integer not null default 180 check (notice_days >= 0),
  notice_deadline date,
  exercised_on date,
  effective_date date,
  status text not null default 'open'
    check (status in ('open','notice_served','exercised','lapsed','waived')),
  conditions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.lease_breaks to authenticated;
grant all on public.lease_breaks to service_role;
alter table public.lease_breaks enable row level security;

create policy lb_select on public.lease_breaks
  for select to authenticated using (public.can_view_company(company_id));
create policy lb_insert on public.lease_breaks
  for insert to authenticated with check (public.can_record_company(company_id));
create policy lb_update on public.lease_breaks
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_lb_lease on public.lease_breaks (lease_id, window_start);
create index idx_lb_status on public.lease_breaks (company_id, status, window_start);

create or replace function public.tg_lease_break_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.notice_deadline := new.window_start - (coalesce(new.notice_days, 0) || ' days')::interval;
  return new;
end;
$$;

create trigger trg_lb_deadline before insert or update on public.lease_breaks
  for each row execute function public.tg_lease_break_deadline();
create trigger trg_lb_touch before update on public.lease_breaks
  for each row execute function public.tg_touch_row();
create trigger trg_lb_guard before delete on public.lease_breaks
  for each row execute function public.tg_guard_lease_row();
create trigger trg_lb_audit after insert or update or delete on public.lease_breaks
  for each row execute function public.tg_audit_row();

-- ======================================================= lease_notices
create table public.lease_notices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  notice_type text not null
    check (notice_type in ('renewal','termination','break','rent_review','default','general')),
  served_by text not null default 'landlord' check (served_by in ('landlord','tenant')),
  served_on date not null,
  effective_date date,
  reference text,
  summary text,
  status text not null default 'served'
    check (status in ('draft','served','acknowledged','withdrawn','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.lease_notices to authenticated;
grant all on public.lease_notices to service_role;
alter table public.lease_notices enable row level security;

create policy ln_select on public.lease_notices
  for select to authenticated using (public.can_view_company(company_id));
create policy ln_insert on public.lease_notices
  for insert to authenticated with check (public.can_record_company(company_id));
create policy ln_update on public.lease_notices
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_ln_lease on public.lease_notices (lease_id, served_on desc);

create trigger trg_ln_touch before update on public.lease_notices
  for each row execute function public.tg_touch_row();
create trigger trg_ln_guard before delete on public.lease_notices
  for each row execute function public.tg_guard_lease_row();
create trigger trg_ln_audit after insert or update or delete on public.lease_notices
  for each row execute function public.tg_audit_row();

-- ==================================================== occupancy_history
create table public.occupancy_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete cascade,
  status text not null
    check (status in ('occupied','vacant','reserved','under_offer','under_refurbishment','unavailable')),
  lease_id uuid references public.leases(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  period_start date not null,
  period_end date,
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.occupancy_history to authenticated;
grant all on public.occupancy_history to service_role;
alter table public.occupancy_history enable row level security;

create policy oh_select on public.occupancy_history
  for select to authenticated using (public.can_view_company(company_id));
create policy oh_insert on public.occupancy_history
  for insert to authenticated with check (public.can_record_company(company_id));
create policy oh_update on public.occupancy_history
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_oh_unit on public.occupancy_history (unit_id, period_start desc);
create index idx_oh_open on public.occupancy_history (company_id, period_end) where period_end is null;

create trigger trg_oh_touch before update on public.occupancy_history
  for each row execute function public.tg_touch_row();
create trigger trg_oh_guard before delete on public.occupancy_history
  for each row execute function public.tg_guard_lease_row();
create trigger trg_oh_audit after insert or update or delete on public.occupancy_history
  for each row execute function public.tg_audit_row();

-- ===================================================== vacancy_periods
create table public.vacancy_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete cascade,
  vacancy_start date not null,
  vacancy_end date,
  reason text not null default 'lease_ended'
    check (reason in ('lease_ended','termination','break_exercised','refurbishment','new_build','strategic','other')),
  marketing_status text not null default 'not_marketed'
    check (marketing_status in ('not_marketed','preparing','marketed','under_offer','let_agreed','withdrawn')),
  target_rent numeric(14,2),
  target_occupation_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.vacancy_periods to authenticated;
grant all on public.vacancy_periods to service_role;
alter table public.vacancy_periods enable row level security;

create policy vp_select on public.vacancy_periods
  for select to authenticated using (public.can_view_company(company_id));
create policy vp_insert on public.vacancy_periods
  for insert to authenticated with check (public.can_record_company(company_id));
create policy vp_update on public.vacancy_periods
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_vp_unit on public.vacancy_periods (unit_id, vacancy_start desc);
create index idx_vp_open on public.vacancy_periods (company_id, vacancy_end) where vacancy_end is null;

create trigger trg_vp_touch before update on public.vacancy_periods
  for each row execute function public.tg_touch_row();
create trigger trg_vp_guard before delete on public.vacancy_periods
  for each row execute function public.tg_guard_lease_row();
create trigger trg_vp_audit after insert or update or delete on public.vacancy_periods
  for each row execute function public.tg_audit_row();

-- ==================================================================
-- Reminder integration — reuse the existing operational reminder engine
-- ==================================================================
alter table public.operational_reminders
  drop constraint if exists operational_reminders_entity_type_check;
alter table public.operational_reminders
  add constraint operational_reminders_entity_type_check
  check (entity_type in (
    'operational_obligation','service_contract','insurance_policy',
    'utility_contract','tax_schedule',
    'lease','lease_review','lease_break','lease_guarantor'));

alter table public.operational_reminders
  drop constraint if exists operational_reminders_reason_check;
alter table public.operational_reminders
  add constraint operational_reminders_reason_check
  check (reason in (
    'obligation_due','contract_expiry','insurance_renewal','inspection_due',
    'licence_expiry','tax_deadline','utility_review',
    'lease_expiry','rent_review','break_notice','deposit_expiry',
    'guarantee_expiry','certificate_expiry'));

-- Named `lease_reminders` for the lease modules; there is only ONE
-- reminder store underneath (operational_reminders).
create or replace view public.lease_reminders with (security_invoker = on) as
select r.*, l.id as lease_id, l.code as lease_code, l.property_id
from public.operational_reminders r
left join public.leases l
  on l.id = case when r.entity_type = 'lease' then r.entity_id else null end
where r.entity_type in ('lease','lease_review','lease_break','lease_guarantor');

grant select on public.lease_reminders to authenticated;

-- ==================================================================
-- Derived views — every financial figure here is derived, never stored
-- ==================================================================

create or replace view public.v_lease_summary with (security_invoker = on) as
select
  l.id as lease_id,
  l.company_id,
  l.property_id,
  pr.name as property_name,
  l.code,
  l.title,
  l.lease_type,
  l.status,
  l.archived_at is not null as is_archived,
  l.primary_tenant_id,
  t.name as tenant_name,
  v.id as version_id,
  v.version_no,
  v.start_date,
  v.end_date,
  v.is_open_ended,
  v.currency,
  v.base_rent,
  v.service_charge,
  v.payment_frequency,
  v.deposit_amount,
  v.deposit_expiry_date,
  v.notice_period_days,
  v.review_cycle_months,
  v.indexation_type,
  (coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0)) as total_periodic_charge,
  case v.payment_frequency
    when 'monthly' then (coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0)) * 12
    when 'quarterly' then (coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0)) * 4
    when 'semiannual' then (coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0)) * 2
    else (coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0))
  end as annual_charge,
  u.unit_count,
  u.total_area_m2,
  nr.next_review_date,
  nb.next_break_date,
  nb.next_break_notice_deadline,
  case
    when v.end_date is null then null
    else greatest(0, (v.end_date - current_date))
  end as days_to_expiry
from public.leases l
left join public.properties pr on pr.id = l.property_id
left join public.tenants t on t.id = l.primary_tenant_id
left join public.lease_versions v on v.id = l.current_version_id
left join lateral (
  select count(*) as unit_count, sum(lu.area_m2) as total_area_m2
  from public.lease_units lu where lu.version_id = v.id
) u on true
left join lateral (
  select min(r.effective_date) as next_review_date
  from public.lease_reviews r
  where r.lease_id = l.id and r.status in ('scheduled','in_progress','proposed','agreed')
    and r.effective_date >= current_date
) nr on true
left join lateral (
  select min(b.window_start) as next_break_date,
         min(b.notice_deadline) as next_break_notice_deadline
  from public.lease_breaks b
  where b.lease_id = l.id and b.status in ('open','notice_served')
    and coalesce(b.window_end, b.window_start) >= current_date
) nb on true;

grant select on public.v_lease_summary to authenticated;

create or replace view public.v_rent_roll with (security_invoker = on) as
select
  lu.id as rent_roll_id,
  l.company_id,
  l.property_id,
  pr.name as property_name,
  lu.unit_id,
  pu.code as unit_code,
  pu.name as unit_name,
  lu.area_m2,
  l.id as lease_id,
  l.code as lease_code,
  l.status as lease_status,
  v.id as version_id,
  v.version_no,
  t.id as tenant_id,
  t.name as tenant_name,
  v.currency,
  round(coalesce(v.base_rent, 0) * coalesce(lu.apportionment_pct, 100) / 100.0, 2) as rent,
  round(coalesce(v.service_charge, 0) * coalesce(lu.apportionment_pct, 100) / 100.0, 2) as service_charge,
  v.payment_frequency,
  v.start_date,
  v.end_date,
  v.deposit_amount,
  nr.next_review_date,
  nb.next_break_date,
  oc.status as occupancy_status,
  case
    when v.end_date is null then null
    else greatest(0, (v.end_date - current_date))
  end as days_to_expiry,
  case v.payment_frequency
    when 'monthly' then 12 when 'quarterly' then 4
    when 'semiannual' then 2 else 1
  end * round((coalesce(v.base_rent, 0) + coalesce(v.service_charge, 0))
              * coalesce(lu.apportionment_pct, 100) / 100.0, 2) as annual_rent
from public.lease_units lu
join public.leases l on l.id = lu.lease_id
join public.lease_versions v on v.id = lu.version_id and v.id = l.current_version_id
left join public.properties pr on pr.id = l.property_id
left join public.property_units pu on pu.id = lu.unit_id
left join public.tenants t on t.id = l.primary_tenant_id
left join lateral (
  select min(r.effective_date) as next_review_date
  from public.lease_reviews r
  where r.lease_id = l.id and r.status in ('scheduled','in_progress','proposed','agreed')
    and r.effective_date >= current_date
) nr on true
left join lateral (
  select min(b.window_start) as next_break_date
  from public.lease_breaks b
  where b.lease_id = l.id and b.status in ('open','notice_served')
    and coalesce(b.window_end, b.window_start) >= current_date
) nb on true
left join lateral (
  select o.status from public.occupancy_history o
  where o.unit_id = lu.unit_id and o.period_end is null
  order by o.period_start desc limit 1
) oc on true
where l.status in ('active','expiring','renewed');

grant select on public.v_rent_roll to authenticated;

create or replace view public.v_unit_occupancy with (security_invoker = on) as
select
  pu.company_id,
  pu.property_id,
  pr.name as property_name,
  pu.id as unit_id,
  pu.code as unit_code,
  pu.name as unit_name,
  pu.area_m2,
  coalesce(o.status, 'vacant') as occupancy_status,
  o.period_start as status_since,
  o.lease_id,
  o.tenant_id,
  t.name as tenant_name,
  vp.id as vacancy_id,
  vp.vacancy_start,
  vp.marketing_status,
  vp.target_rent,
  vp.target_occupation_date
from public.property_units pu
left join public.properties pr on pr.id = pu.property_id
left join lateral (
  select oh.* from public.occupancy_history oh
  where oh.unit_id = pu.id and oh.period_end is null
  order by oh.period_start desc limit 1
) o on true
left join public.tenants t on t.id = o.tenant_id
left join lateral (
  select v.* from public.vacancy_periods v
  where v.unit_id = pu.id and v.vacancy_end is null
  order by v.vacancy_start desc limit 1
) vp on true
where pu.deleted_at is null;

grant select on public.v_unit_occupancy to authenticated;

create or replace view public.v_occupancy_metrics with (security_invoker = on) as
with units as (
  select company_id, unit_id, area_m2, occupancy_status from public.v_unit_occupancy
),
rr as (
  select company_id, annual_rent, end_date, tenant_id, tenant_name
  from public.v_rent_roll
)
select
  u.company_id,
  count(*) as unit_count,
  count(*) filter (where u.occupancy_status = 'occupied') as occupied_units,
  count(*) filter (where u.occupancy_status = 'vacant') as vacant_units,
  coalesce(sum(u.area_m2), 0) as total_area_m2,
  coalesce(sum(u.area_m2) filter (where u.occupancy_status = 'occupied'), 0) as occupied_area_m2,
  round(100.0 * count(*) filter (where u.occupancy_status = 'occupied')
        / nullif(count(*), 0), 2) as occupancy_pct,
  round(100.0 * count(*) filter (where u.occupancy_status <> 'occupied')
        / nullif(count(*), 0), 2) as vacancy_pct,
  (select coalesce(sum(annual_rent), 0) from rr where rr.company_id = u.company_id) as contracted_annual_rent,
  (select round(sum(annual_rent * greatest(0, (end_date - current_date)) / 365.25)
                / nullif(sum(annual_rent), 0), 2)
     from rr where rr.company_id = u.company_id and rr.end_date is not null) as wault_years
from units u
group by u.company_id;

grant select on public.v_occupancy_metrics to authenticated;

create or replace view public.v_lease_expiry_profile with (security_invoker = on) as
select
  s.company_id,
  extract(year from s.end_date)::int as expiry_year,
  count(*) as lease_count,
  sum(s.annual_charge) as annual_rent_expiring
from public.v_lease_summary s
where s.end_date is not null and s.status in ('active','expiring','renewed')
group by s.company_id, extract(year from s.end_date);

grant select on public.v_lease_expiry_profile to authenticated;

create or replace view public.v_tenant_concentration with (security_invoker = on) as
select
  r.company_id,
  r.tenant_id,
  r.tenant_name,
  count(distinct r.lease_id) as lease_count,
  count(distinct r.unit_id) as unit_count,
  sum(r.annual_rent) as annual_rent,
  round(100.0 * sum(r.annual_rent)
        / nullif(sum(sum(r.annual_rent)) over (partition by r.company_id), 0), 2) as rent_share_pct
from public.v_rent_roll r
group by r.company_id, r.tenant_id, r.tenant_name;

grant select on public.v_tenant_concentration to authenticated;

-- ==================================================================
-- RPCs
-- ==================================================================

create or replace function public.lease_assert_record(_company_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_record_company(_company_id) then
    raise exception 'Not allowed to record data for this company' using errcode = '42501';
  end if;
end;
$$;

-- ----------------------------------------------------------- tenants
create or replace function public.upsert_tenant_record(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id','')::uuid; v_company uuid := (p->>'company_id')::uuid;
begin
  perform public.lease_assert_record(v_company);
  if v_id is null then
    insert into public.tenants (company_id, code, name, legal_name, trading_name, tax_number,
      registration_number, email, phone, website, address, sector, tenant_type, status, notes)
    values (v_company, nullif(p->>'code',''), p->>'name', nullif(p->>'legal_name',''),
      nullif(p->>'trading_name',''), nullif(p->>'tax_number',''), nullif(p->>'registration_number',''),
      nullif(p->>'email',''), nullif(p->>'phone',''), nullif(p->>'website',''), nullif(p->>'address',''),
      nullif(p->>'sector',''), coalesce(nullif(p->>'tenant_type',''),'company'),
      coalesce(nullif(p->>'status',''),'active'), nullif(p->>'notes',''))
    returning id into v_id;
  else
    update public.tenants set
      code = coalesce(nullif(p->>'code',''), code),
      name = coalesce(nullif(p->>'name',''), name),
      legal_name = nullif(p->>'legal_name',''),
      trading_name = nullif(p->>'trading_name',''),
      tax_number = nullif(p->>'tax_number',''),
      registration_number = nullif(p->>'registration_number',''),
      email = nullif(p->>'email',''),
      phone = nullif(p->>'phone',''),
      website = nullif(p->>'website',''),
      address = nullif(p->>'address',''),
      sector = nullif(p->>'sector',''),
      tenant_type = coalesce(nullif(p->>'tenant_type',''), tenant_type),
      status = coalesce(nullif(p->>'status',''), status),
      notes = nullif(p->>'notes',''),
      updated_by = auth.uid()
    where id = v_id and company_id = v_company;
  end if;
  return v_id;
end;
$$;

create or replace function public.upsert_tenant_contact(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id','')::uuid; v_company uuid := (p->>'company_id')::uuid;
begin
  perform public.lease_assert_record(v_company);
  if v_id is null then
    insert into public.tenant_contacts (company_id, tenant_id, name, role, email, phone, is_primary, notes)
    values (v_company, (p->>'tenant_id')::uuid, p->>'name', nullif(p->>'role',''),
      nullif(p->>'email',''), nullif(p->>'phone',''), coalesce((p->>'is_primary')::boolean, false),
      nullif(p->>'notes',''))
    returning id into v_id;
  else
    update public.tenant_contacts set
      name = coalesce(nullif(p->>'name',''), name),
      role = nullif(p->>'role',''), email = nullif(p->>'email',''),
      phone = nullif(p->>'phone',''),
      is_primary = coalesce((p->>'is_primary')::boolean, is_primary),
      notes = nullif(p->>'notes',''), archived_at = nullif(p->>'archived_at','')::timestamptz,
      updated_by = auth.uid()
    where id = v_id and company_id = v_company;
  end if;
  return v_id;
end;
$$;

create or replace function public.archive_tenant_record(p_tenant_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  select company_id into v_company from public.tenants where id = p_tenant_id;
  perform public.lease_assert_record(v_company);
  if exists (select 1 from public.leases where primary_tenant_id = p_tenant_id
             and status in ('active','expiring','negotiation','approved')) then
    raise exception 'Tenant has live leases and cannot be archived' using errcode = 'check_violation';
  end if;
  update public.tenants
     set archived_at = now(), archive_reason = p_reason, status = 'former', updated_by = auth.uid()
   where id = p_tenant_id;
end;
$$;

-- ------------------------------------------------------------ leases
create or replace function public.create_lease(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid := (p->>'company_id')::uuid; v_lease uuid; v_version uuid;
begin
  perform public.lease_assert_record(v_company);
  insert into public.leases (company_id, property_id, code, title, primary_tenant_id,
    lease_type, status, commencement_date, notes)
  values (v_company, (p->>'property_id')::uuid, nullif(p->>'code',''), nullif(p->>'title',''),
    nullif(p->>'primary_tenant_id','')::uuid, coalesce(nullif(p->>'lease_type',''),'commercial'),
    coalesce(nullif(p->>'status',''),'draft'), nullif(p->>'start_date','')::date, nullif(p->>'notes',''))
  returning id into v_lease;

  insert into public.lease_versions (company_id, lease_id, version_no, version_reason, status,
    effective_from, start_date, end_date, is_open_ended, currency, base_rent, service_charge,
    payment_frequency, payment_day, vat_applicable, indexation_type, indexation_index,
    indexation_month, indexation_pct, review_cycle_months, notice_period_days,
    deposit_amount, deposit_reference, deposit_expiry_date, notes)
  values (v_company, v_lease, 1, 'origination', 'draft',
    coalesce(nullif(p->>'start_date','')::date, current_date),
    coalesce(nullif(p->>'start_date','')::date, current_date),
    nullif(p->>'end_date','')::date,
    coalesce((p->>'is_open_ended')::boolean, false),
    coalesce(nullif(p->>'currency',''),'EUR'),
    coalesce((p->>'base_rent')::numeric, 0), coalesce((p->>'service_charge')::numeric, 0),
    coalesce(nullif(p->>'payment_frequency',''),'monthly'), (p->>'payment_day')::int,
    coalesce((p->>'vat_applicable')::boolean, false),
    coalesce(nullif(p->>'indexation_type',''),'none'), nullif(p->>'indexation_index',''),
    (p->>'indexation_month')::int, (p->>'indexation_pct')::numeric,
    (p->>'review_cycle_months')::int, (p->>'notice_period_days')::int,
    coalesce((p->>'deposit_amount')::numeric, 0), nullif(p->>'deposit_reference',''),
    nullif(p->>'deposit_expiry_date','')::date, nullif(p->>'version_notes',''))
  returning id into v_version;

  update public.leases set current_version_id = v_version where id = v_lease;

  if nullif(p->>'primary_tenant_id','') is not null then
    insert into public.lease_tenants (company_id, lease_id, version_id, tenant_id, is_primary, share_pct)
    values (v_company, v_lease, v_version, (p->>'primary_tenant_id')::uuid, true, 100);
  end if;

  return v_lease;
end;
$$;

create or replace function public.update_lease(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  select company_id into v_company from public.leases where id = (p->>'lease_id')::uuid;
  perform public.lease_assert_record(v_company);
  update public.leases set
    code = coalesce(nullif(p->>'code',''), code),
    title = coalesce(nullif(p->>'title',''), title),
    lease_type = coalesce(nullif(p->>'lease_type',''), lease_type),
    status = coalesce(nullif(p->>'status',''), status),
    primary_tenant_id = coalesce(nullif(p->>'primary_tenant_id','')::uuid, primary_tenant_id),
    notes = coalesce(nullif(p->>'notes',''), notes),
    updated_by = auth.uid()
  where id = (p->>'lease_id')::uuid;
end;
$$;

create or replace function public.update_lease_version(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from public.lease_versions where id = (p->>'version_id')::uuid;
  if v is null then raise exception 'Lease version not found'; end if;
  perform public.lease_assert_record(v.company_id);
  if v.status <> 'draft' then
    raise exception 'Only draft lease versions can be edited' using errcode = 'check_violation';
  end if;
  update public.lease_versions set
    effective_from = coalesce(nullif(p->>'effective_from','')::date, effective_from),
    start_date = coalesce(nullif(p->>'start_date','')::date, start_date),
    end_date = nullif(p->>'end_date','')::date,
    is_open_ended = coalesce((p->>'is_open_ended')::boolean, is_open_ended),
    base_rent = coalesce((p->>'base_rent')::numeric, base_rent),
    service_charge = coalesce((p->>'service_charge')::numeric, service_charge),
    payment_frequency = coalesce(nullif(p->>'payment_frequency',''), payment_frequency),
    payment_day = coalesce((p->>'payment_day')::int, payment_day),
    vat_applicable = coalesce((p->>'vat_applicable')::boolean, vat_applicable),
    indexation_type = coalesce(nullif(p->>'indexation_type',''), indexation_type),
    indexation_index = nullif(p->>'indexation_index',''),
    indexation_month = (p->>'indexation_month')::int,
    indexation_pct = (p->>'indexation_pct')::numeric,
    review_cycle_months = (p->>'review_cycle_months')::int,
    notice_period_days = (p->>'notice_period_days')::int,
    deposit_amount = coalesce((p->>'deposit_amount')::numeric, deposit_amount),
    deposit_reference = nullif(p->>'deposit_reference',''),
    deposit_expiry_date = nullif(p->>'deposit_expiry_date','')::date,
    notes = nullif(p->>'notes',''),
    updated_by = auth.uid()
  where id = v.id;
end;
$$;

create or replace function public.set_lease_units(p_version_id uuid, p_units jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v record; u jsonb;
begin
  select lv.*, l.property_id as lease_property into v
  from public.lease_versions lv join public.leases l on l.id = lv.lease_id
  where lv.id = p_version_id;
  if v is null then raise exception 'Lease version not found'; end if;
  perform public.lease_assert_record(v.company_id);
  if v.status <> 'draft' then
    raise exception 'The demise of an activated lease version is immutable' using errcode = 'check_violation';
  end if;
  delete from public.lease_units where version_id = p_version_id;
  for u in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb)) loop
    insert into public.lease_units (company_id, lease_id, version_id, property_id, unit_id,
      demise_label, area_m2, apportionment_pct, notes)
    values (v.company_id, v.lease_id, p_version_id, v.lease_property,
      nullif(u->>'unit_id','')::uuid, nullif(u->>'demise_label',''),
      (u->>'area_m2')::numeric, coalesce((u->>'apportionment_pct')::numeric, 100),
      nullif(u->>'notes',''));
  end loop;
end;
$$;

create or replace function public.set_lease_tenants(p_version_id uuid, p_tenants jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v record; t jsonb;
begin
  select * into v from public.lease_versions where id = p_version_id;
  if v is null then raise exception 'Lease version not found'; end if;
  perform public.lease_assert_record(v.company_id);
  if v.status <> 'draft' then
    raise exception 'Tenant assignments of an activated lease version are immutable'
      using errcode = 'check_violation';
  end if;
  delete from public.lease_tenants where version_id = p_version_id;
  for t in select * from jsonb_array_elements(coalesce(p_tenants, '[]'::jsonb)) loop
    insert into public.lease_tenants (company_id, lease_id, version_id, tenant_id, is_primary, share_pct, role)
    values (v.company_id, v.lease_id, p_version_id, (t->>'tenant_id')::uuid,
      coalesce((t->>'is_primary')::boolean, false), (t->>'share_pct')::numeric,
      coalesce(nullif(t->>'role',''),'tenant'));
  end loop;
  update public.leases set primary_tenant_id = coalesce(
    (select tenant_id from public.lease_tenants where version_id = p_version_id and is_primary order by created_at limit 1),
    primary_tenant_id)
  where id = v.lease_id;
end;
$$;

create or replace function public.set_lease_charges(p_version_id uuid, p_charges jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v record; c jsonb;
begin
  select * into v from public.lease_versions where id = p_version_id;
  if v is null then raise exception 'Lease version not found'; end if;
  perform public.lease_assert_record(v.company_id);
  if v.status <> 'draft' then
    raise exception 'The charge schedule of an activated lease version is immutable'
      using errcode = 'check_violation';
  end if;
  delete from public.lease_charges where version_id = p_version_id;
  for c in select * from jsonb_array_elements(coalesce(p_charges, '[]'::jsonb)) loop
    insert into public.lease_charges (company_id, lease_id, version_id, charge_type, label,
      amount, currency, frequency, vat_applicable, vat_rate, start_date, end_date, notes)
    values (v.company_id, v.lease_id, p_version_id,
      coalesce(nullif(c->>'charge_type',''),'base_rent'), nullif(c->>'label',''),
      coalesce((c->>'amount')::numeric, 0), coalesce(nullif(c->>'currency',''), v.currency),
      coalesce(nullif(c->>'frequency',''),'monthly'),
      coalesce((c->>'vat_applicable')::boolean, false), (c->>'vat_rate')::numeric,
      nullif(c->>'start_date','')::date, nullif(c->>'end_date','')::date, nullif(c->>'notes',''));
  end loop;
end;
$$;

create or replace function public.set_unit_occupancy(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid := (p->>'company_id')::uuid;
        v_unit uuid := nullif(p->>'unit_id','')::uuid;
        v_status text := p->>'status';
        v_from date := coalesce(nullif(p->>'period_start','')::date, current_date);
        v_id uuid;
begin
  perform public.lease_assert_record(v_company);
  update public.occupancy_history
     set period_end = greatest(period_start, v_from - 1), updated_by = auth.uid()
   where unit_id = v_unit and period_end is null and company_id = v_company;

  insert into public.occupancy_history (company_id, property_id, unit_id, status, lease_id,
    tenant_id, period_start, reason, notes)
  values (v_company, (p->>'property_id')::uuid, v_unit, v_status,
    nullif(p->>'lease_id','')::uuid, nullif(p->>'tenant_id','')::uuid, v_from,
    nullif(p->>'reason',''), nullif(p->>'notes',''))
  returning id into v_id;

  if v_status = 'occupied' then
    update public.vacancy_periods
       set vacancy_end = greatest(vacancy_start, v_from - 1), updated_by = auth.uid()
     where unit_id = v_unit and vacancy_end is null and company_id = v_company;
    update public.property_units set status = 'rented', updated_by = auth.uid() where id = v_unit;
  elsif v_status in ('vacant','reserved','under_offer') then
    if not exists (select 1 from public.vacancy_periods
                   where unit_id = v_unit and vacancy_end is null and company_id = v_company) then
      insert into public.vacancy_periods (company_id, property_id, unit_id, vacancy_start, reason,
        marketing_status, target_rent, target_occupation_date, notes)
      values (v_company, (p->>'property_id')::uuid, v_unit, v_from,
        coalesce(nullif(p->>'vacancy_reason',''),'lease_ended'),
        coalesce(nullif(p->>'marketing_status',''),'not_marketed'),
        (p->>'target_rent')::numeric, nullif(p->>'target_occupation_date','')::date,
        nullif(p->>'notes',''));
    end if;
    update public.property_units set status = 'available', updated_by = auth.uid() where id = v_unit;
  elsif v_status = 'under_refurbishment' then
    update public.property_units set status = 'under_works', updated_by = auth.uid() where id = v_unit;
  else
    update public.property_units set status = 'unavailable', updated_by = auth.uid() where id = v_unit;
  end if;

  return v_id;
end;
$$;

create or replace function public.update_vacancy_period(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  select company_id into v_company from public.vacancy_periods where id = (p->>'id')::uuid;
  perform public.lease_assert_record(v_company);
  update public.vacancy_periods set
    marketing_status = coalesce(nullif(p->>'marketing_status',''), marketing_status),
    reason = coalesce(nullif(p->>'reason',''), reason),
    target_rent = coalesce((p->>'target_rent')::numeric, target_rent),
    target_occupation_date = coalesce(nullif(p->>'target_occupation_date','')::date, target_occupation_date),
    vacancy_end = coalesce(nullif(p->>'vacancy_end','')::date, vacancy_end),
    notes = coalesce(nullif(p->>'notes',''), notes),
    updated_by = auth.uid()
  where id = (p->>'id')::uuid;
end;
$$;

create or replace function public.activate_lease_version(p_version_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v record; lu record;
begin
  select * into v from public.lease_versions where id = p_version_id;
  if v is null then raise exception 'Lease version not found'; end if;
  perform public.lease_assert_record(v.company_id);
  if v.status <> 'draft' then
    raise exception 'Only a draft lease version can be activated' using errcode = 'check_violation';
  end if;

  update public.lease_versions
     set status = 'superseded', superseded_at = now(),
         effective_to = least(coalesce(effective_to, v.effective_from - 1), v.effective_from - 1)
   where lease_id = v.lease_id and id <> p_version_id and status = 'active';

  update public.lease_versions
     set status = 'active', activated_at = now(), activated_by = auth.uid()
   where id = p_version_id;

  update public.leases
     set current_version_id = p_version_id,
         status = case when status in ('draft','negotiation','approved') then 'active' else status end,
         commencement_date = coalesce(commencement_date, v.start_date),
         updated_by = auth.uid()
   where id = v.lease_id;

  for lu in select * from public.lease_units where version_id = p_version_id and unit_id is not null loop
    perform public.set_unit_occupancy(jsonb_build_object(
      'company_id', v.company_id, 'property_id', lu.property_id, 'unit_id', lu.unit_id,
      'status', 'occupied', 'lease_id', v.lease_id,
      'tenant_id', (select tenant_id from public.lease_tenants
                    where version_id = p_version_id order by is_primary desc limit 1),
      'period_start', to_char(v.start_date, 'YYYY-MM-DD'), 'reason', 'lease_activated'));
  end loop;
end;
$$;

create or replace function public.create_lease_version(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_lease uuid := (p->>'lease_id')::uuid; src record; v_new uuid; v_no int;
begin
  select lv.* into src from public.lease_versions lv
   where lv.lease_id = v_lease order by lv.version_no desc limit 1;
  if src is null then raise exception 'Lease has no version to copy'; end if;
  perform public.lease_assert_record(src.company_id);
  if src.status = 'draft' then
    raise exception 'A draft version already exists for this lease' using errcode = 'check_violation';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_no from public.lease_versions where lease_id = v_lease;

  insert into public.lease_versions (company_id, lease_id, version_no, version_reason, status,
    effective_from, start_date, end_date, is_open_ended, currency, base_rent, service_charge,
    payment_frequency, payment_day, vat_applicable, indexation_type, indexation_index,
    indexation_month, indexation_pct, review_cycle_months, notice_period_days,
    deposit_amount, deposit_reference, deposit_expiry_date, notes)
  values (src.company_id, v_lease, v_no,
    coalesce(nullif(p->>'version_reason',''),'renewal'), 'draft',
    coalesce(nullif(p->>'effective_from','')::date, current_date),
    coalesce(nullif(p->>'start_date','')::date, nullif(p->>'effective_from','')::date, current_date),
    nullif(p->>'end_date','')::date,
    coalesce((p->>'is_open_ended')::boolean, src.is_open_ended),
    src.currency,
    coalesce((p->>'base_rent')::numeric, src.base_rent),
    coalesce((p->>'service_charge')::numeric, src.service_charge),
    coalesce(nullif(p->>'payment_frequency',''), src.payment_frequency),
    coalesce((p->>'payment_day')::int, src.payment_day),
    coalesce((p->>'vat_applicable')::boolean, src.vat_applicable),
    coalesce(nullif(p->>'indexation_type',''), src.indexation_type),
    coalesce(nullif(p->>'indexation_index',''), src.indexation_index),
    coalesce((p->>'indexation_month')::int, src.indexation_month),
    coalesce((p->>'indexation_pct')::numeric, src.indexation_pct),
    coalesce((p->>'review_cycle_months')::int, src.review_cycle_months),
    coalesce((p->>'notice_period_days')::int, src.notice_period_days),
    coalesce((p->>'deposit_amount')::numeric, src.deposit_amount),
    src.deposit_reference, src.deposit_expiry_date, nullif(p->>'notes',''))
  returning id into v_new;

  insert into public.lease_units (company_id, lease_id, version_id, property_id, unit_id,
    demise_label, area_m2, apportionment_pct, notes)
  select company_id, lease_id, v_new, property_id, unit_id, demise_label, area_m2,
         apportionment_pct, notes
    from public.lease_units where version_id = src.id;

  insert into public.lease_tenants (company_id, lease_id, version_id, tenant_id, is_primary, share_pct, role)
  select company_id, lease_id, v_new, tenant_id, is_primary, share_pct, role
    from public.lease_tenants where version_id = src.id;

  insert into public.lease_charges (company_id, lease_id, version_id, charge_type, label, amount,
    currency, frequency, vat_applicable, vat_rate, start_date, end_date, notes)
  select company_id, lease_id, v_new, charge_type, label, amount, currency, frequency,
         vat_applicable, vat_rate, start_date, end_date, notes
    from public.lease_charges where version_id = src.id;

  if coalesce(nullif(p->>'version_reason',''),'renewal') = 'renewal' then
    update public.leases set status = 'renewed', updated_by = auth.uid()
     where id = v_lease and status in ('active','expiring');
  end if;

  return v_new;
end;
$$;

create or replace function public.upsert_lease_review(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id','')::uuid; v_company uuid;
begin
  select company_id into v_company from public.leases where id = (p->>'lease_id')::uuid;
  perform public.lease_assert_record(v_company);
  if v_id is null then
    insert into public.lease_reviews (company_id, lease_id, version_id, review_type, review_date,
      effective_date, index_name, index_value, index_pct, current_rent, proposed_rent, status, notes)
    values (v_company, (p->>'lease_id')::uuid,
      (select current_version_id from public.leases where id = (p->>'lease_id')::uuid),
      coalesce(nullif(p->>'review_type',''),'scheduled'), (p->>'review_date')::date,
      (p->>'effective_date')::date, nullif(p->>'index_name',''), (p->>'index_value')::numeric,
      (p->>'index_pct')::numeric, (p->>'current_rent')::numeric, (p->>'proposed_rent')::numeric,
      coalesce(nullif(p->>'status',''),'scheduled'), nullif(p->>'notes',''))
    returning id into v_id;
  else
    update public.lease_reviews set
      review_type = coalesce(nullif(p->>'review_type',''), review_type),
      review_date = coalesce(nullif(p->>'review_date','')::date, review_date),
      effective_date = coalesce(nullif(p->>'effective_date','')::date, effective_date),
      index_name = nullif(p->>'index_name',''),
      index_value = (p->>'index_value')::numeric,
      index_pct = (p->>'index_pct')::numeric,
      proposed_rent = (p->>'proposed_rent')::numeric,
      agreed_rent = (p->>'agreed_rent')::numeric,
      status = coalesce(nullif(p->>'status',''), status),
      notes = nullif(p->>'notes',''),
      updated_by = auth.uid()
    where id = v_id and company_id = v_company;
  end if;
  return v_id;
end;
$$;

-- Applying a review NEVER changes commitments or cash flow: it creates a
-- new draft lease version carrying the agreed rent.
create or replace function public.apply_lease_review(p_review_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; v_new uuid;
begin
  select * into r from public.lease_reviews where id = p_review_id;
  if r is null then raise exception 'Rent review not found'; end if;
  perform public.lease_assert_record(r.company_id);
  if r.status = 'applied' then raise exception 'Rent review already applied'; end if;
  if r.agreed_rent is null then
    raise exception 'An agreed rent is required before applying a review' using errcode = 'check_violation';
  end if;

  v_new := public.create_lease_version(jsonb_build_object(
    'lease_id', r.lease_id, 'version_reason', 'rent_review',
    'effective_from', to_char(r.effective_date, 'YYYY-MM-DD'),
    'base_rent', r.agreed_rent));

  update public.lease_reviews
     set status = 'applied', applied_version_id = v_new, applied_at = now(), updated_by = auth.uid()
   where id = p_review_id;

  return v_new;
end;
$$;

create or replace function public.upsert_lease_break(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id','')::uuid; v_company uuid;
begin
  select company_id into v_company from public.leases where id = (p->>'lease_id')::uuid;
  perform public.lease_assert_record(v_company);
  if v_id is null then
    insert into public.lease_breaks (company_id, lease_id, version_id, break_type, window_start,
      window_end, notice_days, conditions, notes)
    values (v_company, (p->>'lease_id')::uuid,
      (select current_version_id from public.leases where id = (p->>'lease_id')::uuid),
      coalesce(nullif(p->>'break_type',''),'tenant'), (p->>'window_start')::date,
      nullif(p->>'window_end','')::date, coalesce((p->>'notice_days')::int, 180),
      nullif(p->>'conditions',''), nullif(p->>'notes',''))
    returning id into v_id;
  else
    update public.lease_breaks set
      break_type = coalesce(nullif(p->>'break_type',''), break_type),
      window_start = coalesce(nullif(p->>'window_start','')::date, window_start),
      window_end = nullif(p->>'window_end','')::date,
      notice_days = coalesce((p->>'notice_days')::int, notice_days),
      status = coalesce(nullif(p->>'status',''), status),
      conditions = nullif(p->>'conditions',''),
      notes = nullif(p->>'notes',''),
      updated_by = auth.uid()
    where id = v_id and company_id = v_company;
  end if;
  return v_id;
end;
$$;

create or replace function public.record_lease_notice(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from public.leases where id = (p->>'lease_id')::uuid;
  perform public.lease_assert_record(v_company);
  insert into public.lease_notices (company_id, lease_id, notice_type, served_by, served_on,
    effective_date, reference, summary, status)
  values (v_company, (p->>'lease_id')::uuid, p->>'notice_type',
    coalesce(nullif(p->>'served_by',''),'landlord'),
    coalesce(nullif(p->>'served_on','')::date, current_date),
    nullif(p->>'effective_date','')::date, nullif(p->>'reference',''),
    nullif(p->>'summary',''), coalesce(nullif(p->>'status',''),'served'))
  returning id into v_id;

  if (p->>'notice_type') = 'break' and nullif(p->>'break_id','') is not null then
    update public.lease_breaks
       set status = 'notice_served', exercised_on = coalesce(nullif(p->>'served_on','')::date, current_date),
           effective_date = nullif(p->>'effective_date','')::date, updated_by = auth.uid()
     where id = (p->>'break_id')::uuid;
  end if;

  return v_id;
end;
$$;

create or replace function public.terminate_lease(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v record; lu record;
begin
  select * into v from public.leases where id = (p->>'lease_id')::uuid;
  if v is null then raise exception 'Lease not found'; end if;
  perform public.lease_assert_record(v.company_id);

  update public.leases
     set status = coalesce(nullif(p->>'status',''),'terminated'),
         termination_date = coalesce(nullif(p->>'termination_date','')::date, current_date),
         termination_reason = nullif(p->>'reason',''), updated_by = auth.uid()
   where id = v.id;

  for lu in select distinct unit_id, property_id from public.lease_units
             where version_id = v.current_version_id and unit_id is not null loop
    perform public.set_unit_occupancy(jsonb_build_object(
      'company_id', v.company_id, 'property_id', lu.property_id, 'unit_id', lu.unit_id,
      'status', 'vacant', 'period_start',
      to_char(coalesce(nullif(p->>'termination_date','')::date, current_date) + 1, 'YYYY-MM-DD'),
      'reason', coalesce(nullif(p->>'reason',''),'lease_ended'),
      'vacancy_reason', case when (p->>'status') = 'terminated' then 'termination' else 'lease_ended' end));
  end loop;
end;
$$;

create or replace function public.archive_lease(p_lease_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid; v_status text;
begin
  select company_id, status into v_company, v_status from public.leases where id = p_lease_id;
  perform public.lease_assert_record(v_company);
  if v_status in ('active','expiring') then
    raise exception 'Terminate or expire the lease before archiving it' using errcode = 'check_violation';
  end if;
  update public.leases
     set archived_at = now(), archive_reason = p_reason, status = 'archived', updated_by = auth.uid()
   where id = p_lease_id;
end;
$$;

-- Reminder generation into the SHARED reminder engine.
create or replace function public.generate_lease_reminders(p_company_id uuid, p_horizon_days integer default 365)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_horizon date := current_date + p_horizon_days;
begin
  perform public.lease_assert_record(p_company_id);

  -- lease expiry
  insert into public.operational_reminders (company_id, entity_type, entity_id, reason, remind_on,
    due_on, severity, title)
  select l.company_id, 'lease', l.id, 'lease_expiry',
         greatest(current_date, v.end_date - (coalesce(v.notice_period_days, 90) || ' days')::interval)::date,
         v.end_date,
         case when v.end_date - current_date <= 90 then 'high' else 'normal' end,
         'Lease expiry — ' || coalesce(l.code, l.title, 'lease')
    from public.leases l
    join public.lease_versions v on v.id = l.current_version_id
   where l.company_id = p_company_id and l.archived_at is null
     and l.status in ('active','expiring') and v.end_date is not null
     and v.end_date <= v_horizon
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_count = row_count;

  -- rent reviews
  insert into public.operational_reminders (company_id, entity_type, entity_id, reason, remind_on,
    due_on, severity, title)
  select r.company_id, 'lease_review', r.id, 'rent_review',
         greatest(current_date, r.review_date - interval '60 days')::date,
         r.effective_date, 'normal',
         'Rent review — ' || coalesce(l.code, l.title, 'lease')
    from public.lease_reviews r join public.leases l on l.id = r.lease_id
   where r.company_id = p_company_id and r.status in ('scheduled','in_progress','proposed')
     and r.effective_date <= v_horizon
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;

  -- break notices
  insert into public.operational_reminders (company_id, entity_type, entity_id, reason, remind_on,
    due_on, severity, title)
  select b.company_id, 'lease_break', b.id, 'break_notice',
         greatest(current_date, b.notice_deadline - interval '30 days')::date,
         b.notice_deadline, 'high',
         'Break notice deadline — ' || coalesce(l.code, l.title, 'lease')
    from public.lease_breaks b join public.leases l on l.id = b.lease_id
   where b.company_id = p_company_id and b.status = 'open'
     and b.notice_deadline is not null and b.notice_deadline <= v_horizon
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;

  -- deposit expiry
  insert into public.operational_reminders (company_id, entity_type, entity_id, reason, remind_on,
    due_on, severity, title)
  select l.company_id, 'lease', l.id, 'deposit_expiry',
         greatest(current_date, v.deposit_expiry_date - interval '45 days')::date,
         v.deposit_expiry_date, 'normal',
         'Deposit expiry — ' || coalesce(l.code, l.title, 'lease')
    from public.leases l join public.lease_versions v on v.id = l.current_version_id
   where l.company_id = p_company_id and v.deposit_expiry_date is not null
     and v.deposit_expiry_date <= v_horizon and l.archived_at is null
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;

  -- guarantee expiry
  insert into public.operational_reminders (company_id, entity_type, entity_id, reason, remind_on,
    due_on, severity, title)
  select g.company_id, 'lease_guarantor', g.id, 'guarantee_expiry',
         greatest(current_date, g.expiry_date - interval '60 days')::date,
         g.expiry_date, 'normal',
         'Guarantee expiry — ' || g.name
    from public.lease_guarantors g
   where g.company_id = p_company_id and g.status = 'active'
     and g.expiry_date is not null and g.expiry_date <= v_horizon
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;

  return v_count;
end;
$$;

-- --------------------------------------------------- privilege lockdown
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'lease_assert_record','upsert_tenant_record','upsert_tenant_contact',
         'archive_tenant_record','create_lease','update_lease','update_lease_version',
         'set_lease_units','set_lease_tenants','set_lease_charges','set_unit_occupancy',
         'update_vacancy_period','activate_lease_version','create_lease_version',
         'upsert_lease_review','apply_lease_review','upsert_lease_break',
         'record_lease_notice','terminate_lease','archive_lease','generate_lease_reminders',
         'tg_guard_lease_row','tg_lease_version_immutable','tg_lease_review_immutable',
         'tg_lease_break_deadline')
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if r.sig not like 'tg_%' then
      execute format('grant execute on function %s to authenticated', r.sig);
    end if;
  end loop;
end $$;

-- ==================================================================
-- Search index — leases become first-class; tenants now have a route
-- ==================================================================
CREATE OR REPLACE VIEW public.v_search_index WITH (security_invoker = on) AS
SELECT p.company_id, 'property'::text AS entity_type, p.id AS entity_id,
       coalesce(p.code || ' — ', '') || p.name AS title,
       concat_ws(', ', p.city, p.district) AS subtitle,
       concat_ws(' ', p.code, p.name, p.address_line1, p.address_line2, p.city, p.district,
                 p.parish, p.matrix_article, p.land_registry_ref, p.notes) AS search_text,
       p.acquisition_date::timestamptz AS occurred_at,
       '/properties/' || p.id AS url_path,
       p.status::text AS status,
       false AS is_archived,
       p.id AS property_id,
       jsonb_build_object('city', p.city) AS metadata
FROM public.properties p WHERE p.deleted_at IS NULL

UNION ALL
SELECT d.company_id, 'document', d.id, d.title,
       concat_ws(' · ', d.category, d.subcategory),
       concat_ws(' ', d.title, d.category, d.subcategory, d.original_filename,
                 array_to_string(d.tags, ' '), d.ocr_text, d.ai_summary, d.notes),
       d.issue_date::timestamptz,
       CASE WHEN dl.property_id IS NOT NULL
            THEN '/properties/' || dl.property_id || '?tab=documents&record=' || d.id
            ELSE '/bookkeeping?tab=purchases&record=' || d.id END,
       d.status::text, false, dl.property_id,
       jsonb_build_object('category', d.category)
FROM public.documents d
LEFT JOIN LATERAL (
  SELECT l.entity_id AS property_id
  FROM public.document_links l
  WHERE l.document_id = d.id AND l.entity_type = 'property'
  ORDER BY l.created_at
  LIMIT 1
) dl ON true
WHERE d.deleted_at IS NULL

UNION ALL
SELECT f.company_id, 'financing', f.id, f.lender || coalesce(' — ' || f.reference, ''),
       f.type, concat_ws(' ', f.lender, f.reference, f.code, f.type, f.index_name, f.notes),
       f.start_date::timestamptz, '/financing/' || f.id,
       f.status::text, false, f.property_id, '{}'::jsonb
FROM public.financing_agreements f WHERE f.deleted_at IS NULL

UNION ALL
-- Tenants now have their own workspace
SELECT t.company_id, 'tenant', t.id, t.name,
       concat_ws(' · ', t.trading_name, t.tax_number),
       concat_ws(' ', t.code, t.name, t.legal_name, t.trading_name, t.tax_number,
                 t.registration_number, t.email, t.phone, t.address, t.sector, t.notes),
       t.created_at,
       '/tenants/' || t.id,
       t.status::text, t.archived_at IS NOT NULL, ta.property_id, '{}'::jsonb
FROM public.tenants t
LEFT JOIN LATERAL (
  SELECT a.property_id
  FROM public.tenancy_agreements a
  WHERE a.tenant_id = t.id AND a.deleted_at IS NULL
  ORDER BY a.start_date DESC NULLS LAST
  LIMIT 1
) ta ON true
WHERE t.deleted_at IS NULL

UNION ALL
-- Leases
SELECT l.company_id, 'lease', l.id,
       coalesce(l.code || ' — ', '') || coalesce(l.title, coalesce(tn.name, 'Lease')),
       concat_ws(' · ', pr.name, tn.name, l.status),
       concat_ws(' ', l.code, l.title, l.lease_type, l.status, pr.name, pr.code,
                 tn.name, tn.legal_name, tn.trading_name, l.notes),
       coalesce(l.commencement_date, l.created_at::date)::timestamptz,
       '/leases/' || l.id,
       l.status::text, l.archived_at IS NOT NULL, l.property_id,
       jsonb_build_object('lease_type', l.lease_type)
FROM public.leases l
LEFT JOIN public.properties pr ON pr.id = l.property_id
LEFT JOIN public.tenants tn ON tn.id = l.primary_tenant_id

UNION ALL
SELECT c.company_id, 'project', c.id, c.name, c.project_type,
       concat_ws(' ', c.code, c.name, c.project_type, c.contractor_name, c.notes),
       c.start_date::timestamptz,
       CASE WHEN c.property_id IS NOT NULL
            THEN '/properties/' || c.property_id || '?tab=projects&record=' || c.id
            ELSE '/operations?tab=capex&record=' || c.id END,
       c.status::text, false, c.property_id, '{}'::jsonb
FROM public.capex_projects c WHERE c.deleted_at IS NULL

UNION ALL
SELECT cm.company_id, 'commitment', cm.id,
       coalesce(cm.code || ' — ', '') || cm.title,
       concat_ws(' · ', cm.commitment_type, cp.name, cm.status),
       concat_ws(' ', cm.code, cm.title, cm.description, cm.commitment_type, cm.status,
                 cm.approval_status, cp.name, cp.legal_name, cm.notes),
       cm.start_date::timestamptz,
       '/commitments/' || cm.id,
       cm.status::text, cm.archived_at IS NOT NULL, NULL::uuid,
       jsonb_build_object('approval_status', cm.approval_status, 'commitment_type', cm.commitment_type)
FROM public.commitments cm
LEFT JOIN public.counterparties cp ON cp.id = cm.counterparty_id
WHERE cm.deleted_at IS NULL

UNION ALL
SELECT b.company_id, 'budget', b.id,
       coalesce(b.code || ' — ', '') || b.name,
       concat_ws(' · ', 'FY ' || b.fiscal_year, pr.name, b.status),
       concat_ws(' ', b.code, b.name, b.fiscal_year::text, b.status, pr.name, pr.code,
                 pj.name, pj.code, b.notes, vs.version_text),
       make_date(b.fiscal_year, 1, 1)::timestamptz,
       '/budgets/' || b.id,
       b.status::text, b.archived_at IS NOT NULL, b.property_id,
       jsonb_build_object('fiscal_year', b.fiscal_year, 'published_versions', coalesce(vs.published_count, 0))
FROM public.budgets b
LEFT JOIN public.properties pr ON pr.id = b.property_id
LEFT JOIN public.capex_projects pj ON pj.id = b.project_id
LEFT JOIN LATERAL (
  SELECT string_agg('v' || v.version_no || ' ' || v.status, ' ') AS version_text,
         count(*) FILTER (WHERE v.status = 'published') AS published_count
  FROM public.budget_versions v WHERE v.budget_id = b.id
) vs ON true

UNION ALL
SELECT ms.company_id, 'maintenance_schedule', ms.id,
       coalesce(ms.code || ' — ', '') || ms.title,
       concat_ws(' · ', ms.schedule_kind, ms.frequency, pr.name),
       concat_ws(' ', ms.code, ms.title, ms.description, ms.schedule_kind, ms.frequency,
                 ms.asset_label, pr.name, pr.code, cp.name, ms.responsible_name, ms.notes),
       ms.start_date::timestamptz,
       '/operations?tab=preventive&record=' || ms.id,
       CASE WHEN ms.is_active THEN 'active' ELSE 'inactive' END,
       ms.archived_at IS NOT NULL, ms.property_id,
       jsonb_build_object('frequency', ms.frequency)
FROM public.maintenance_schedules ms
LEFT JOIN public.properties pr ON pr.id = ms.property_id
LEFT JOIN public.counterparties cp ON cp.id = ms.counterparty_id

UNION ALL
SELECT mj.company_id, 'maintenance_job', mj.id,
       coalesce(mj.code || ' — ', '') || mj.title,
       concat_ws(' · ', mj.job_kind, mj.status, pr.name),
       concat_ws(' ', mj.code, mj.title, mj.description, mj.job_kind, mj.status, mj.priority,
                 pr.name, pr.code, cp.name, mj.responsible_name, mj.notes),
       coalesce(mj.target_date, mj.planned_date, mj.requested_date)::timestamptz,
       '/operations?tab=maintenance&record=' || mj.id,
       mj.status::text, mj.archived_at IS NOT NULL, mj.property_id,
       jsonb_build_object('job_kind', mj.job_kind, 'priority', mj.priority)
FROM public.maintenance_jobs mj
LEFT JOIN public.properties pr ON pr.id = mj.property_id
LEFT JOIN public.counterparties cp ON cp.id = mj.counterparty_id
WHERE mj.deleted_at IS NULL

UNION ALL
SELECT cp.company_id, 'counterparty', cp.id,
       coalesce(cp.code || ' — ', '') || cp.name,
       concat_ws(' · ', cp.trading_name, cp.counterparty_type, cp.city),
       concat_ws(' ', cp.code, cp.name, cp.legal_name, cp.trading_name, cp.nif,
                 cp.email, cp.phone, cp.contact_name, cp.city, cp.notes),
       cp.created_at,
       '/bookkeeping?tab=counterparties&record=' || cp.id,
       cp.status::text, false, NULL::uuid,
       jsonb_build_object('counterparty_type', cp.counterparty_type)
FROM public.counterparties cp WHERE cp.deleted_at IS NULL;

GRANT SELECT ON public.v_search_index TO authenticated;