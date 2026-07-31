-- ============================================================
-- Phase 8F.4 — Closing & Handover (operational only)
--   A closing case orchestrates the hand-over of an accepted deal into a
--   managed property. It owns no accounting value: no journal, no
--   commitment, no payment, no bank transaction, no cash-flow entry.
--   §5C and §5D remain untouched.
-- ============================================================

-- ---------- 1. closing cases ---------------------------------------------
create table public.closing_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  due_diligence_case_id uuid references public.due_diligence_cases(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  reference text not null,
  title text not null,
  status text not null default 'preparing'
    check (status in ('preparing','conditions_pending','ready_to_close','completed','cancelled')),
  handover_status text not null default 'not_started'
    check (handover_status in ('not_started','in_progress','complete')),
  currency char(3) not null default 'EUR',
  -- indicative reference only; the authoritative amount lives on the
  -- commitment and on the posted financial documents (§5D)
  agreed_price numeric(14,2) check (agreed_price is null or agreed_price >= 0),
  notary_name text,
  notary_reference text,
  deed_date date,
  target_completion_date date,
  actual_completion_date date,
  possession_date date,
  notes text,
  completed_at timestamptz,
  completed_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_closing_reference on public.closing_cases(company_id, lower(reference));
create index idx_closing_opportunity on public.closing_cases(opportunity_id, status);
create index idx_closing_company on public.closing_cases(company_id, status);
grant select on public.closing_cases to authenticated;
grant all on public.closing_cases to service_role;
alter table public.closing_cases enable row level security;
create policy "closing_cases_select" on public.closing_cases for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 2. conditions precedent ---------------------------------------
create table public.closing_conditions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  closing_id uuid not null references public.closing_cases(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'legal'
    check (category in ('legal','financial','technical','regulatory','tax','commercial','other')),
  responsible_party text not null default 'buyer'
    check (responsible_party in ('buyer','seller','notary','lender','broker','other')),
  is_blocking boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending','in_progress','satisfied','waived','failed')),
  owner_id uuid,
  due_date date,
  satisfied_at timestamptz,
  satisfied_by uuid,
  waiver_reason text,
  notes text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_closing_conditions on public.closing_conditions(closing_id, sort_order);
grant select on public.closing_conditions to authenticated;
grant all on public.closing_conditions to service_role;
alter table public.closing_conditions enable row level security;
create policy "closing_conditions_select" on public.closing_conditions for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 3. handover tasks ----------------------------------------------
create table public.closing_handover_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  closing_id uuid not null references public.closing_cases(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'other'
    check (category in ('keys','meters','utilities','insurance','tenancy','documents',
                        'compliance','works','other')),
  status text not null default 'pending'
    check (status in ('pending','in_progress','complete','not_applicable')),
  owner_id uuid,
  due_date date,
  completed_at timestamptz,
  completed_by uuid,
  notes text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_closing_handover on public.closing_handover_tasks(closing_id, sort_order);
grant select on public.closing_handover_tasks to authenticated;
grant all on public.closing_handover_tasks to service_role;
alter table public.closing_handover_tasks enable row level security;
create policy "closing_handover_select" on public.closing_handover_tasks for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 4. append-only stage history -------------------------------------
create table public.closing_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  closing_id uuid not null references public.closing_cases(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  occurred_at timestamptz not null default now(),
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_closing_events on public.closing_events(closing_id, occurred_at desc);
grant select on public.closing_events to authenticated;
grant all on public.closing_events to service_role;
alter table public.closing_events enable row level security;
create policy "closing_events_select" on public.closing_events for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 5. updated_at + audit ---------------------------------------------
create trigger trg_closing_cases_touch before update on public.closing_cases
  for each row execute function public.set_updated_at();
create trigger trg_closing_conditions_touch before update on public.closing_conditions
  for each row execute function public.set_updated_at();
create trigger trg_closing_handover_touch before update on public.closing_handover_tasks
  for each row execute function public.set_updated_at();
create trigger trg_closing_events_touch before update on public.closing_events
  for each row execute function public.set_updated_at();

create trigger trg_closing_cases_audit after insert or update or delete on public.closing_cases
  for each row execute function public.tg_audit_row();
create trigger trg_closing_conditions_audit after insert or update or delete on public.closing_conditions
  for each row execute function public.tg_audit_row();
create trigger trg_closing_handover_audit after insert or update or delete on public.closing_handover_tasks
  for each row execute function public.tg_audit_row();
create trigger trg_closing_events_audit after insert or update or delete on public.closing_events
  for each row execute function public.tg_audit_row();

-- ---------- 6. write guard ------------------------------------------------------
create or replace function public.tg_guard_closing_record()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.closing_fn', true), '') = 'on';
begin
  if not internal then
    if tg_op = 'DELETE' then
      raise exception 'Closing records are cancelled or archived, never deleted'
        using errcode='check_violation';
    end if;
    raise exception 'Closing records are maintained by the closing functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger trg_guard_closing_cases before insert or update or delete on public.closing_cases
  for each row execute function public.tg_guard_closing_record();
create trigger trg_guard_closing_conditions before insert or update or delete on public.closing_conditions
  for each row execute function public.tg_guard_closing_record();
create trigger trg_guard_closing_handover before insert or update or delete on public.closing_handover_tasks
  for each row execute function public.tg_guard_closing_record();
create trigger trg_guard_closing_events before insert or update or delete on public.closing_events
  for each row execute function public.tg_guard_closing_record();

-- ---------- 7. lifecycle functions -----------------------------------------------
create or replace function public.create_closing_case(
  _opportunity_id uuid, _title text default null,
  _due_diligence_case_id uuid default null,
  _target_completion_date date default null,
  _agreed_price numeric default null,
  _reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid; v_ref text; v_dd uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to open a closing' using errcode='42501';
  end if;
  if o.archived_at is not null then
    raise exception 'An archived opportunity cannot be closed' using errcode='check_violation';
  end if;
  if o.stage <> 'offer_accepted' then
    raise exception 'A closing can only start from an accepted offer' using errcode='check_violation';
  end if;
  if exists (select 1 from public.closing_cases c
              where c.opportunity_id = _opportunity_id
                and c.status <> 'cancelled' and c.archived_at is null) then
    raise exception 'This opportunity already has an open closing' using errcode='check_violation';
  end if;

  v_dd := _due_diligence_case_id;
  if v_dd is null then
    select d.id into v_dd from public.due_diligence_cases d
     where d.opportunity_id = _opportunity_id and d.archived_at is null
       and d.status <> 'abandoned'
     order by d.created_at desc limit 1;
  elsif not exists (select 1 from public.due_diligence_cases d
                     where d.id = v_dd and d.opportunity_id = _opportunity_id) then
    raise exception 'That due-diligence case belongs to another opportunity'
      using errcode='check_violation';
  end if;

  v_ref := coalesce(nullif(btrim(_reference),''),
                    'CL-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6));
  perform set_config('pedra.closing_fn','on',true);
  insert into public.closing_cases
    (company_id, opportunity_id, due_diligence_case_id, reference, title,
     currency, agreed_price, target_completion_date)
  values (o.company_id, _opportunity_id, v_dd, v_ref,
          coalesce(nullif(btrim(_title),''), 'Closing — ' || o.title),
          o.currency, coalesce(_agreed_price, o.indicative_offer),
          coalesce(_target_completion_date, o.expected_closing_date))
  returning id into v_id;
  insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
  values (o.company_id, v_id, null, 'preparing', 'Closing opened');
  perform set_config('pedra.closing_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_closing_case(
  _closing_id uuid, _title text default null, _notary_name text default null,
  _notary_reference text default null, _deed_date date default null,
  _target_completion_date date default null, _possession_date date default null,
  _agreed_price numeric default null, _commitment_id uuid default null,
  _due_diligence_case_id uuid default null, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to edit this closing' using errcode='42501';
  end if;
  if c.status in ('completed','cancelled') or c.archived_at is not null then
    raise exception 'A completed or cancelled closing cannot be edited' using errcode='check_violation';
  end if;
  if _commitment_id is not null and not exists (
    select 1 from public.commitments m where m.id = _commitment_id and m.company_id = c.company_id) then
    raise exception 'Unknown commitment' using errcode='check_violation';
  end if;
  if _due_diligence_case_id is not null and not exists (
    select 1 from public.due_diligence_cases d
     where d.id = _due_diligence_case_id and d.opportunity_id = c.opportunity_id) then
    raise exception 'That due-diligence case belongs to another opportunity'
      using errcode='check_violation';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases set
    title = coalesce(nullif(btrim(_title),''), title),
    notary_name = coalesce(_notary_name, notary_name),
    notary_reference = coalesce(_notary_reference, notary_reference),
    deed_date = coalesce(_deed_date, deed_date),
    target_completion_date = coalesce(_target_completion_date, target_completion_date),
    possession_date = coalesce(_possession_date, possession_date),
    agreed_price = coalesce(_agreed_price, agreed_price),
    commitment_id = coalesce(_commitment_id, commitment_id),
    due_diligence_case_id = coalesce(_due_diligence_case_id, due_diligence_case_id),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _closing_id;
  perform set_config('pedra.closing_fn','off',true);
end $$;

create or replace function public.add_closing_condition(
  _closing_id uuid, _title text, _category text default 'legal',
  _responsible_party text default 'buyer', _description text default null,
  _is_blocking boolean default true, _owner_id uuid default null,
  _due_date date default null, _sort_order integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype; v_id uuid; v_order integer;
begin
  select * into c from public.closing_cases where id = _closing_id;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to add a condition' using errcode='42501';
  end if;
  if c.status in ('completed','cancelled') or c.archived_at is not null then
    raise exception 'This closing is closed to new conditions' using errcode='check_violation';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'A condition needs a title' using errcode='check_violation';
  end if;
  select coalesce(_sort_order, coalesce(max(sort_order), 0) + 10) into v_order
    from public.closing_conditions where closing_id = _closing_id;
  perform set_config('pedra.closing_fn','on',true);
  insert into public.closing_conditions
    (company_id, closing_id, title, description, category, responsible_party,
     is_blocking, owner_id, due_date, sort_order)
  values (c.company_id, _closing_id, btrim(_title), _description,
          coalesce(_category,'legal'), coalesce(_responsible_party,'buyer'),
          coalesce(_is_blocking,true), _owner_id, _due_date, v_order)
  returning id into v_id;
  if c.status = 'preparing' then
    update public.closing_cases set status = 'conditions_pending', updated_by = auth.uid()
     where id = _closing_id;
    insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
    values (c.company_id, _closing_id, 'preparing', 'conditions_pending', 'Conditions recorded');
  end if;
  perform set_config('pedra.closing_fn','off',true);
  return v_id;
end $$;

create or replace function public.set_closing_condition_status(
  _condition_id uuid, _status text, _notes text default null,
  _waiver_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare k public.closing_conditions%rowtype; c public.closing_cases%rowtype;
begin
  select * into k from public.closing_conditions where id = _condition_id for update;
  if k.id is null then raise exception 'Condition not found'; end if;
  select * into c from public.closing_cases where id = k.closing_id;
  if not public.can_record_company(k.company_id) then
    raise exception 'You do not have permission to update this condition' using errcode='42501';
  end if;
  if c.status in ('completed','cancelled') or c.archived_at is not null then
    raise exception 'This closing is closed' using errcode='check_violation';
  end if;
  if _status not in ('pending','in_progress','satisfied','waived','failed') then
    raise exception 'Unknown condition status' using errcode='check_violation';
  end if;
  if _status = 'waived' then
    if not public.can_manage_company(k.company_id) then
      raise exception 'Only a manager can waive a condition' using errcode='42501';
    end if;
    if coalesce(btrim(_waiver_reason),'') = '' then
      raise exception 'A waiver needs a reason' using errcode='check_violation';
    end if;
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_conditions set
    status = _status,
    notes = coalesce(_notes, notes),
    waiver_reason = case when _status = 'waived' then btrim(_waiver_reason) else waiver_reason end,
    satisfied_at = case when _status in ('satisfied','waived') then now() else null end,
    satisfied_by = case when _status in ('satisfied','waived') then auth.uid() else null end,
    updated_by = auth.uid()
  where id = _condition_id;
  perform set_config('pedra.closing_fn','off',true);
end $$;

create or replace function public.add_closing_handover_task(
  _closing_id uuid, _title text, _category text default 'other',
  _description text default null, _owner_id uuid default null,
  _due_date date default null, _sort_order integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype; v_id uuid; v_order integer;
begin
  select * into c from public.closing_cases where id = _closing_id;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to add a handover task' using errcode='42501';
  end if;
  if c.status = 'cancelled' or c.archived_at is not null then
    raise exception 'This closing is cancelled' using errcode='check_violation';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'A handover task needs a title' using errcode='check_violation';
  end if;
  select coalesce(_sort_order, coalesce(max(sort_order), 0) + 10) into v_order
    from public.closing_handover_tasks where closing_id = _closing_id;
  perform set_config('pedra.closing_fn','on',true);
  insert into public.closing_handover_tasks
    (company_id, closing_id, title, description, category, owner_id, due_date, sort_order)
  values (c.company_id, _closing_id, btrim(_title), _description,
          coalesce(_category,'other'), _owner_id, _due_date, v_order)
  returning id into v_id;
  perform set_config('pedra.closing_fn','off',true);
  return v_id;
end $$;

create or replace function public.set_closing_handover_task_status(
  _task_id uuid, _status text, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.closing_handover_tasks%rowtype; c public.closing_cases%rowtype;
        v_open int; v_total int;
begin
  select * into t from public.closing_handover_tasks where id = _task_id for update;
  if t.id is null then raise exception 'Handover task not found'; end if;
  select * into c from public.closing_cases where id = t.closing_id;
  if not public.can_record_company(t.company_id) then
    raise exception 'You do not have permission to update this task' using errcode='42501';
  end if;
  if c.status = 'cancelled' or c.archived_at is not null then
    raise exception 'This closing is cancelled' using errcode='check_violation';
  end if;
  if _status not in ('pending','in_progress','complete','not_applicable') then
    raise exception 'Unknown handover status' using errcode='check_violation';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_handover_tasks set
    status = _status,
    notes = coalesce(_notes, notes),
    completed_at = case when _status in ('complete','not_applicable') then now() else null end,
    completed_by = case when _status in ('complete','not_applicable') then auth.uid() else null end,
    updated_by = auth.uid()
  where id = _task_id;

  select count(*), count(*) filter (where status not in ('complete','not_applicable'))
    into v_total, v_open
    from public.closing_handover_tasks where closing_id = c.id;
  update public.closing_cases
     set handover_status = case when v_total = 0 then 'not_started'
                                when v_open = 0 then 'complete'
                                else 'in_progress' end,
         updated_by = auth.uid()
   where id = c.id;
  perform set_config('pedra.closing_fn','off',true);
end $$;

-- ---------- 8. gates ---------------------------------------------------------
create or replace function public.closing_readiness(_closing_id uuid)
returns table (
  blocking_outstanding int,
  failed_conditions int,
  diligence_linked boolean,
  diligence_ready boolean,
  is_ready boolean
) language sql stable security definer set search_path = public as $$
  select
    coalesce(k.blocking_outstanding, 0),
    coalesce(k.failed_conditions, 0),
    (c.due_diligence_case_id is not null),
    public.due_diligence_permits_completion(c.due_diligence_case_id),
    coalesce(k.blocking_outstanding, 0) = 0
      and coalesce(k.failed_conditions, 0) = 0
      and c.due_diligence_case_id is not null
      and public.due_diligence_permits_completion(c.due_diligence_case_id)
  from public.closing_cases c
  left join lateral (
    select count(*) filter (where x.is_blocking and x.status not in ('satisfied','waived'))::int
             as blocking_outstanding,
           count(*) filter (where x.status = 'failed')::int as failed_conditions
      from public.closing_conditions x where x.closing_id = c.id) k on true
  where c.id = _closing_id;
$$;

create or replace function public.mark_closing_ready(_closing_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype; r record;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to mark a closing ready' using errcode='42501';
  end if;
  if c.status not in ('preparing','conditions_pending') then
    raise exception 'Only a closing in preparation can be marked ready' using errcode='check_violation';
  end if;
  select * into r from public.closing_readiness(_closing_id);
  if not r.diligence_linked then
    raise exception 'Link a due-diligence case before marking this closing ready'
      using errcode='check_violation';
  end if;
  if not r.diligence_ready then
    raise exception 'Due diligence must be completed with a proceed recommendation'
      using errcode='check_violation';
  end if;
  if r.failed_conditions > 0 then
    raise exception 'Resolve the % failed condition(s) first', r.failed_conditions
      using errcode='check_violation';
  end if;
  if r.blocking_outstanding > 0 then
    raise exception '% blocking condition(s) are still outstanding', r.blocking_outstanding
      using errcode='check_violation';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases set status = 'ready_to_close', updated_by = auth.uid()
   where id = _closing_id;
  insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
  values (c.company_id, _closing_id, c.status, 'ready_to_close', 'All conditions satisfied');
  perform set_config('pedra.closing_fn','off',true);
end $$;

create or replace function public.complete_closing_case(
  _closing_id uuid, _actual_completion_date date default null,
  _deed_date date default null, _possession_date date default null,
  _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to complete a closing' using errcode='42501';
  end if;
  if c.status <> 'ready_to_close' then
    raise exception 'Only a closing that is ready to close can complete' using errcode='check_violation';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases set
    status = 'completed',
    actual_completion_date = coalesce(_actual_completion_date, actual_completion_date, current_date),
    deed_date = coalesce(_deed_date, deed_date),
    possession_date = coalesce(_possession_date, possession_date),
    notes = coalesce(_notes, notes),
    completed_at = now(), completed_by = auth.uid(), updated_by = auth.uid()
  where id = _closing_id;
  insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
  values (c.company_id, _closing_id, 'ready_to_close', 'completed', _notes);
  perform set_config('pedra.closing_fn','off',true);
end $$;

create or replace function public.cancel_closing_case(_closing_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to cancel a closing' using errcode='42501';
  end if;
  if c.status = 'completed' then
    raise exception 'A completed closing cannot be cancelled' using errcode='check_violation';
  end if;
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A cancellation needs a reason' using errcode='check_violation';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases set
    status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
    cancel_reason = btrim(_reason), updated_by = auth.uid()
  where id = _closing_id;
  insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
  values (c.company_id, _closing_id, c.status, 'cancelled', btrim(_reason));
  perform set_config('pedra.closing_fn','off',true);
end $$;

-- ---------- 9. property creation from a completed closing ---------------------
create or replace function public.create_property_from_closing(
  _closing_id uuid, _name text default null, _code text default null,
  _property_type text default null, _status text default 'owned',
  _address_line1 text default null, _postal_code text default null,
  _city text default null, _district text default null,
  _area_m2 numeric default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype; o public.acquisition_opportunities%rowtype;
        v_id uuid; v_type text;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to create the property' using errcode='42501';
  end if;
  if c.status <> 'completed' then
    raise exception 'Only a completed closing can create a property' using errcode='check_violation';
  end if;
  if c.property_id is not null then
    raise exception 'This closing has already created a property' using errcode='check_violation';
  end if;
  select * into o from public.acquisition_opportunities where id = c.opportunity_id;

  v_type := coalesce(_property_type, case o.opportunity_type
      when 'residential' then 'apartment'
      when 'commercial'  then 'commercial'
      when 'retail'      then 'commercial'
      when 'office'      then 'office'
      when 'industrial'  then 'warehouse'
      when 'land'        then 'land'
      when 'building'    then 'building'
      else 'other' end);

  insert into public.properties
    (company_id, code, name, property_type, status, address_line1, postal_code,
     city, district, area_m2, acquisition_date, notes, created_by, updated_by)
  values (c.company_id, nullif(btrim(coalesce(_code,'')),''),
          coalesce(nullif(btrim(_name),''), o.property_name, o.title),
          v_type, coalesce(_status,'owned'),
          coalesce(_address_line1, o.address), _postal_code,
          coalesce(_city, o.location), _district, _area_m2,
          coalesce(c.actual_completion_date, c.deed_date, current_date),
          _notes, auth.uid(), auth.uid())
  returning id into v_id;

  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases
     set property_id = v_id,
         handover_status = case when handover_status = 'not_started' then 'in_progress'
                                else handover_status end,
         updated_by = auth.uid()
   where id = _closing_id;
  insert into public.closing_events (company_id, closing_id, from_status, to_status, reason)
  values (c.company_id, _closing_id, 'completed', 'completed', 'Managed property created');
  perform set_config('pedra.closing_fn','off',true);

  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_opportunities
     set property_id = v_id, link_kind = 'existing_property', updated_by = auth.uid()
   where id = c.opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);

  return v_id;
end $$;

create or replace function public.archive_closing_case(_closing_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to archive this closing' using errcode='42501';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases
     set archived_at = now(), archived_by = auth.uid(), archive_reason = _reason,
         updated_by = auth.uid()
   where id = _closing_id;
  perform set_config('pedra.closing_fn','off',true);
end $$;

create or replace function public.restore_closing_case(_closing_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.closing_cases%rowtype;
begin
  select * into c from public.closing_cases where id = _closing_id for update;
  if c.id is null then raise exception 'Closing not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to restore this closing' using errcode='42501';
  end if;
  perform set_config('pedra.closing_fn','on',true);
  update public.closing_cases
     set archived_at = null, archived_by = null, archive_reason = null, updated_by = auth.uid()
   where id = _closing_id;
  perform set_config('pedra.closing_fn','off',true);
end $$;

-- ---------- 10. derived views -----------------------------------------------------
create or replace view public.v_closing_case
with (security_invoker = true) as
select
  c.id as closing_id,
  c.company_id,
  c.opportunity_id,
  o.reference as opportunity_reference,
  o.title as opportunity_title,
  c.due_diligence_case_id,
  d.reference as diligence_reference,
  d.status as diligence_status,
  d.recommendation as diligence_recommendation,
  c.commitment_id,
  c.property_id,
  p.name as property_name,
  c.reference,
  c.title,
  c.status,
  c.handover_status,
  c.currency,
  c.agreed_price,
  c.notary_name,
  c.notary_reference,
  c.deed_date,
  c.target_completion_date,
  c.actual_completion_date,
  c.possession_date,
  c.notes,
  c.cancel_reason,
  c.archived_at,
  (c.archived_at is not null) as is_archived,
  c.created_at,
  c.updated_at,
  coalesce(k.condition_count, 0) as condition_count,
  coalesce(k.conditions_met, 0) as conditions_met,
  coalesce(k.blocking_outstanding, 0) as blocking_outstanding,
  coalesce(k.failed_conditions, 0) as failed_conditions,
  coalesce(h.task_count, 0) as handover_task_count,
  coalesce(h.tasks_done, 0) as handover_tasks_done,
  (c.due_diligence_case_id is not null
     and coalesce(d.status,'') = 'completed'
     and coalesce(d.recommendation,'') in ('proceed','proceed_with_conditions')
     and d.archived_at is null) as diligence_ready,
  (coalesce(k.blocking_outstanding, 0) = 0
     and coalesce(k.failed_conditions, 0) = 0
     and c.due_diligence_case_id is not null
     and coalesce(d.status,'') = 'completed'
     and coalesce(d.recommendation,'') in ('proceed','proceed_with_conditions')
     and d.archived_at is null) as is_ready
from public.closing_cases c
join public.acquisition_opportunities o on o.id = c.opportunity_id
left join public.due_diligence_cases d on d.id = c.due_diligence_case_id
left join public.properties p on p.id = c.property_id
left join lateral (
  select count(*)::int as condition_count,
         count(*) filter (where x.status in ('satisfied','waived'))::int as conditions_met,
         count(*) filter (where x.is_blocking and x.status not in ('satisfied','waived'))::int
           as blocking_outstanding,
         count(*) filter (where x.status = 'failed')::int as failed_conditions
    from public.closing_conditions x where x.closing_id = c.id) k on true
left join lateral (
  select count(*)::int as task_count,
         count(*) filter (where y.status in ('complete','not_applicable'))::int as tasks_done
    from public.closing_handover_tasks y where y.closing_id = c.id) h on true;

grant select on public.v_closing_case to authenticated;