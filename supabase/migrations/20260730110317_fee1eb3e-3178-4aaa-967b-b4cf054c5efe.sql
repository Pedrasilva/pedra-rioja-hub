-- =====================================================================
-- Phase 8D (1) — Budgets: planning records only.
--   * No budget row stores committed / invoiced / paid / remaining /
--     variance. All of it is derived (§5C, §5D).
--   * Budgets never write cash_flow_entries, bookkeeping or banking.
--   * Attribution is via the existing Dimensions model only.
--   * Published versions are immutable; revision = new version.
-- =====================================================================

create or replace function public.tg_guard_budget_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Budget records are archived, never deleted' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- ------------------------------------------------------------- budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  name text not null,
  fiscal_year integer not null check (fiscal_year between 1900 and 2200),
  currency char(3) not null default 'EUR',
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.property_units(id) on delete set null,
  project_id uuid references public.capex_projects(id) on delete set null,
  status text not null default 'open' check (status in ('open','closed','archived')),
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
grant select, insert, update on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy budgets_select on public.budgets for select to authenticated
  using (public.can_view_company(company_id));
create policy budgets_insert on public.budgets for insert to authenticated
  with check (public.can_record_company(company_id));
create policy budgets_update on public.budgets for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));
create index idx_budgets_company on public.budgets (company_id, fiscal_year);
create index idx_budgets_property on public.budgets (property_id);
create index idx_budgets_project on public.budgets (project_id);

-- ---------------------------------------------------- budget_versions
create table public.budget_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  version_no integer not null,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','published','superseded','archived')),
  approval_status text not null default 'not_requested'
    check (approval_status in ('not_requested','pending','approved','rejected')),
  approval_request_id uuid,
  is_current boolean not null default false,
  reason text,
  notes text,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (budget_id, version_no)
);
grant select, insert, update on public.budget_versions to authenticated;
grant all on public.budget_versions to service_role;
alter table public.budget_versions enable row level security;
create policy bv_select on public.budget_versions for select to authenticated
  using (public.can_view_company(company_id));
create policy bv_insert on public.budget_versions for insert to authenticated
  with check (public.can_record_company(company_id));
create policy bv_update on public.budget_versions for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));
create index idx_bv_budget on public.budget_versions (budget_id, version_no desc);
create unique index uq_bv_current on public.budget_versions (budget_id) where is_current;

-- ------------------------------------------------------- budget_lines
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  budget_version_id uuid not null references public.budget_versions(id) on delete cascade,
  line_no integer not null default 1,
  label text not null,
  direction text not null default 'outflow' check (direction in ('inflow','outflow')),
  period_month integer check (period_month between 1 and 12),
  planned_amount numeric(14,2) not null default 0,
  dimension_id uuid references public.dimensions(id) on delete restrict,
  dimension_value_id uuid references public.dimension_values(id) on delete restrict,
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.property_units(id) on delete set null,
  project_id uuid references public.capex_projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
grant select, insert, update, delete on public.budget_lines to authenticated;
grant all on public.budget_lines to service_role;
alter table public.budget_lines enable row level security;
create policy bl_select on public.budget_lines for select to authenticated
  using (public.can_view_company(company_id));
create policy bl_insert on public.budget_lines for insert to authenticated
  with check (public.can_record_company(company_id));
create policy bl_update on public.budget_lines for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));
create policy bl_delete on public.budget_lines for delete to authenticated
  using (public.can_record_company(company_id));
create index idx_bl_version on public.budget_lines (budget_version_id, line_no);
create index idx_bl_dimension_value on public.budget_lines (dimension_value_id);
create index idx_bl_property on public.budget_lines (property_id);

-- ------------------------------------------------- touch / audit / guard
create trigger trg_budgets_touch before update on public.budgets
  for each row execute function public.tg_touch_row();
create trigger trg_bv_touch before update on public.budget_versions
  for each row execute function public.tg_touch_row();
create trigger trg_bl_touch before update on public.budget_lines
  for each row execute function public.tg_touch_row();

create trigger trg_budgets_audit after insert or update or delete on public.budgets
  for each row execute function public.tg_audit_row();
create trigger trg_bv_audit after insert or update or delete on public.budget_versions
  for each row execute function public.tg_audit_row();
create trigger trg_bl_audit after insert or update or delete on public.budget_lines
  for each row execute function public.tg_audit_row();

create trigger trg_budgets_no_delete before delete on public.budgets
  for each row execute function public.tg_guard_budget_row();
create trigger trg_bv_no_delete before delete on public.budget_versions
  for each row execute function public.tg_guard_budget_row();

-- Published versions are immutable: neither the version envelope (beyond
-- lifecycle transitions applied by the privileged RPCs) nor its lines.
create or replace function public.tg_guard_budget_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.budget_fn', true), '') = 'on';
begin
  if internal then return new; end if;
  if old.status in ('published','superseded','archived') then
    raise exception 'A published budget version cannot be edited. Create a new version.'
      using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Budget version status changes must go through the budget functions'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger trg_bv_guard before update on public.budget_versions
  for each row execute function public.tg_guard_budget_version();

create or replace function public.tg_guard_budget_line()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text; internal boolean := coalesce(current_setting('pedra.budget_fn', true), '') = 'on';
begin
  if internal then return coalesce(new, old); end if;
  select status into v_status from public.budget_versions
   where id = coalesce(new.budget_version_id, old.budget_version_id);
  if v_status is distinct from 'draft' then
    raise exception 'Budget lines can only be changed while the version is a draft'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_bl_guard before insert or update or delete on public.budget_lines
  for each row execute function public.tg_guard_budget_line();

-- =====================================================================
-- Derived reporting. Nothing below is stored.
--   committed / invoiced / paid come from commitments (the only owner of
--   expected expenditure) matched to the line's scope and fiscal period.
--   A NULL scope column on the line means "not filtered on".
-- =====================================================================
create or replace view public.v_budget_line_performance
with (security_invoker = true) as
select
  l.id as line_id,
  l.company_id,
  l.budget_version_id,
  v.budget_id,
  b.fiscal_year,
  b.name as budget_name,
  b.currency,
  v.version_no,
  v.status as version_status,
  l.line_no, l.label, l.direction, l.period_month,
  l.planned_amount,
  l.dimension_id, l.dimension_value_id, dv.label as dimension_value_label,
  coalesce(l.property_id, b.property_id) as property_id,
  coalesce(l.unit_id, b.unit_id) as unit_id,
  coalesce(l.project_id, b.project_id) as project_id,
  l.notes,
  coalesce(d.committed_amount, 0) as committed_amount,
  coalesce(d.invoiced_amount, 0) as invoiced_amount,
  coalesce(d.paid_amount, 0) as paid_amount,
  l.planned_amount - coalesce(d.committed_amount, 0) as remaining_amount,
  coalesce(d.committed_amount, 0) - l.planned_amount as variance_amount,
  case when l.planned_amount = 0 then null
       else round((coalesce(d.committed_amount, 0) / l.planned_amount) * 100, 2) end as consumed_pct
from public.budget_lines l
join public.budget_versions v on v.id = l.budget_version_id
join public.budgets b on b.id = v.budget_id
left join public.dimension_values dv on dv.id = l.dimension_value_id
left join lateral (
  select
    sum(cs.approved_committed_amount) as committed_amount,
    sum(cs.invoiced_amount) as invoiced_amount,
    sum(cs.paid_amount) as paid_amount
  from public.v_commitment_summary cs
  where cs.company_id = l.company_id
    and cs.deleted_at is null
    and extract(year from coalesce(cs.start_date, cs.created_at::date)) = b.fiscal_year
    and (l.period_month is null
         or extract(month from coalesce(cs.start_date, cs.created_at::date)) = l.period_month)
    and (coalesce(l.property_id, b.property_id) is null
         or cs.property_id = coalesce(l.property_id, b.property_id))
    and (coalesce(l.unit_id, b.unit_id) is null
         or cs.unit_id = coalesce(l.unit_id, b.unit_id))
    and (coalesce(l.project_id, b.project_id) is null
         or cs.project_id = coalesce(l.project_id, b.project_id))
    and (l.dimension_value_id is null or exists (
          select 1 from public.transaction_dimensions td
           where td.source_type = 'commitment' and td.source_id = cs.commitment_id
             and td.dimension_value_id = l.dimension_value_id))
) d on true;

grant select on public.v_budget_line_performance to authenticated;

create or replace view public.v_budget_version_summary
with (security_invoker = true) as
select
  v.id as version_id,
  v.company_id,
  v.budget_id,
  b.code, b.name, b.fiscal_year, b.currency, b.status as budget_status,
  b.property_id, b.unit_id, b.project_id,
  p.name as property_name,
  v.version_no, v.status, v.approval_status, v.approval_request_id,
  v.is_current, v.reason, v.notes,
  v.published_at, v.published_by, v.archived_at,
  v.created_at, v.updated_at,
  coalesce(t.line_count, 0) as line_count,
  coalesce(t.planned_amount, 0) as planned_amount,
  coalesce(t.planned_inflow, 0) as planned_inflow,
  coalesce(t.planned_outflow, 0) as planned_outflow,
  coalesce(t.committed_amount, 0) as committed_amount,
  coalesce(t.invoiced_amount, 0) as invoiced_amount,
  coalesce(t.paid_amount, 0) as paid_amount,
  coalesce(t.planned_amount, 0) - coalesce(t.committed_amount, 0) as remaining_amount,
  coalesce(t.committed_amount, 0) - coalesce(t.planned_amount, 0) as variance_amount
from public.budget_versions v
join public.budgets b on b.id = v.budget_id
left join public.properties p on p.id = b.property_id
left join lateral (
  select count(*) as line_count,
         sum(lp.planned_amount) as planned_amount,
         sum(lp.planned_amount) filter (where lp.direction = 'inflow') as planned_inflow,
         sum(lp.planned_amount) filter (where lp.direction = 'outflow') as planned_outflow,
         sum(lp.committed_amount) as committed_amount,
         sum(lp.invoiced_amount) as invoiced_amount,
         sum(lp.paid_amount) as paid_amount
    from public.v_budget_line_performance lp
   where lp.budget_version_id = v.id) t on true;

grant select on public.v_budget_version_summary to authenticated;

-- =====================================================================
-- Privileged RPCs
-- =====================================================================
create or replace function public.create_budget(
  _company_id uuid, _name text, _fiscal_year integer,
  _currency text default 'EUR', _code text default null,
  _property_id uuid default null, _unit_id uuid default null,
  _project_id uuid default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_budget uuid; v_version uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create budgets' using errcode='42501';
  end if;
  insert into public.budgets (company_id, name, fiscal_year, currency, code,
                              property_id, unit_id, project_id, notes)
  values (_company_id, _name, _fiscal_year, coalesce(_currency,'EUR'), _code,
          _property_id, _unit_id, _project_id, _notes)
  returning id into v_budget;

  perform set_config('pedra.budget_fn', 'on', true);
  insert into public.budget_versions (company_id, budget_id, version_no, status, reason)
  values (_company_id, v_budget, 1, 'draft', 'Initial version')
  returning id into v_version;
  perform set_config('pedra.budget_fn', 'off', true);
  return v_budget;
end $$;

create or replace function public.update_budget(
  _budget_id uuid, _name text default null, _code text default null,
  _fiscal_year integer default null, _currency text default null,
  _property_id uuid default null, _unit_id uuid default null,
  _project_id uuid default null, _status text default null, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.budgets%rowtype;
begin
  select * into b from public.budgets where id = _budget_id;
  if b.id is null then raise exception 'Budget not found'; end if;
  if not public.can_record_company(b.company_id) then
    raise exception 'You do not have permission to edit budgets' using errcode='42501';
  end if;
  if b.archived_at is not null then
    raise exception 'An archived budget cannot be edited' using errcode='check_violation';
  end if;
  update public.budgets set
    name = coalesce(_name, name),
    code = coalesce(_code, code),
    fiscal_year = coalesce(_fiscal_year, fiscal_year),
    currency = coalesce(_currency, currency),
    property_id = coalesce(_property_id, property_id),
    unit_id = coalesce(_unit_id, unit_id),
    project_id = coalesce(_project_id, project_id),
    status = coalesce(_status, status),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _budget_id;
end $$;

create or replace function public.create_budget_version(
  _budget_id uuid, _reason text default null, _copy_from_version_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare b public.budgets%rowtype; v_no integer; v_id uuid; src uuid;
begin
  select * into b from public.budgets where id = _budget_id;
  if b.id is null then raise exception 'Budget not found'; end if;
  if not public.can_record_company(b.company_id) then
    raise exception 'You do not have permission to revise budgets' using errcode='42501';
  end if;
  if b.archived_at is not null then
    raise exception 'An archived budget cannot be revised' using errcode='check_violation';
  end if;
  if exists (select 1 from public.budget_versions
              where budget_id = _budget_id and status in ('draft','pending_approval')) then
    raise exception 'This budget already has an open draft version' using errcode='check_violation';
  end if;

  select coalesce(max(version_no), 0) + 1 into v_no
    from public.budget_versions where budget_id = _budget_id;

  perform set_config('pedra.budget_fn', 'on', true);
  insert into public.budget_versions (company_id, budget_id, version_no, status, reason)
  values (b.company_id, _budget_id, v_no, 'draft', _reason)
  returning id into v_id;

  src := _copy_from_version_id;
  if src is null then
    select id into src from public.budget_versions
     where budget_id = _budget_id and status = 'published'
     order by version_no desc limit 1;
  end if;
  if src is not null then
    insert into public.budget_lines (company_id, budget_version_id, line_no, label, direction,
      period_month, planned_amount, dimension_id, dimension_value_id,
      property_id, unit_id, project_id, notes)
    select b.company_id, v_id, line_no, label, direction, period_month, planned_amount,
           dimension_id, dimension_value_id, property_id, unit_id, project_id, notes
      from public.budget_lines where budget_version_id = src;
  end if;
  perform set_config('pedra.budget_fn', 'off', true);
  return v_id;
end $$;

create or replace function public.upsert_budget_line(
  _version_id uuid, _label text, _planned_amount numeric,
  _line_id uuid default null, _direction text default 'outflow',
  _line_no integer default null, _period_month integer default null,
  _dimension_id uuid default null, _dimension_value_id uuid default null,
  _property_id uuid default null, _unit_id uuid default null,
  _project_id uuid default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.budget_versions%rowtype; v_id uuid; v_no integer;
begin
  select * into v from public.budget_versions where id = _version_id;
  if v.id is null then raise exception 'Budget version not found'; end if;
  if not public.can_record_company(v.company_id) then
    raise exception 'You do not have permission to edit budget lines' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'Only a draft budget version can be edited' using errcode='check_violation';
  end if;
  if _dimension_value_id is not null and not exists (
      select 1 from public.dimension_values where id = _dimension_value_id and company_id = v.company_id) then
    raise exception 'That dimension value belongs to another company' using errcode='42501';
  end if;

  perform set_config('pedra.budget_fn', 'on', true);
  if _line_id is null then
    select coalesce(_line_no, coalesce(max(line_no), 0) + 1) into v_no
      from public.budget_lines where budget_version_id = _version_id;
    insert into public.budget_lines (company_id, budget_version_id, line_no, label, direction,
      period_month, planned_amount, dimension_id, dimension_value_id,
      property_id, unit_id, project_id, notes)
    values (v.company_id, _version_id, v_no, _label, coalesce(_direction,'outflow'),
      _period_month, coalesce(_planned_amount, 0), _dimension_id, _dimension_value_id,
      _property_id, _unit_id, _project_id, _notes)
    returning id into v_id;
  else
    update public.budget_lines set
      label = coalesce(_label, label),
      direction = coalesce(_direction, direction),
      line_no = coalesce(_line_no, line_no),
      period_month = _period_month,
      planned_amount = coalesce(_planned_amount, planned_amount),
      dimension_id = _dimension_id,
      dimension_value_id = _dimension_value_id,
      property_id = _property_id,
      unit_id = _unit_id,
      project_id = _project_id,
      notes = coalesce(_notes, notes),
      updated_by = auth.uid()
    where id = _line_id and budget_version_id = _version_id
    returning id into v_id;
    if v_id is null then
      perform set_config('pedra.budget_fn', 'off', true);
      raise exception 'Budget line not found on this version' using errcode='check_violation';
    end if;
  end if;
  perform set_config('pedra.budget_fn', 'off', true);
  return v_id;
end $$;

create or replace function public.delete_budget_line(_line_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.budget_lines%rowtype; v public.budget_versions%rowtype;
begin
  select * into l from public.budget_lines where id = _line_id;
  if l.id is null then raise exception 'Budget line not found'; end if;
  select * into v from public.budget_versions where id = l.budget_version_id;
  if not public.can_record_company(l.company_id) then
    raise exception 'You do not have permission to edit budget lines' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'Only a draft budget version can be edited' using errcode='check_violation';
  end if;
  perform set_config('pedra.budget_fn', 'on', true);
  delete from public.budget_lines where id = _line_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

create or replace function public.publish_budget_version(_version_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.budget_versions%rowtype;
begin
  select * into v from public.budget_versions where id = _version_id for update;
  if v.id is null then raise exception 'Budget version not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to publish a budget' using errcode='42501';
  end if;
  if v.status not in ('draft','pending_approval') then
    raise exception 'Only a draft budget version can be published' using errcode='check_violation';
  end if;
  if v.approval_status = 'pending' then
    raise exception 'This version is awaiting approval' using errcode='check_violation';
  end if;
  if not exists (select 1 from public.budget_lines where budget_version_id = _version_id) then
    raise exception 'A budget version needs at least one line before publication'
      using errcode='check_violation';
  end if;

  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set status = 'superseded', is_current = false, updated_by = auth.uid()
   where budget_id = v.budget_id and status = 'published';
  update public.budget_versions
     set status = 'published', is_current = true, published_at = now(),
         published_by = auth.uid(), updated_by = auth.uid()
   where id = _version_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

create or replace function public.archive_budget_version(_version_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.budget_versions%rowtype;
begin
  select * into v from public.budget_versions where id = _version_id for update;
  if v.id is null then raise exception 'Budget version not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to archive a budget version' using errcode='42501';
  end if;
  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set status = 'archived', is_current = false, archived_at = now(),
         archive_reason = _reason, updated_by = auth.uid()
   where id = _version_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

create or replace function public.archive_budget(_budget_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.budgets%rowtype;
begin
  select * into b from public.budgets where id = _budget_id for update;
  if b.id is null then raise exception 'Budget not found'; end if;
  if not public.can_manage_company(b.company_id) then
    raise exception 'You do not have permission to archive a budget' using errcode='42501';
  end if;
  update public.budgets set status = 'archived', archived_at = now(),
         archive_reason = _reason, updated_by = auth.uid()
   where id = _budget_id;
end $$;

-- ---------------- optional approval through the generic engine --------
insert into public.approval_target_types (target_type, label, description)
values ('budget_version','Budget version','Budget version submitted for publication')
on conflict (target_type) do nothing;

create or replace function public.approval_cb_budget_version_granted(_request_id uuid, _target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set approval_status = 'approved', status = 'draft', approval_request_id = _request_id
   where id = _target_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

create or replace function public.approval_cb_budget_version_rejected(_request_id uuid, _target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set approval_status = 'rejected', status = 'draft', approval_request_id = _request_id
   where id = _target_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

create or replace function public.approval_cb_budget_version_released(_request_id uuid, _target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set approval_status = 'not_requested', status = 'draft', approval_request_id = _request_id
   where id = _target_id;
  perform set_config('pedra.budget_fn', 'off', true);
end $$;

insert into public.approval_callbacks (target_type, event, function_name) values
  ('budget_version','granted','public.approval_cb_budget_version_granted'),
  ('budget_version','rejected','public.approval_cb_budget_version_rejected'),
  ('budget_version','returned','public.approval_cb_budget_version_released'),
  ('budget_version','withdrawn','public.approval_cb_budget_version_released'),
  ('budget_version','expired','public.approval_cb_budget_version_released')
on conflict do nothing;

create or replace function public.request_budget_version_approval(
  _version_id uuid, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.budget_versions%rowtype; b public.budgets%rowtype;
        v_req uuid; v_total numeric;
begin
  select * into v from public.budget_versions where id = _version_id for update;
  if v.id is null then raise exception 'Budget version not found'; end if;
  select * into b from public.budgets where id = v.budget_id;
  if not public.can_record_company(v.company_id) then
    raise exception 'You do not have permission to request approval' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'Only a draft budget version can be sent for approval' using errcode='check_violation';
  end if;
  select coalesce(sum(planned_amount) filter (where direction = 'outflow'), 0)
    into v_total from public.budget_lines where budget_version_id = _version_id;

  v_req := public.submit_approval_request(
    _company_id => v.company_id,
    _target_type => 'budget_version',
    _target_id => v.id,
    _reason => _reason,
    _amount => v_total,
    _snapshot => jsonb_build_object(
      'budget_name', b.name, 'code', b.code, 'fiscal_year', b.fiscal_year,
      'currency', b.currency, 'version_no', v.version_no, 'planned_outflow', v_total),
    _target_label => b.name || ' v' || v.version_no);

  perform set_config('pedra.budget_fn', 'on', true);
  update public.budget_versions
     set status = 'pending_approval', approval_status = 'pending',
         approval_request_id = v_req, updated_by = auth.uid()
   where id = _version_id;
  perform set_config('pedra.budget_fn', 'off', true);
  return v_req;
end $$;

-- ------------------------------------------------------------- grants
revoke all on function public.create_budget(uuid,text,integer,text,text,uuid,uuid,uuid,text) from public;
revoke all on function public.update_budget(uuid,text,text,integer,text,uuid,uuid,uuid,text,text) from public;
revoke all on function public.create_budget_version(uuid,text,uuid) from public;
revoke all on function public.upsert_budget_line(uuid,text,numeric,uuid,text,integer,integer,uuid,uuid,uuid,uuid,uuid,text) from public;
revoke all on function public.delete_budget_line(uuid) from public;
revoke all on function public.publish_budget_version(uuid) from public;
revoke all on function public.archive_budget_version(uuid,text) from public;
revoke all on function public.archive_budget(uuid,text) from public;
revoke all on function public.request_budget_version_approval(uuid,text) from public;
revoke all on function public.approval_cb_budget_version_granted(uuid,uuid) from public;
revoke all on function public.approval_cb_budget_version_rejected(uuid,uuid) from public;
revoke all on function public.approval_cb_budget_version_released(uuid,uuid) from public;
revoke all on function public.tg_guard_budget_row() from public;
revoke all on function public.tg_guard_budget_version() from public;
revoke all on function public.tg_guard_budget_line() from public;

grant execute on function public.create_budget(uuid,text,integer,text,text,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.update_budget(uuid,text,text,integer,text,uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.create_budget_version(uuid,text,uuid) to authenticated;
grant execute on function public.upsert_budget_line(uuid,text,numeric,uuid,text,integer,integer,uuid,uuid,uuid,uuid,uuid,text) to authenticated;
grant execute on function public.delete_budget_line(uuid) to authenticated;
grant execute on function public.publish_budget_version(uuid) to authenticated;
grant execute on function public.archive_budget_version(uuid,text) to authenticated;
grant execute on function public.archive_budget(uuid,text) to authenticated;
grant execute on function public.request_budget_version_approval(uuid,text) to authenticated;
