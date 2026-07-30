-- =====================================================================
-- Phase 8B — operational obligations, service contracts, insurance,
-- utilities, tax schedules and reminders.
--
-- Frozen contract compliance (§5C / §5D):
--   * No table below stores expected expenditure, invoice, payment,
--     bank or cash-flow values. Every financial figure is DERIVED from
--     the linked commitment through v_commitment_summary.
--   * No table below writes to cash_flow_entries, bookkeeping or banking.
--   * Records are archived, never deleted.
-- =====================================================================

-- ---------------------------------------------------------------- guard
create or replace function public.tg_guard_operational_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Operational records are archived, never deleted'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ================================================= operational_obligations
create table public.operational_obligations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  obligation_type text not null check (obligation_type in (
    'insurance_renewal','service_contract','utility_contract','tax_obligation',
    'statutory_compliance','licence_permit','inspection','recurring','other')),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open','in_progress','completed','cancelled','archived')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  responsible_user_id uuid,
  responsible_name text,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  due_date date,
  reminder_lead_days integer not null default 30 check (reminder_lead_days >= 0),
  recurrence_frequency text not null default 'none'
    check (recurrence_frequency in ('none','monthly','quarterly','semiannual','annual')),
  recurrence_interval integer not null default 1 check (recurrence_interval > 0),
  recurrence_end_date date,
  commitment_id uuid references public.commitments(id) on delete set null,
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.operational_obligations to authenticated;
grant all on public.operational_obligations to service_role;
alter table public.operational_obligations enable row level security;

create policy oo_select on public.operational_obligations
  for select to authenticated using (public.can_view_company(company_id));
create policy oo_insert on public.operational_obligations
  for insert to authenticated with check (public.can_record_company(company_id));
create policy oo_update on public.operational_obligations
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_oo_company on public.operational_obligations (company_id, status);
create index idx_oo_due on public.operational_obligations (company_id, due_date);
create index idx_oo_commitment on public.operational_obligations (commitment_id);

create trigger trg_oo_touch before update on public.operational_obligations
  for each row execute function public.tg_touch_row();
create trigger trg_oo_guard before delete on public.operational_obligations
  for each row execute function public.tg_guard_operational_row();
create trigger trg_oo_audit after insert or update or delete on public.operational_obligations
  for each row execute function public.tg_audit_row();

-- ======================================================= service_contracts
create table public.service_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  service_type text not null default 'other'
    check (service_type in ('cleaning','security','lift','hvac','landscaping','waste',
                            'property_management','accounting','legal','it','other')),
  contract_number text,
  start_date date,
  end_date date,
  renewal_terms text,
  notice_period_days integer check (notice_period_days is null or notice_period_days >= 0),
  auto_renew boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft','active','expiring','terminated','expired','archived')),
  obligation_id uuid references public.operational_obligations(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  reminder_lead_days integer not null default 60 check (reminder_lead_days >= 0),
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  constraint service_contracts_dates check (end_date is null or start_date is null or end_date >= start_date)
);

grant select, insert, update on public.service_contracts to authenticated;
grant all on public.service_contracts to service_role;
alter table public.service_contracts enable row level security;

create policy sc_select on public.service_contracts
  for select to authenticated using (public.can_view_company(company_id));
create policy sc_insert on public.service_contracts
  for insert to authenticated with check (public.can_record_company(company_id));
create policy sc_update on public.service_contracts
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_sc_company on public.service_contracts (company_id, status);
create index idx_sc_end on public.service_contracts (company_id, end_date);

create trigger trg_sc_touch before update on public.service_contracts
  for each row execute function public.tg_touch_row();
create trigger trg_sc_guard before delete on public.service_contracts
  for each row execute function public.tg_guard_operational_row();
create trigger trg_sc_audit after insert or update or delete on public.service_contracts
  for each row execute function public.tg_audit_row();

-- ====================================================== insurance_policies
create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  insurer_counterparty_id uuid references public.counterparties(id) on delete set null,
  insurer_name text,
  broker_counterparty_id uuid references public.counterparties(id) on delete set null,
  broker_name text,
  policy_number text,
  policy_type text not null default 'other'
    check (policy_type in ('buildings','contents','liability','loss_of_rent','construction',
                           'directors','legal_expenses','other')),
  insured_assets text,
  property_id uuid references public.properties(id) on delete set null,
  effective_date date,
  expiry_date date,
  -- Policy term, not an expected expenditure: the excess is what the insurer
  -- deducts from a claim. Premiums live on the linked commitment only.
  excess_amount numeric(14,2) check (excess_amount is null or excess_amount >= 0),
  status text not null default 'draft'
    check (status in ('draft','active','expiring','lapsed','cancelled','archived')),
  obligation_id uuid references public.operational_obligations(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  reminder_lead_days integer not null default 45 check (reminder_lead_days >= 0),
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  constraint insurance_policies_dates check (expiry_date is null or effective_date is null or expiry_date >= effective_date)
);

grant select, insert, update on public.insurance_policies to authenticated;
grant all on public.insurance_policies to service_role;
alter table public.insurance_policies enable row level security;

create policy ip_select on public.insurance_policies
  for select to authenticated using (public.can_view_company(company_id));
create policy ip_insert on public.insurance_policies
  for insert to authenticated with check (public.can_record_company(company_id));
create policy ip_update on public.insurance_policies
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_ip_company on public.insurance_policies (company_id, status);
create index idx_ip_expiry on public.insurance_policies (company_id, expiry_date);

create trigger trg_ip_touch before update on public.insurance_policies
  for each row execute function public.tg_touch_row();
create trigger trg_ip_guard before delete on public.insurance_policies
  for each row execute function public.tg_guard_operational_row();
create trigger trg_ip_audit after insert or update or delete on public.insurance_policies
  for each row execute function public.tg_audit_row();

-- ======================================================= utility_contracts
create table public.utility_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  utility_type text not null default 'other'
    check (utility_type in ('electricity','gas','water','telecom','internet','waste','heating','other')),
  account_number text,
  meter_identifier text,
  service_address text,
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.property_units(id) on delete set null,
  activation_date date,
  termination_date date,
  status text not null default 'draft'
    check (status in ('draft','active','suspended','terminated','archived')),
  obligation_id uuid references public.operational_obligations(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  reminder_lead_days integer not null default 30 check (reminder_lead_days >= 0),
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  constraint utility_contracts_dates check (termination_date is null or activation_date is null or termination_date >= activation_date)
);

grant select, insert, update on public.utility_contracts to authenticated;
grant all on public.utility_contracts to service_role;
alter table public.utility_contracts enable row level security;

create policy uc_select on public.utility_contracts
  for select to authenticated using (public.can_view_company(company_id));
create policy uc_insert on public.utility_contracts
  for insert to authenticated with check (public.can_record_company(company_id));
create policy uc_update on public.utility_contracts
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_uc_company on public.utility_contracts (company_id, status);

create trigger trg_uc_touch before update on public.utility_contracts
  for each row execute function public.tg_touch_row();
create trigger trg_uc_guard before delete on public.utility_contracts
  for each row execute function public.tg_guard_operational_row();
create trigger trg_uc_audit after insert or update or delete on public.utility_contracts
  for each row execute function public.tg_audit_row();

-- =========================================================== tax_schedules
create table public.tax_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  tax_type text not null default 'other'
    check (tax_type in ('imi','aimi','municipal','service_charge','stamp_duty','other')),
  jurisdiction text,
  reference text,
  tax_year integer,
  property_id uuid references public.properties(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','active','settled','cancelled','archived')),
  obligation_id uuid references public.operational_obligations(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  reminder_lead_days integer not null default 21 check (reminder_lead_days >= 0),
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

grant select, insert, update on public.tax_schedules to authenticated;
grant all on public.tax_schedules to service_role;
alter table public.tax_schedules enable row level security;

create policy ts_select on public.tax_schedules
  for select to authenticated using (public.can_view_company(company_id));
create policy ts_insert on public.tax_schedules
  for insert to authenticated with check (public.can_record_company(company_id));
create policy ts_update on public.tax_schedules
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_ts_company on public.tax_schedules (company_id, status);

create trigger trg_ts_touch before update on public.tax_schedules
  for each row execute function public.tg_touch_row();
create trigger trg_ts_guard before delete on public.tax_schedules
  for each row execute function public.tg_guard_operational_row();
create trigger trg_ts_audit after insert or update or delete on public.tax_schedules
  for each row execute function public.tg_audit_row();

-- ====================================================== tax_schedule_dates
-- Dates only. The money for each instalment lives on the linked commitment's
-- schedule lines, never here.
create table public.tax_schedule_dates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tax_schedule_id uuid not null references public.tax_schedules(id) on delete cascade,
  sequence_no integer not null default 1,
  label text,
  due_date date not null,
  reminder_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled','settled','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (tax_schedule_id, sequence_no)
);

grant select, insert, update on public.tax_schedule_dates to authenticated;
grant all on public.tax_schedule_dates to service_role;
alter table public.tax_schedule_dates enable row level security;

create policy tsd_select on public.tax_schedule_dates
  for select to authenticated using (public.can_view_company(company_id));
create policy tsd_insert on public.tax_schedule_dates
  for insert to authenticated with check (public.can_record_company(company_id));
create policy tsd_update on public.tax_schedule_dates
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_tsd_schedule on public.tax_schedule_dates (tax_schedule_id, due_date);

create trigger trg_tsd_touch before update on public.tax_schedule_dates
  for each row execute function public.tg_touch_row();
create trigger trg_tsd_audit after insert or update or delete on public.tax_schedule_dates
  for each row execute function public.tg_audit_row();

-- =================================================== operational_reminders
create table public.operational_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'operational_obligation','service_contract','insurance_policy',
    'utility_contract','tax_schedule')),
  entity_id uuid not null,
  reason text not null check (reason in (
    'obligation_due','contract_expiry','insurance_renewal','inspection_due',
    'licence_expiry','tax_deadline','utility_review')),
  remind_on date not null,
  due_on date,
  severity text not null default 'normal' check (severity in ('low','normal','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','acknowledged','resolved','dismissed')),
  title text,
  notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (company_id, entity_type, entity_id, reason, remind_on)
);

grant select, insert, update on public.operational_reminders to authenticated;
grant all on public.operational_reminders to service_role;
alter table public.operational_reminders enable row level security;

create policy orem_select on public.operational_reminders
  for select to authenticated using (public.can_view_company(company_id));
create policy orem_insert on public.operational_reminders
  for insert to authenticated with check (public.can_record_company(company_id));
create policy orem_update on public.operational_reminders
  for update to authenticated
  using (public.can_record_company(company_id))
  with check (public.can_record_company(company_id));

create index idx_orem_company on public.operational_reminders (company_id, status, remind_on);
create index idx_orem_entity on public.operational_reminders (entity_type, entity_id);

create trigger trg_orem_touch before update on public.operational_reminders
  for each row execute function public.tg_touch_row();
create trigger trg_orem_guard before delete on public.operational_reminders
  for each row execute function public.tg_guard_operational_row();
create trigger trg_orem_audit after insert or update or delete on public.operational_reminders
  for each row execute function public.tg_audit_row();

-- =====================================================================
-- Derived views. Every financial column below is read from the linked
-- commitment; none of it is stored on the operational record.
-- =====================================================================

create or replace view public.v_operational_obligation_summary as
select
  o.id as obligation_id,
  o.company_id,
  o.code, o.obligation_type, o.title, o.description, o.status, o.priority,
  o.responsible_user_id, o.responsible_name,
  o.counterparty_id, cp.name as counterparty_name,
  o.property_id, p.name as property_name,
  o.due_date, o.reminder_lead_days,
  o.recurrence_frequency, o.recurrence_interval, o.recurrence_end_date,
  o.notes, o.archived_at, o.created_at, o.updated_at,
  case when o.due_date is null then null else (o.due_date - current_date) end as days_until_due,
  o.commitment_id,
  cs.title as commitment_title,
  cs.status as commitment_status,
  cs.approval_status as commitment_approval_status,
  cs.currency as commitment_currency,
  coalesce(cs.authorised_amount, 0) as authorised_amount,
  coalesce(cs.approved_committed_amount, 0) as committed_amount,
  coalesce(cs.invoiced_amount, 0) as invoiced_amount,
  coalesce(cs.paid_amount, 0) as paid_amount,
  coalesce(cs.remaining_commitment, 0) as remaining_commitment
from public.operational_obligations o
left join public.counterparties cp on cp.id = o.counterparty_id
left join public.properties p on p.id = o.property_id
left join public.v_commitment_summary cs on cs.commitment_id = o.commitment_id;

create or replace view public.v_service_contract_summary as
select
  s.id as contract_id,
  s.company_id, s.code, s.title, s.service_type, s.contract_number,
  s.counterparty_id, cp.name as counterparty_name,
  s.start_date, s.end_date, s.renewal_terms, s.notice_period_days, s.auto_renew,
  s.status, s.obligation_id, s.property_id, s.reminder_lead_days,
  s.notes, s.archived_at, s.created_at, s.updated_at,
  case when s.end_date is null then null else (s.end_date - current_date) end as days_until_expiry,
  s.commitment_id,
  cs.status as commitment_status,
  cs.approval_status as commitment_approval_status,
  cs.currency as commitment_currency,
  coalesce(cs.authorised_amount, 0) as authorised_amount,
  coalesce(cs.approved_committed_amount, 0) as committed_amount,
  coalesce(cs.invoiced_amount, 0) as invoiced_amount,
  coalesce(cs.paid_amount, 0) as paid_amount,
  coalesce(cs.remaining_commitment, 0) as remaining_commitment
from public.service_contracts s
left join public.counterparties cp on cp.id = s.counterparty_id
left join public.v_commitment_summary cs on cs.commitment_id = s.commitment_id;

create or replace view public.v_insurance_policy_summary as
select
  i.id as policy_id,
  i.company_id, i.code, i.title, i.policy_number, i.policy_type, i.insured_assets,
  i.insurer_counterparty_id, coalesce(ins.name, i.insurer_name) as insurer_name,
  i.broker_counterparty_id, coalesce(brk.name, i.broker_name) as broker_name,
  i.property_id, p.name as property_name,
  i.effective_date, i.expiry_date, i.excess_amount, i.status,
  i.obligation_id, i.reminder_lead_days, i.notes, i.archived_at,
  i.created_at, i.updated_at,
  case when i.expiry_date is null then null else (i.expiry_date - current_date) end as days_until_expiry,
  i.commitment_id,
  cs.status as commitment_status,
  cs.approval_status as commitment_approval_status,
  cs.currency as commitment_currency,
  coalesce(cs.authorised_amount, 0) as authorised_amount,
  coalesce(cs.approved_committed_amount, 0) as committed_amount,
  coalesce(cs.invoiced_amount, 0) as invoiced_amount,
  coalesce(cs.paid_amount, 0) as paid_amount,
  coalesce(cs.remaining_commitment, 0) as remaining_commitment
from public.insurance_policies i
left join public.counterparties ins on ins.id = i.insurer_counterparty_id
left join public.counterparties brk on brk.id = i.broker_counterparty_id
left join public.properties p on p.id = i.property_id
left join public.v_commitment_summary cs on cs.commitment_id = i.commitment_id;

create or replace view public.v_utility_contract_summary as
select
  u.id as contract_id,
  u.company_id, u.code, u.title, u.utility_type, u.account_number,
  u.meter_identifier, u.service_address,
  u.counterparty_id, cp.name as counterparty_name,
  u.property_id, p.name as property_name, u.unit_id,
  u.activation_date, u.termination_date, u.status,
  u.obligation_id, u.reminder_lead_days, u.notes, u.archived_at,
  u.created_at, u.updated_at,
  u.commitment_id,
  cs.status as commitment_status,
  cs.approval_status as commitment_approval_status,
  cs.currency as commitment_currency,
  coalesce(cs.authorised_amount, 0) as authorised_amount,
  coalesce(cs.approved_committed_amount, 0) as committed_amount,
  coalesce(cs.invoiced_amount, 0) as invoiced_amount,
  coalesce(cs.paid_amount, 0) as paid_amount,
  coalesce(cs.remaining_commitment, 0) as remaining_commitment
from public.utility_contracts u
left join public.counterparties cp on cp.id = u.counterparty_id
left join public.properties p on p.id = u.property_id
left join public.v_commitment_summary cs on cs.commitment_id = u.commitment_id;

create or replace view public.v_tax_schedule_summary as
select
  t.id as schedule_id,
  t.company_id, t.code, t.title, t.tax_type, t.jurisdiction, t.reference, t.tax_year,
  t.property_id, p.name as property_name, t.status,
  t.obligation_id, t.reminder_lead_days, t.notes, t.archived_at,
  t.created_at, t.updated_at,
  (select count(*) from public.tax_schedule_dates d
     where d.tax_schedule_id = t.id and d.status = 'scheduled') as scheduled_dates,
  (select min(d.due_date) from public.tax_schedule_dates d
     where d.tax_schedule_id = t.id and d.status = 'scheduled' and d.due_date >= current_date) as next_due_date,
  t.commitment_id,
  cs.status as commitment_status,
  cs.approval_status as commitment_approval_status,
  cs.currency as commitment_currency,
  coalesce(cs.authorised_amount, 0) as authorised_amount,
  coalesce(cs.approved_committed_amount, 0) as committed_amount,
  coalesce(cs.invoiced_amount, 0) as invoiced_amount,
  coalesce(cs.paid_amount, 0) as paid_amount,
  coalesce(cs.remaining_commitment, 0) as remaining_commitment
from public.tax_schedules t
left join public.properties p on p.id = t.property_id
left join public.v_commitment_summary cs on cs.commitment_id = t.commitment_id;

create or replace view public.v_operational_reminders as
select
  r.id as reminder_id,
  r.company_id, r.entity_type, r.entity_id, r.reason, r.remind_on, r.due_on,
  r.severity, r.status, r.title, r.notes, r.resolved_at, r.created_at,
  (r.remind_on - current_date) as days_until_reminder,
  case when r.due_on is null then null else (r.due_on - current_date) end as days_until_due,
  (r.status = 'pending' and r.due_on is not null and r.due_on < current_date) as is_overdue,
  coalesce(
    (select o.commitment_id from public.operational_obligations o
       where r.entity_type = 'operational_obligation' and o.id = r.entity_id),
    (select s.commitment_id from public.service_contracts s
       where r.entity_type = 'service_contract' and s.id = r.entity_id),
    (select i.commitment_id from public.insurance_policies i
       where r.entity_type = 'insurance_policy' and i.id = r.entity_id),
    (select u.commitment_id from public.utility_contracts u
       where r.entity_type = 'utility_contract' and u.id = r.entity_id),
    (select t.commitment_id from public.tax_schedules t
       where r.entity_type = 'tax_schedule' and t.id = r.entity_id)
  ) as commitment_id
from public.operational_reminders r;

grant select on public.v_operational_obligation_summary to authenticated;
grant select on public.v_service_contract_summary to authenticated;
grant select on public.v_insurance_policy_summary to authenticated;
grant select on public.v_utility_contract_summary to authenticated;
grant select on public.v_tax_schedule_summary to authenticated;
grant select on public.v_operational_reminders to authenticated;

-- =====================================================================
-- Server contract. Every privileged write goes through these functions.
-- =====================================================================

create or replace function public.operational_table_for(_entity_type text)
returns text language sql immutable set search_path = public as $$
  select case _entity_type
    when 'operational_obligation' then 'operational_obligations'
    when 'service_contract' then 'service_contracts'
    when 'insurance_policy' then 'insurance_policies'
    when 'utility_contract' then 'utility_contracts'
    when 'tax_schedule' then 'tax_schedules'
  end;
$$;

create or replace function public.next_operational_due_date(
  _due date, _frequency text, _interval integer
) returns date language sql immutable set search_path = public as $$
  select case
    when _due is null or _frequency = 'none' then null
    when _frequency = 'monthly' then _due + (coalesce(_interval,1) || ' month')::interval
    when _frequency = 'quarterly' then _due + (coalesce(_interval,1) * 3 || ' month')::interval
    when _frequency = 'semiannual' then _due + (coalesce(_interval,1) * 6 || ' month')::interval
    when _frequency = 'annual' then _due + (coalesce(_interval,1) || ' year')::interval
  end::date;
$$;

-- ------------------------------------------------------------ obligations
create or replace function public.create_operational_obligation(
  _company_id uuid,
  _obligation_type text,
  _title text,
  _description text default null,
  _priority text default 'medium',
  _due_date date default null,
  _responsible_name text default null,
  _counterparty_id uuid default null,
  _property_id uuid default null,
  _reminder_lead_days integer default 30,
  _recurrence_frequency text default 'none',
  _recurrence_interval integer default 1,
  _recurrence_end_date date default null,
  _commitment_id uuid default null,
  _code text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create obligations' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  insert into public.operational_obligations (
    company_id, obligation_type, title, description, priority, due_date,
    responsible_name, counterparty_id, property_id, reminder_lead_days,
    recurrence_frequency, recurrence_interval, recurrence_end_date,
    commitment_id, code, notes)
  values (
    _company_id, _obligation_type, _title, _description, coalesce(_priority,'medium'), _due_date,
    _responsible_name, _counterparty_id, _property_id, coalesce(_reminder_lead_days,30),
    coalesce(_recurrence_frequency,'none'), coalesce(_recurrence_interval,1), _recurrence_end_date,
    _commitment_id, _code, _notes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_operational_obligation(
  _obligation_id uuid,
  _title text default null,
  _description text default null,
  _obligation_type text default null,
  _status text default null,
  _priority text default null,
  _due_date date default null,
  _responsible_name text default null,
  _counterparty_id uuid default null,
  _property_id uuid default null,
  _reminder_lead_days integer default null,
  _recurrence_frequency text default null,
  _recurrence_interval integer default null,
  _recurrence_end_date date default null,
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.operational_obligations%rowtype;
begin
  select * into r from public.operational_obligations where id = _obligation_id;
  if r.id is null then raise exception 'Obligation not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit obligations' using errcode = '42501';
  end if;
  if r.archived_at is not null then
    raise exception 'An archived obligation cannot be edited' using errcode = 'check_violation';
  end if;
  update public.operational_obligations set
    title = coalesce(_title, title),
    description = coalesce(_description, description),
    obligation_type = coalesce(_obligation_type, obligation_type),
    status = coalesce(_status, status),
    priority = coalesce(_priority, priority),
    due_date = coalesce(_due_date, due_date),
    responsible_name = coalesce(_responsible_name, responsible_name),
    counterparty_id = coalesce(_counterparty_id, counterparty_id),
    property_id = coalesce(_property_id, property_id),
    reminder_lead_days = coalesce(_reminder_lead_days, reminder_lead_days),
    recurrence_frequency = coalesce(_recurrence_frequency, recurrence_frequency),
    recurrence_interval = coalesce(_recurrence_interval, recurrence_interval),
    recurrence_end_date = coalesce(_recurrence_end_date, recurrence_end_date),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _obligation_id;
end;
$$;

-- ------------------------------------------------------ service contracts
create or replace function public.create_service_contract(
  _company_id uuid,
  _title text,
  _service_type text default 'other',
  _counterparty_id uuid default null,
  _contract_number text default null,
  _start_date date default null,
  _end_date date default null,
  _renewal_terms text default null,
  _notice_period_days integer default null,
  _auto_renew boolean default false,
  _obligation_id uuid default null,
  _commitment_id uuid default null,
  _property_id uuid default null,
  _reminder_lead_days integer default 60,
  _code text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create service contracts' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  insert into public.service_contracts (
    company_id, title, service_type, counterparty_id, contract_number, start_date, end_date,
    renewal_terms, notice_period_days, auto_renew, obligation_id, commitment_id,
    property_id, reminder_lead_days, code, notes)
  values (
    _company_id, _title, coalesce(_service_type,'other'), _counterparty_id, _contract_number,
    _start_date, _end_date, _renewal_terms, _notice_period_days, coalesce(_auto_renew,false),
    _obligation_id, _commitment_id, _property_id, coalesce(_reminder_lead_days,60), _code, _notes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_service_contract(
  _contract_id uuid,
  _title text default null,
  _service_type text default null,
  _counterparty_id uuid default null,
  _contract_number text default null,
  _start_date date default null,
  _end_date date default null,
  _renewal_terms text default null,
  _notice_period_days integer default null,
  _auto_renew boolean default null,
  _status text default null,
  _obligation_id uuid default null,
  _reminder_lead_days integer default null,
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.service_contracts%rowtype;
begin
  select * into r from public.service_contracts where id = _contract_id;
  if r.id is null then raise exception 'Service contract not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit service contracts' using errcode = '42501';
  end if;
  if r.archived_at is not null then
    raise exception 'An archived service contract cannot be edited' using errcode = 'check_violation';
  end if;
  update public.service_contracts set
    title = coalesce(_title, title),
    service_type = coalesce(_service_type, service_type),
    counterparty_id = coalesce(_counterparty_id, counterparty_id),
    contract_number = coalesce(_contract_number, contract_number),
    start_date = coalesce(_start_date, start_date),
    end_date = coalesce(_end_date, end_date),
    renewal_terms = coalesce(_renewal_terms, renewal_terms),
    notice_period_days = coalesce(_notice_period_days, notice_period_days),
    auto_renew = coalesce(_auto_renew, auto_renew),
    status = coalesce(_status, status),
    obligation_id = coalesce(_obligation_id, obligation_id),
    reminder_lead_days = coalesce(_reminder_lead_days, reminder_lead_days),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _contract_id;
end;
$$;

-- ---------------------------------------------------------- insurance
create or replace function public.create_insurance_policy(
  _company_id uuid,
  _title text,
  _policy_type text default 'other',
  _insurer_counterparty_id uuid default null,
  _insurer_name text default null,
  _broker_counterparty_id uuid default null,
  _broker_name text default null,
  _policy_number text default null,
  _insured_assets text default null,
  _property_id uuid default null,
  _effective_date date default null,
  _expiry_date date default null,
  _excess_amount numeric default null,
  _obligation_id uuid default null,
  _commitment_id uuid default null,
  _reminder_lead_days integer default 45,
  _code text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create insurance policies' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  insert into public.insurance_policies (
    company_id, title, policy_type, insurer_counterparty_id, insurer_name,
    broker_counterparty_id, broker_name, policy_number, insured_assets, property_id,
    effective_date, expiry_date, excess_amount, obligation_id, commitment_id,
    reminder_lead_days, code, notes)
  values (
    _company_id, _title, coalesce(_policy_type,'other'), _insurer_counterparty_id, _insurer_name,
    _broker_counterparty_id, _broker_name, _policy_number, _insured_assets, _property_id,
    _effective_date, _expiry_date, _excess_amount, _obligation_id, _commitment_id,
    coalesce(_reminder_lead_days,45), _code, _notes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_insurance_policy(
  _policy_id uuid,
  _title text default null,
  _policy_type text default null,
  _insurer_counterparty_id uuid default null,
  _insurer_name text default null,
  _broker_counterparty_id uuid default null,
  _broker_name text default null,
  _policy_number text default null,
  _insured_assets text default null,
  _property_id uuid default null,
  _effective_date date default null,
  _expiry_date date default null,
  _excess_amount numeric default null,
  _status text default null,
  _obligation_id uuid default null,
  _reminder_lead_days integer default null,
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.insurance_policies%rowtype;
begin
  select * into r from public.insurance_policies where id = _policy_id;
  if r.id is null then raise exception 'Insurance policy not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit insurance policies' using errcode = '42501';
  end if;
  if r.archived_at is not null then
    raise exception 'An archived insurance policy cannot be edited' using errcode = 'check_violation';
  end if;
  update public.insurance_policies set
    title = coalesce(_title, title),
    policy_type = coalesce(_policy_type, policy_type),
    insurer_counterparty_id = coalesce(_insurer_counterparty_id, insurer_counterparty_id),
    insurer_name = coalesce(_insurer_name, insurer_name),
    broker_counterparty_id = coalesce(_broker_counterparty_id, broker_counterparty_id),
    broker_name = coalesce(_broker_name, broker_name),
    policy_number = coalesce(_policy_number, policy_number),
    insured_assets = coalesce(_insured_assets, insured_assets),
    property_id = coalesce(_property_id, property_id),
    effective_date = coalesce(_effective_date, effective_date),
    expiry_date = coalesce(_expiry_date, expiry_date),
    excess_amount = coalesce(_excess_amount, excess_amount),
    status = coalesce(_status, status),
    obligation_id = coalesce(_obligation_id, obligation_id),
    reminder_lead_days = coalesce(_reminder_lead_days, reminder_lead_days),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _policy_id;
end;
$$;

-- ---------------------------------------------------------- utilities
create or replace function public.create_utility_contract(
  _company_id uuid,
  _title text,
  _utility_type text default 'other',
  _counterparty_id uuid default null,
  _account_number text default null,
  _meter_identifier text default null,
  _service_address text default null,
  _property_id uuid default null,
  _unit_id uuid default null,
  _activation_date date default null,
  _termination_date date default null,
  _obligation_id uuid default null,
  _commitment_id uuid default null,
  _reminder_lead_days integer default 30,
  _code text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create utility contracts' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  insert into public.utility_contracts (
    company_id, title, utility_type, counterparty_id, account_number, meter_identifier,
    service_address, property_id, unit_id, activation_date, termination_date,
    obligation_id, commitment_id, reminder_lead_days, code, notes)
  values (
    _company_id, _title, coalesce(_utility_type,'other'), _counterparty_id, _account_number,
    _meter_identifier, _service_address, _property_id, _unit_id, _activation_date,
    _termination_date, _obligation_id, _commitment_id, coalesce(_reminder_lead_days,30), _code, _notes)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_utility_contract(
  _contract_id uuid,
  _title text default null,
  _utility_type text default null,
  _counterparty_id uuid default null,
  _account_number text default null,
  _meter_identifier text default null,
  _service_address text default null,
  _property_id uuid default null,
  _unit_id uuid default null,
  _activation_date date default null,
  _termination_date date default null,
  _status text default null,
  _obligation_id uuid default null,
  _reminder_lead_days integer default null,
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.utility_contracts%rowtype;
begin
  select * into r from public.utility_contracts where id = _contract_id;
  if r.id is null then raise exception 'Utility contract not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit utility contracts' using errcode = '42501';
  end if;
  if r.archived_at is not null then
    raise exception 'An archived utility contract cannot be edited' using errcode = 'check_violation';
  end if;
  update public.utility_contracts set
    title = coalesce(_title, title),
    utility_type = coalesce(_utility_type, utility_type),
    counterparty_id = coalesce(_counterparty_id, counterparty_id),
    account_number = coalesce(_account_number, account_number),
    meter_identifier = coalesce(_meter_identifier, meter_identifier),
    service_address = coalesce(_service_address, service_address),
    property_id = coalesce(_property_id, property_id),
    unit_id = coalesce(_unit_id, unit_id),
    activation_date = coalesce(_activation_date, activation_date),
    termination_date = coalesce(_termination_date, termination_date),
    status = coalesce(_status, status),
    obligation_id = coalesce(_obligation_id, obligation_id),
    reminder_lead_days = coalesce(_reminder_lead_days, reminder_lead_days),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _contract_id;
end;
$$;

-- -------------------------------------------------------- tax schedules
create or replace function public.create_tax_schedule(
  _company_id uuid,
  _title text,
  _tax_type text default 'other',
  _jurisdiction text default null,
  _reference text default null,
  _tax_year integer default null,
  _property_id uuid default null,
  _obligation_id uuid default null,
  _commitment_id uuid default null,
  _reminder_lead_days integer default 21,
  _code text default null,
  _notes text default null,
  _due_dates date[] default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_date date; v_seq integer := 0;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create tax schedules' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  insert into public.tax_schedules (
    company_id, title, tax_type, jurisdiction, reference, tax_year, property_id,
    obligation_id, commitment_id, reminder_lead_days, code, notes)
  values (
    _company_id, _title, coalesce(_tax_type,'other'), _jurisdiction, _reference, _tax_year,
    _property_id, _obligation_id, _commitment_id, coalesce(_reminder_lead_days,21), _code, _notes)
  returning id into v_id;

  if _due_dates is not null then
    foreach v_date in array _due_dates loop
      v_seq := v_seq + 1;
      insert into public.tax_schedule_dates (
        company_id, tax_schedule_id, sequence_no, due_date, reminder_date)
      values (_company_id, v_id, v_seq, v_date,
        v_date - (coalesce(_reminder_lead_days,21) || ' day')::interval);
    end loop;
  end if;
  return v_id;
end;
$$;

create or replace function public.update_tax_schedule(
  _schedule_id uuid,
  _title text default null,
  _tax_type text default null,
  _jurisdiction text default null,
  _reference text default null,
  _tax_year integer default null,
  _property_id uuid default null,
  _status text default null,
  _obligation_id uuid default null,
  _reminder_lead_days integer default null,
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.tax_schedules%rowtype;
begin
  select * into r from public.tax_schedules where id = _schedule_id;
  if r.id is null then raise exception 'Tax schedule not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit tax schedules' using errcode = '42501';
  end if;
  if r.archived_at is not null then
    raise exception 'An archived tax schedule cannot be edited' using errcode = 'check_violation';
  end if;
  update public.tax_schedules set
    title = coalesce(_title, title),
    tax_type = coalesce(_tax_type, tax_type),
    jurisdiction = coalesce(_jurisdiction, jurisdiction),
    reference = coalesce(_reference, reference),
    tax_year = coalesce(_tax_year, tax_year),
    property_id = coalesce(_property_id, property_id),
    status = coalesce(_status, status),
    obligation_id = coalesce(_obligation_id, obligation_id),
    reminder_lead_days = coalesce(_reminder_lead_days, reminder_lead_days),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _schedule_id;
end;
$$;

create or replace function public.add_tax_schedule_date(
  _schedule_id uuid,
  _due_date date,
  _label text default null,
  _reminder_date date default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare r public.tax_schedules%rowtype; v_id uuid; v_seq integer;
begin
  select * into r from public.tax_schedules where id = _schedule_id;
  if r.id is null then raise exception 'Tax schedule not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit tax schedules' using errcode = '42501';
  end if;
  select coalesce(max(sequence_no), 0) + 1 into v_seq
    from public.tax_schedule_dates where tax_schedule_id = _schedule_id;
  insert into public.tax_schedule_dates (
    company_id, tax_schedule_id, sequence_no, label, due_date, reminder_date, notes)
  values (r.company_id, _schedule_id, v_seq, _label, _due_date,
    coalesce(_reminder_date, _due_date - (r.reminder_lead_days || ' day')::interval), _notes)
  returning id into v_id;
  return v_id;
end;
$$;

-- --------------------------------------------------------------- archive
create or replace function public.archive_operational_record(
  _entity_type text,
  _entity_id uuid,
  _reason text
) returns void language plpgsql security definer set search_path = public as $$
declare v_table text; v_company uuid;
begin
  v_table := public.operational_table_for(_entity_type);
  if v_table is null then
    raise exception 'Unknown operational record type %', _entity_type using errcode = 'check_violation';
  end if;
  if coalesce(btrim(_reason), '') = '' then
    raise exception 'An archive reason is required' using errcode = 'check_violation';
  end if;
  execute format('select company_id from public.%I where id = $1', v_table)
    into v_company using _entity_id;
  if v_company is null then raise exception 'Record not found'; end if;
  if not public.can_manage_company(v_company) then
    raise exception 'You do not have permission to archive operational records' using errcode = '42501';
  end if;
  execute format(
    'update public.%I set archived_at = now(), archive_reason = $2, status = ''archived'', updated_by = auth.uid() where id = $1 and archived_at is null',
    v_table) using _entity_id, _reason;
  update public.operational_reminders
     set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid(), updated_by = auth.uid()
   where entity_type = _entity_type and entity_id = _entity_id and status = 'pending';
end;
$$;

-- ------------------------------------------------------ commitment links
create or replace function public.link_operational_commitment(
  _entity_type text,
  _entity_id uuid,
  _commitment_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare v_table text; v_company uuid;
begin
  v_table := public.operational_table_for(_entity_type);
  if v_table is null then
    raise exception 'Unknown operational record type %', _entity_type using errcode = 'check_violation';
  end if;
  execute format('select company_id from public.%I where id = $1', v_table)
    into v_company using _entity_id;
  if v_company is null then raise exception 'Record not found'; end if;
  if not public.can_record_company(v_company) then
    raise exception 'You do not have permission to link commitments' using errcode = '42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = v_company) then
    raise exception 'The linked commitment belongs to another company' using errcode = '42501';
  end if;
  execute format('update public.%I set commitment_id = $2, updated_by = auth.uid() where id = $1', v_table)
    using _entity_id, _commitment_id;
end;
$$;

-- Creates a DRAFT commitment for an operational record and links it. The
-- commitment owns the money from this point on; the operational record only
-- holds the reference. Approval still runs through the Phase 8A contract.
create or replace function public.create_operational_commitment(
  _entity_type text,
  _entity_id uuid,
  _title text,
  _commitment_type text,
  _authorised_amount numeric,
  _currency text default 'EUR',
  _counterparty_id uuid default null,
  _start_date date default null,
  _end_date date default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_table text; v_company uuid; v_commitment uuid;
begin
  v_table := public.operational_table_for(_entity_type);
  if v_table is null then
    raise exception 'Unknown operational record type %', _entity_type using errcode = 'check_violation';
  end if;
  execute format('select company_id from public.%I where id = $1', v_table)
    into v_company using _entity_id;
  if v_company is null then raise exception 'Record not found'; end if;
  if not public.can_record_company(v_company) then
    raise exception 'You do not have permission to create commitments' using errcode = '42501';
  end if;

  v_commitment := public.create_commitment_draft(
    _company_id => v_company,
    _title => _title,
    _commitment_type => _commitment_type,
    _authorised_amount => _authorised_amount,
    _counterparty_id => _counterparty_id,
    _currency => coalesce(_currency, 'EUR'),
    _start_date => _start_date,
    _end_date => _end_date,
    _source_type => _entity_type,
    _source_id => _entity_id,
    _notes => _notes);

  execute format('update public.%I set commitment_id = $2, updated_by = auth.uid() where id = $1', v_table)
    using _entity_id, v_commitment;
  return v_commitment;
end;
$$;

-- ------------------------------------------------------------- reminders
create or replace function public.upsert_operational_reminder(
  _company_id uuid,
  _entity_type text,
  _entity_id uuid,
  _reason text,
  _remind_on date,
  _due_on date default null,
  _severity text default 'normal',
  _title text default null,
  _notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to manage reminders' using errcode = '42501';
  end if;
  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title, notes)
  values (_company_id, _entity_type, _entity_id, _reason, _remind_on, _due_on,
          coalesce(_severity,'normal'), _title, _notes)
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do update
    set due_on = excluded.due_on,
        severity = excluded.severity,
        title = coalesce(excluded.title, public.operational_reminders.title),
        notes = coalesce(excluded.notes, public.operational_reminders.notes),
        updated_by = auth.uid()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resolve_operational_reminder(
  _reminder_id uuid,
  _status text default 'resolved',
  _notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare r public.operational_reminders%rowtype;
begin
  select * into r from public.operational_reminders where id = _reminder_id;
  if r.id is null then raise exception 'Reminder not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to manage reminders' using errcode = '42501';
  end if;
  if _status not in ('pending','acknowledged','resolved','dismissed') then
    raise exception 'Unknown reminder status %', _status using errcode = 'check_violation';
  end if;
  update public.operational_reminders set
    status = _status,
    notes = coalesce(_notes, notes),
    resolved_at = case when _status in ('resolved','dismissed') then now() else null end,
    resolved_by = case when _status in ('resolved','dismissed') then auth.uid() else null end,
    updated_by = auth.uid()
  where id = _reminder_id;
end;
$$;

-- Idempotent: derives the reminder set implied by the operational registers.
-- It never creates a cash-flow entry; a reminder only points at the record and
-- its linked commitment.
create or replace function public.generate_operational_reminders(_company_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_added integer;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to manage reminders' using errcode = '42501';
  end if;

  -- obligations, including the next recurrence
  with src as (
    select o.company_id, o.id, o.title, o.due_date,
           (o.due_date - (o.reminder_lead_days || ' day')::interval)::date as remind_on,
           case when o.obligation_type = 'inspection' then 'inspection_due'
                when o.obligation_type = 'licence_permit' then 'licence_expiry'
                when o.obligation_type = 'insurance_renewal' then 'insurance_renewal'
                when o.obligation_type = 'tax_obligation' then 'tax_deadline'
                else 'obligation_due' end as reason,
           case when o.priority = 'urgent' then 'critical'
                when o.priority = 'high' then 'high'
                when o.priority = 'low' then 'low'
                else 'normal' end as severity
      from public.operational_obligations o
     where o.company_id = _company_id
       and o.archived_at is null
       and o.status in ('open','in_progress')
       and o.due_date is not null
    union all
    select o.company_id, o.id, o.title,
           public.next_operational_due_date(o.due_date, o.recurrence_frequency, o.recurrence_interval),
           (public.next_operational_due_date(o.due_date, o.recurrence_frequency, o.recurrence_interval)
             - (o.reminder_lead_days || ' day')::interval)::date,
           'obligation_due',
           'normal'
      from public.operational_obligations o
     where o.company_id = _company_id
       and o.archived_at is null
       and o.status in ('open','in_progress')
       and o.due_date is not null
       and o.recurrence_frequency <> 'none'
       and (o.recurrence_end_date is null
            or public.next_operational_due_date(o.due_date, o.recurrence_frequency, o.recurrence_interval)
               <= o.recurrence_end_date)
  )
  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title)
  select company_id, 'operational_obligation', id, reason, remind_on, due_date, severity, title
    from src where remind_on is not null
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_added = row_count; v_count := v_count + v_added;

  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title)
  select s.company_id, 'service_contract', s.id, 'contract_expiry',
         (s.end_date - (greatest(s.reminder_lead_days, coalesce(s.notice_period_days, 0)) || ' day')::interval)::date,
         s.end_date, 'normal', s.title
    from public.service_contracts s
   where s.company_id = _company_id and s.archived_at is null
     and s.status in ('draft','active','expiring') and s.end_date is not null
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_added = row_count; v_count := v_count + v_added;

  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title)
  select i.company_id, 'insurance_policy', i.id, 'insurance_renewal',
         (i.expiry_date - (i.reminder_lead_days || ' day')::interval)::date,
         i.expiry_date, 'high', i.title
    from public.insurance_policies i
   where i.company_id = _company_id and i.archived_at is null
     and i.status in ('draft','active','expiring') and i.expiry_date is not null
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_added = row_count; v_count := v_count + v_added;

  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title)
  select u.company_id, 'utility_contract', u.id, 'utility_review',
         (u.termination_date - (u.reminder_lead_days || ' day')::interval)::date,
         u.termination_date, 'normal', u.title
    from public.utility_contracts u
   where u.company_id = _company_id and u.archived_at is null
     and u.status in ('draft','active') and u.termination_date is not null
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_added = row_count; v_count := v_count + v_added;

  insert into public.operational_reminders (
    company_id, entity_type, entity_id, reason, remind_on, due_on, severity, title)
  select t.company_id, 'tax_schedule', t.id, 'tax_deadline',
         coalesce(d.reminder_date, (d.due_date - (t.reminder_lead_days || ' day')::interval)::date),
         d.due_date, 'high', coalesce(d.label, t.title)
    from public.tax_schedule_dates d
    join public.tax_schedules t on t.id = d.tax_schedule_id
   where t.company_id = _company_id and t.archived_at is null
     and d.status = 'scheduled'
  on conflict (company_id, entity_type, entity_id, reason, remind_on) do nothing;
  get diagnostics v_added = row_count; v_count := v_count + v_added;

  return v_count;
end;
$$;

-- ----------------------------------------------------------------- grants
revoke all on function public.create_operational_obligation(uuid,text,text,text,text,date,text,uuid,uuid,integer,text,integer,date,uuid,text,text) from public;
grant execute on function public.create_operational_obligation(uuid,text,text,text,text,date,text,uuid,uuid,integer,text,integer,date,uuid,text,text) to authenticated;
grant execute on function public.update_operational_obligation(uuid,text,text,text,text,text,date,text,uuid,uuid,integer,text,integer,date,text) to authenticated;
grant execute on function public.create_service_contract(uuid,text,text,uuid,text,date,date,text,integer,boolean,uuid,uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.update_service_contract(uuid,text,text,uuid,text,date,date,text,integer,boolean,text,uuid,integer,text) to authenticated;
grant execute on function public.create_insurance_policy(uuid,text,text,uuid,text,uuid,text,text,text,uuid,date,date,numeric,uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.update_insurance_policy(uuid,text,text,uuid,text,uuid,text,text,text,uuid,date,date,numeric,text,uuid,integer,text) to authenticated;
grant execute on function public.create_utility_contract(uuid,text,text,uuid,text,text,text,uuid,uuid,date,date,uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.update_utility_contract(uuid,text,text,uuid,text,text,text,uuid,uuid,date,date,text,uuid,integer,text) to authenticated;
grant execute on function public.create_tax_schedule(uuid,text,text,text,text,integer,uuid,uuid,uuid,integer,text,text,date[]) to authenticated;
grant execute on function public.update_tax_schedule(uuid,text,text,text,text,integer,uuid,text,uuid,integer,text) to authenticated;
grant execute on function public.add_tax_schedule_date(uuid,date,text,date,text) to authenticated;
grant execute on function public.archive_operational_record(text,uuid,text) to authenticated;
grant execute on function public.link_operational_commitment(text,uuid,uuid) to authenticated;
grant execute on function public.create_operational_commitment(text,uuid,text,text,numeric,text,uuid,date,date,text) to authenticated;
grant execute on function public.upsert_operational_reminder(uuid,text,uuid,text,date,date,text,text,text) to authenticated;
grant execute on function public.resolve_operational_reminder(uuid,text,text) to authenticated;
grant execute on function public.generate_operational_reminders(uuid) to authenticated;
grant execute on function public.operational_table_for(text) to authenticated;
grant execute on function public.next_operational_due_date(date,text,integer) to authenticated;