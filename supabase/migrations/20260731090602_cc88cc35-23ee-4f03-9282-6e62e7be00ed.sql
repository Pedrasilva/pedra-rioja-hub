-- ============================================================
-- Phase 8F.3 — Due-diligence checklist (operational only)
--   A due-diligence case is an operational record attached to an
--   acquisition opportunity. It owns no accounting value: no journal,
--   no commitment, no payment, no bank transaction and no cash-flow
--   entry is ever created here. §5C and §5D remain untouched.
-- ============================================================

-- ---------- 1. templates -------------------------------------------------
create table public.due_diligence_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  deal_type text not null default 'any'
    check (deal_type in ('any','residential','commercial','retail','office','industrial',
                         'land','building','mixed_use','portfolio','other')),
  is_active boolean not null default true,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_dd_template_code on public.due_diligence_templates(company_id, lower(code));
grant select on public.due_diligence_templates to authenticated;
grant all on public.due_diligence_templates to service_role;
alter table public.due_diligence_templates enable row level security;
create policy "dd_templates_select" on public.due_diligence_templates for select to authenticated
  using (public.can_view_company(company_id));

create table public.due_diligence_template_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid not null references public.due_diligence_templates(id) on delete cascade,
  section text not null default 'general',
  title text not null,
  description text,
  is_blocking boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_dd_template_items on public.due_diligence_template_items(template_id, sort_order);
grant select on public.due_diligence_template_items to authenticated;
grant all on public.due_diligence_template_items to service_role;
alter table public.due_diligence_template_items enable row level security;
create policy "dd_template_items_select" on public.due_diligence_template_items for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 2. cases ------------------------------------------------------
create table public.due_diligence_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  template_id uuid references public.due_diligence_templates(id) on delete set null,
  reference text not null,
  title text not null,
  status text not null default 'preparing'
    check (status in ('preparing','in_progress','on_hold','completed','abandoned')),
  recommendation text not null default 'pending'
    check (recommendation in ('pending','proceed','proceed_with_conditions','renegotiate','withdraw')),
  recommendation_notes text,
  summary text,
  assigned_to uuid,
  started_on date,
  target_date date,
  completed_at timestamptz,
  completed_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_dd_case_reference on public.due_diligence_cases(company_id, lower(reference));
create index idx_dd_case_opportunity on public.due_diligence_cases(opportunity_id, status);
create index idx_dd_case_company on public.due_diligence_cases(company_id, status);
grant select on public.due_diligence_cases to authenticated;
grant all on public.due_diligence_cases to service_role;
alter table public.due_diligence_cases enable row level security;
create policy "dd_cases_select" on public.due_diligence_cases for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 3. items ------------------------------------------------------
create table public.due_diligence_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null references public.due_diligence_cases(id) on delete cascade,
  section text not null default 'general',
  title text not null,
  description text,
  is_blocking boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','in_progress','complete','waived','failed')),
  risk_level text not null default 'none'
    check (risk_level in ('none','low','medium','high')),
  assignee_id uuid,
  due_date date,
  findings text,
  waiver_reason text,
  completed_at timestamptz,
  completed_by uuid,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_dd_items_case on public.due_diligence_items(case_id, section, sort_order);
grant select on public.due_diligence_items to authenticated;
grant all on public.due_diligence_items to service_role;
alter table public.due_diligence_items enable row level security;
create policy "dd_items_select" on public.due_diligence_items for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 4. status history ---------------------------------------------
create table public.due_diligence_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_id uuid not null references public.due_diligence_cases(id) on delete cascade,
  from_status text,
  to_status text not null,
  recommendation text,
  reason text,
  occurred_at timestamptz not null default now(),
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_dd_events_case on public.due_diligence_events(case_id, occurred_at desc);
grant select on public.due_diligence_events to authenticated;
grant all on public.due_diligence_events to service_role;
alter table public.due_diligence_events enable row level security;
create policy "dd_events_select" on public.due_diligence_events for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 5. updated_at + audit ------------------------------------------
create trigger trg_dd_templates_touch before update on public.due_diligence_templates
  for each row execute function public.set_updated_at();
create trigger trg_dd_template_items_touch before update on public.due_diligence_template_items
  for each row execute function public.set_updated_at();
create trigger trg_dd_cases_touch before update on public.due_diligence_cases
  for each row execute function public.set_updated_at();
create trigger trg_dd_items_touch before update on public.due_diligence_items
  for each row execute function public.set_updated_at();
create trigger trg_dd_events_touch before update on public.due_diligence_events
  for each row execute function public.set_updated_at();

create trigger trg_dd_templates_audit after insert or update or delete on public.due_diligence_templates
  for each row execute function public.tg_audit_row();
create trigger trg_dd_template_items_audit after insert or update or delete on public.due_diligence_template_items
  for each row execute function public.tg_audit_row();
create trigger trg_dd_cases_audit after insert or update or delete on public.due_diligence_cases
  for each row execute function public.tg_audit_row();
create trigger trg_dd_items_audit after insert or update or delete on public.due_diligence_items
  for each row execute function public.tg_audit_row();
create trigger trg_dd_events_audit after insert or update or delete on public.due_diligence_events
  for each row execute function public.tg_audit_row();

-- ---------- 6. write guard --------------------------------------------------
create or replace function public.tg_guard_due_diligence_record()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.dd_fn', true), '') = 'on';
begin
  if not internal then
    if tg_op = 'DELETE' then
      raise exception 'Due-diligence records are archived or abandoned, never deleted'
        using errcode='check_violation';
    end if;
    raise exception 'Due-diligence records are maintained by the due-diligence functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger trg_guard_dd_templates before insert or update or delete on public.due_diligence_templates
  for each row execute function public.tg_guard_due_diligence_record();
create trigger trg_guard_dd_template_items before insert or update or delete on public.due_diligence_template_items
  for each row execute function public.tg_guard_due_diligence_record();
create trigger trg_guard_dd_cases before insert or update or delete on public.due_diligence_cases
  for each row execute function public.tg_guard_due_diligence_record();
create trigger trg_guard_dd_items before insert or update or delete on public.due_diligence_items
  for each row execute function public.tg_guard_due_diligence_record();
create trigger trg_guard_dd_events before insert or update or delete on public.due_diligence_events
  for each row execute function public.tg_guard_due_diligence_record();

-- ---------- 7. templates: functions -----------------------------------------
create or replace function public.create_due_diligence_template(
  _company_id uuid, _name text, _code text default null,
  _description text default null, _deal_type text default 'any')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if not public.can_manage_company(_company_id) then
    raise exception 'You do not have permission to maintain checklist templates' using errcode='42501';
  end if;
  if coalesce(btrim(_name),'') = '' then
    raise exception 'A template needs a name' using errcode='check_violation';
  end if;
  v_code := coalesce(nullif(btrim(_code),''),
                     'DDT-' || substr(gen_random_uuid()::text, 1, 8));
  perform set_config('pedra.dd_fn','on',true);
  insert into public.due_diligence_templates (company_id, code, name, description, deal_type)
  values (_company_id, v_code, btrim(_name), _description, coalesce(_deal_type,'any'))
  returning id into v_id;
  perform set_config('pedra.dd_fn','off',true);
  return v_id;
end $$;

create or replace function public.add_due_diligence_template_item(
  _template_id uuid, _title text, _section text default 'general',
  _description text default null, _is_blocking boolean default false,
  _sort_order integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare t public.due_diligence_templates%rowtype; v_id uuid; v_order integer;
begin
  select * into t from public.due_diligence_templates where id = _template_id;
  if t.id is null then raise exception 'Template not found'; end if;
  if not public.can_manage_company(t.company_id) then
    raise exception 'You do not have permission to maintain checklist templates' using errcode='42501';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'A checklist item needs a title' using errcode='check_violation';
  end if;
  select coalesce(_sort_order, coalesce(max(sort_order), 0) + 10) into v_order
    from public.due_diligence_template_items where template_id = _template_id;
  perform set_config('pedra.dd_fn','on',true);
  insert into public.due_diligence_template_items
    (company_id, template_id, section, title, description, is_blocking, sort_order)
  values (t.company_id, _template_id, coalesce(nullif(btrim(_section),''),'general'),
          btrim(_title), _description, coalesce(_is_blocking,false), v_order)
  returning id into v_id;
  perform set_config('pedra.dd_fn','off',true);
  return v_id;
end $$;

create or replace function public.archive_due_diligence_template(_template_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.due_diligence_templates%rowtype;
begin
  select * into t from public.due_diligence_templates where id = _template_id for update;
  if t.id is null then raise exception 'Template not found'; end if;
  if not public.can_manage_company(t.company_id) then
    raise exception 'You do not have permission to archive a template' using errcode='42501';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_templates
     set archived_at = now(), archived_by = auth.uid(), is_active = false, updated_by = auth.uid()
   where id = _template_id;
  perform set_config('pedra.dd_fn','off',true);
end $$;

-- ---------- 8. cases: functions ----------------------------------------------
create or replace function public.create_due_diligence_case(
  _opportunity_id uuid, _title text default null, _template_id uuid default null,
  _assigned_to uuid default null, _target_date date default null,
  _reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid; v_ref text;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to open a due-diligence case' using errcode='42501';
  end if;
  if o.archived_at is not null then
    raise exception 'An archived opportunity cannot open due diligence' using errcode='check_violation';
  end if;
  if _template_id is not null and not exists (
    select 1 from public.due_diligence_templates t
     where t.id = _template_id and t.company_id = o.company_id) then
    raise exception 'Unknown checklist template' using errcode='check_violation';
  end if;
  if exists (select 1 from public.due_diligence_cases c
              where c.opportunity_id = _opportunity_id
                and c.status not in ('abandoned') and c.archived_at is null) then
    raise exception 'This opportunity already has an open due-diligence case'
      using errcode='check_violation';
  end if;

  v_ref := coalesce(nullif(btrim(_reference),''),
                    'DD-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6));
  perform set_config('pedra.dd_fn','on',true);
  insert into public.due_diligence_cases
    (company_id, opportunity_id, template_id, reference, title, assigned_to, target_date, started_on)
  values (o.company_id, _opportunity_id, _template_id, v_ref,
          coalesce(nullif(btrim(_title),''), 'Due diligence — ' || o.title),
          _assigned_to, _target_date, current_date)
  returning id into v_id;

  if _template_id is not null then
    insert into public.due_diligence_items
      (company_id, case_id, section, title, description, is_blocking, sort_order)
    select o.company_id, v_id, i.section, i.title, i.description, i.is_blocking, i.sort_order
      from public.due_diligence_template_items i
     where i.template_id = _template_id
     order by i.sort_order;
  end if;

  insert into public.due_diligence_events (company_id, case_id, from_status, to_status, reason)
  values (o.company_id, v_id, null, 'preparing', 'Case opened');
  perform set_config('pedra.dd_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_due_diligence_case(
  _case_id uuid, _title text default null, _assigned_to uuid default null,
  _target_date date default null, _summary text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype;
begin
  select * into c from public.due_diligence_cases where id = _case_id for update;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to edit this case' using errcode='42501';
  end if;
  if c.status = 'completed' or c.archived_at is not null then
    raise exception 'A completed or archived case cannot be edited' using errcode='check_violation';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_cases set
    title = coalesce(nullif(btrim(_title),''), title),
    assigned_to = coalesce(_assigned_to, assigned_to),
    target_date = coalesce(_target_date, target_date),
    summary = coalesce(_summary, summary),
    updated_by = auth.uid()
  where id = _case_id;
  perform set_config('pedra.dd_fn','off',true);
end $$;

create or replace function public.add_due_diligence_item(
  _case_id uuid, _title text, _section text default 'general',
  _description text default null, _is_blocking boolean default false,
  _assignee_id uuid default null, _due_date date default null,
  _sort_order integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype; v_id uuid; v_order integer;
begin
  select * into c from public.due_diligence_cases where id = _case_id;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to add checklist items' using errcode='42501';
  end if;
  if c.status in ('completed','abandoned') or c.archived_at is not null then
    raise exception 'This case is closed to new checklist items' using errcode='check_violation';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'A checklist item needs a title' using errcode='check_violation';
  end if;
  select coalesce(_sort_order, coalesce(max(sort_order), 0) + 10) into v_order
    from public.due_diligence_items where case_id = _case_id;
  perform set_config('pedra.dd_fn','on',true);
  insert into public.due_diligence_items
    (company_id, case_id, section, title, description, is_blocking, assignee_id, due_date, sort_order)
  values (c.company_id, _case_id, coalesce(nullif(btrim(_section),''),'general'), btrim(_title),
          _description, coalesce(_is_blocking,false), _assignee_id, _due_date, v_order)
  returning id into v_id;
  perform set_config('pedra.dd_fn','off',true);
  return v_id;
end $$;

create or replace function public.set_due_diligence_item_status(
  _item_id uuid, _status text, _findings text default null,
  _risk_level text default null, _waiver_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare i public.due_diligence_items%rowtype; c public.due_diligence_cases%rowtype;
begin
  select * into i from public.due_diligence_items where id = _item_id for update;
  if i.id is null then raise exception 'Checklist item not found'; end if;
  select * into c from public.due_diligence_cases where id = i.case_id;
  if not public.can_record_company(i.company_id) then
    raise exception 'You do not have permission to update this item' using errcode='42501';
  end if;
  if c.status in ('completed','abandoned') or c.archived_at is not null then
    raise exception 'This case is closed' using errcode='check_violation';
  end if;
  if _status not in ('pending','in_progress','complete','waived','failed') then
    raise exception 'Unknown checklist status' using errcode='check_violation';
  end if;
  if _status = 'waived' then
    if not public.can_manage_company(i.company_id) then
      raise exception 'Only a manager can waive a checklist item' using errcode='42501';
    end if;
    if coalesce(btrim(_waiver_reason),'') = '' then
      raise exception 'A waiver needs a reason' using errcode='check_violation';
    end if;
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_items set
    status = _status,
    findings = coalesce(_findings, findings),
    risk_level = coalesce(_risk_level, risk_level),
    waiver_reason = case when _status = 'waived' then btrim(_waiver_reason) else waiver_reason end,
    completed_at = case when _status in ('complete','waived') then now() else null end,
    completed_by = case when _status in ('complete','waived') then auth.uid() else null end,
    updated_by = auth.uid()
  where id = _item_id;

  if c.status = 'preparing' then
    update public.due_diligence_cases
       set status = 'in_progress', updated_by = auth.uid() where id = c.id;
    insert into public.due_diligence_events (company_id, case_id, from_status, to_status, reason)
    values (c.company_id, c.id, 'preparing', 'in_progress', 'First checklist activity');
  end if;
  perform set_config('pedra.dd_fn','off',true);
end $$;

create or replace function public.set_due_diligence_case_status(
  _case_id uuid, _status text, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype; v_event uuid;
begin
  select * into c from public.due_diligence_cases where id = _case_id for update;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if _status not in ('preparing','in_progress','on_hold','abandoned') then
    raise exception 'Use complete_due_diligence_case to complete a case' using errcode='check_violation';
  end if;
  if _status = 'abandoned' then
    if not public.can_manage_company(c.company_id) then
      raise exception 'You do not have permission to abandon this case' using errcode='42501';
    end if;
  elsif not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to change this case' using errcode='42501';
  end if;
  if c.status = 'completed' then
    raise exception 'A completed case cannot change status' using errcode='check_violation';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_cases set status = _status, updated_by = auth.uid() where id = _case_id;
  insert into public.due_diligence_events (company_id, case_id, from_status, to_status, reason)
  values (c.company_id, _case_id, c.status, _status, _reason)
  returning id into v_event;
  perform set_config('pedra.dd_fn','off',true);
  return v_event;
end $$;

create or replace function public.complete_due_diligence_case(
  _case_id uuid, _recommendation text, _summary text default null,
  _recommendation_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype; v_outstanding int;
begin
  select * into c from public.due_diligence_cases where id = _case_id for update;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to complete due diligence' using errcode='42501';
  end if;
  if c.status = 'completed' then
    raise exception 'This case is already completed' using errcode='check_violation';
  end if;
  if c.status = 'abandoned' or c.archived_at is not null then
    raise exception 'An abandoned or archived case cannot be completed' using errcode='check_violation';
  end if;
  if _recommendation not in ('proceed','proceed_with_conditions','renegotiate','withdraw') then
    raise exception 'Unknown recommendation' using errcode='check_violation';
  end if;
  select count(*) into v_outstanding from public.due_diligence_items i
   where i.case_id = _case_id and i.is_blocking and i.status not in ('complete','waived');
  if v_outstanding > 0 then
    raise exception 'Due diligence has % blocking item(s) still outstanding', v_outstanding
      using errcode='check_violation';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_cases set
    status = 'completed', recommendation = _recommendation,
    recommendation_notes = _recommendation_notes,
    summary = coalesce(_summary, summary),
    completed_at = now(), completed_by = auth.uid(), updated_by = auth.uid()
  where id = _case_id;
  insert into public.due_diligence_events
    (company_id, case_id, from_status, to_status, recommendation, reason)
  values (c.company_id, _case_id, c.status, 'completed', _recommendation, _summary);
  perform set_config('pedra.dd_fn','off',true);
end $$;

create or replace function public.archive_due_diligence_case(
  _case_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype;
begin
  select * into c from public.due_diligence_cases where id = _case_id for update;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to archive this case' using errcode='42501';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_cases
     set archived_at = now(), archived_by = auth.uid(), archive_reason = _reason, updated_by = auth.uid()
   where id = _case_id;
  perform set_config('pedra.dd_fn','off',true);
end $$;

create or replace function public.restore_due_diligence_case(_case_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.due_diligence_cases%rowtype;
begin
  select * into c from public.due_diligence_cases where id = _case_id for update;
  if c.id is null then raise exception 'Due-diligence case not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to restore this case' using errcode='42501';
  end if;
  perform set_config('pedra.dd_fn','on',true);
  update public.due_diligence_cases
     set archived_at = null, archived_by = null, archive_reason = null, updated_by = auth.uid()
   where id = _case_id;
  perform set_config('pedra.dd_fn','off',true);
end $$;

-- ---------- 9. completion predicate (consumed by Phase 8F.4) -----------------
create or replace function public.due_diligence_permits_completion(_case_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select c.status = 'completed'
       and c.recommendation in ('proceed','proceed_with_conditions')
       and c.archived_at is null
      from public.due_diligence_cases c where c.id = _case_id
  ), false)
$$;

-- ---------- 10. derived views -------------------------------------------------
create or replace view public.v_due_diligence_case
with (security_invoker = true) as
select
  c.id as case_id,
  c.company_id,
  c.opportunity_id,
  o.reference as opportunity_reference,
  o.title as opportunity_title,
  o.stage as opportunity_stage,
  c.template_id,
  t.name as template_name,
  c.reference,
  c.title,
  c.status,
  c.recommendation,
  c.recommendation_notes,
  c.summary,
  c.assigned_to,
  c.started_on,
  c.target_date,
  c.completed_at,
  c.archived_at,
  (c.archived_at is not null) as is_archived,
  c.created_at,
  c.updated_at,
  coalesce(i.item_count, 0) as item_count,
  coalesce(i.done_count, 0) as done_count,
  coalesce(i.blocking_count, 0) as blocking_count,
  coalesce(i.blocking_outstanding, 0) as blocking_outstanding,
  coalesce(i.failed_count, 0) as failed_count,
  case when coalesce(i.item_count, 0) = 0 then 0
       else round(coalesce(i.done_count,0) * 100.0 / i.item_count) end as progress_pct,
  (c.status = 'completed' and c.recommendation in ('proceed','proceed_with_conditions')
     and c.archived_at is null) as permits_completion
from public.due_diligence_cases c
join public.acquisition_opportunities o on o.id = c.opportunity_id
left join public.due_diligence_templates t on t.id = c.template_id
left join lateral (
  select count(*)::int as item_count,
         count(*) filter (where x.status in ('complete','waived'))::int as done_count,
         count(*) filter (where x.is_blocking)::int as blocking_count,
         count(*) filter (where x.is_blocking and x.status not in ('complete','waived'))::int
           as blocking_outstanding,
         count(*) filter (where x.status = 'failed')::int as failed_count
    from public.due_diligence_items x where x.case_id = c.id) i on true;

grant select on public.v_due_diligence_case to authenticated;

create or replace view public.v_due_diligence_item
with (security_invoker = true) as
select
  i.id as item_id,
  i.company_id,
  i.case_id,
  i.section,
  i.title,
  i.description,
  i.is_blocking,
  i.status,
  i.risk_level,
  i.assignee_id,
  i.due_date,
  i.findings,
  i.waiver_reason,
  i.completed_at,
  i.sort_order,
  i.created_at,
  coalesce(d.evidence_count, 0) as evidence_count
from public.due_diligence_items i
left join lateral (
  select count(*)::int as evidence_count from public.document_links l
   where l.entity_type = 'due_diligence_item' and l.entity_id = i.id) d on true;

grant select on public.v_due_diligence_item to authenticated;