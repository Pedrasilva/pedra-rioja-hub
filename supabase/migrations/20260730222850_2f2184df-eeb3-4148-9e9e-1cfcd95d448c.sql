-- ============================================================
-- Phase 8F.2 — Acquisition pipeline (operational only)
--   Opportunities are operational records. They own no accounting
--   value: no journal, no commitment, no cash flow, no payment and
--   no bank transaction is ever created from this module. §5C and
--   §5D remain untouched. A commitment is only ever created by an
--   explicit user action through the Phase 8A server contract.
-- ============================================================

-- ---------- 1. stage transition configuration ---------------------------
create table public.acquisition_stage_transitions (
  id uuid primary key default gen_random_uuid(),
  from_stage text not null,
  to_stage text not null,
  is_reopen boolean not null default false,
  requires_manage boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_stage, to_stage)
);
grant select on public.acquisition_stage_transitions to authenticated;
grant all on public.acquisition_stage_transitions to service_role;
alter table public.acquisition_stage_transitions enable row level security;
create policy "acquisition_transitions_select" on public.acquisition_stage_transitions
  for select to authenticated using (true);

insert into public.acquisition_stage_transitions (from_stage, to_stage, is_reopen, requires_manage) values
  ('lead','initial_review',false,false),
  ('lead','withdrawn',false,false),
  ('initial_review','under_analysis',false,false),
  ('initial_review','offer_rejected',false,false),
  ('initial_review','withdrawn',false,false),
  ('under_analysis','offer_preparation',false,false),
  ('under_analysis','offer_rejected',false,false),
  ('under_analysis','withdrawn',false,false),
  ('offer_preparation','offer_submitted',false,false),
  ('offer_preparation','under_analysis',false,false),
  ('offer_preparation','withdrawn',false,false),
  ('offer_submitted','negotiation',false,false),
  ('offer_submitted','offer_accepted',false,true),
  ('offer_submitted','offer_rejected',false,false),
  ('offer_submitted','withdrawn',false,false),
  ('negotiation','offer_submitted',false,false),
  ('negotiation','offer_accepted',false,true),
  ('negotiation','offer_rejected',false,false),
  ('negotiation','withdrawn',false,false),
  ('offer_accepted','withdrawn',false,true),
  ('offer_rejected','under_analysis',true,true),
  ('offer_rejected','negotiation',true,true),
  ('withdrawn','lead',true,true);

-- ---------- 2. acquisition_opportunities --------------------------------
create table public.acquisition_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference text not null,
  title text not null,
  property_name text,
  address text,
  location text,
  opportunity_type text not null default 'other'
    check (opportunity_type in ('residential','commercial','retail','office','industrial',
                                'land','building','mixed_use','portfolio','other')),
  source text,
  broker_id uuid references public.counterparties(id) on delete set null,
  seller_id uuid references public.counterparties(id) on delete set null,
  contact_name text,
  contact_email text,
  contact_phone text,
  assigned_to uuid,
  stage text not null default 'lead'
    check (stage in ('lead','initial_review','under_analysis','offer_preparation',
                     'offer_submitted','negotiation','offer_accepted','offer_rejected','withdrawn')),
  probability integer not null default 10 check (probability between 0 and 100),
  link_kind text not null default 'prospective_property'
    check (link_kind in ('existing_property','prospective_property','land','building','portfolio')),
  property_id uuid references public.properties(id) on delete set null,
  currency char(3) not null default 'EUR',
  asking_price numeric(14,2) check (asking_price is null or asking_price >= 0),
  indicative_offer numeric(14,2) check (indicative_offer is null or indicative_offer >= 0),
  valuation_amount numeric(14,2) check (valuation_amount is null or valuation_amount >= 0),
  target_acquisition_date date,
  expected_closing_date date,
  notes text,
  decision text check (decision is null or decision in ('accepted','rejected','withdrawn')),
  decision_reason text,
  decided_at timestamptz,
  decided_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_acq_opportunity_reference
  on public.acquisition_opportunities(company_id, lower(reference));
create index idx_acq_opportunity_company on public.acquisition_opportunities(company_id, stage);
create index idx_acq_opportunity_assigned on public.acquisition_opportunities(company_id, assigned_to);

grant select on public.acquisition_opportunities to authenticated;
grant all on public.acquisition_opportunities to service_role;
alter table public.acquisition_opportunities enable row level security;
create policy "acq_opportunities_select" on public.acquisition_opportunities for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 3. stage history --------------------------------------------
create table public.acquisition_stage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  is_reopen boolean not null default false,
  reason text,
  occurred_at timestamptz not null default now(),
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_acq_stage_events_opp on public.acquisition_stage_events(opportunity_id, occurred_at desc);
grant select on public.acquisition_stage_events to authenticated;
grant all on public.acquisition_stage_events to service_role;
alter table public.acquisition_stage_events enable row level security;
create policy "acq_stage_events_select" on public.acquisition_stage_events for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 4. activities -------------------------------------------------
create table public.acquisition_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  activity_type text not null default 'note'
    check (activity_type in ('meeting','phone_call','email','valuation','broker_discussion',
                             'internal_review','site_visit','decision','note')),
  occurred_at timestamptz not null default now(),
  summary text not null,
  body text,
  author_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_acq_activities_opp on public.acquisition_activities(opportunity_id, occurred_at desc);
grant select on public.acquisition_activities to authenticated;
grant all on public.acquisition_activities to service_role;
alter table public.acquisition_activities enable row level security;
create policy "acq_activities_select" on public.acquisition_activities for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 5. tasks -------------------------------------------------------
create table public.acquisition_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  description text not null,
  assignee_id uuid,
  due_date date,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  reminder_at timestamptz,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_acq_tasks_opp on public.acquisition_tasks(opportunity_id, status, due_date);
grant select on public.acquisition_tasks to authenticated;
grant all on public.acquisition_tasks to service_role;
alter table public.acquisition_tasks enable row level security;
create policy "acq_tasks_select" on public.acquisition_tasks for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 6. valuations ---------------------------------------------------
create table public.acquisition_valuations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  valued_on date not null default current_date,
  method text not null default 'other'
    check (method in ('comparable','income','cost','broker_opinion','desktop','formal_appraisal','other')),
  estimated_value numeric(14,2) not null check (estimated_value >= 0),
  currency char(3) not null default 'EUR',
  comments text,
  author_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_acq_valuations_opp on public.acquisition_valuations(opportunity_id, valued_on desc);
grant select on public.acquisition_valuations to authenticated;
grant all on public.acquisition_valuations to service_role;
alter table public.acquisition_valuations enable row level security;
create policy "acq_valuations_select" on public.acquisition_valuations for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 7. offers --------------------------------------------------------
create table public.acquisition_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  offer_no integer not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'EUR',
  submitted_on date,
  expires_on date,
  status text not null default 'submitted'
    check (status in ('submitted','accepted','rejected','withdrawn','expired')),
  negotiation_notes text,
  decided_on date,
  decision_notes text,
  decided_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (opportunity_id, offer_no)
);
create index idx_acq_offers_opp on public.acquisition_offers(opportunity_id, offer_no desc);
grant select on public.acquisition_offers to authenticated;
grant all on public.acquisition_offers to service_role;
alter table public.acquisition_offers enable row level security;
create policy "acq_offers_select" on public.acquisition_offers for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 8. commitment links ------------------------------------------------
create table public.acquisition_commitment_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.acquisition_opportunities(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  link_reason text,
  linked_at timestamptz not null default now(),
  linked_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (opportunity_id, commitment_id)
);
create index idx_acq_commitment_links_opp on public.acquisition_commitment_links(opportunity_id);
grant select on public.acquisition_commitment_links to authenticated;
grant all on public.acquisition_commitment_links to service_role;
alter table public.acquisition_commitment_links enable row level security;
create policy "acq_commitment_links_select" on public.acquisition_commitment_links for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 9. updated_at + audit ------------------------------------------------
create trigger trg_acq_opportunities_touch before update on public.acquisition_opportunities
  for each row execute function public.set_updated_at();
create trigger trg_acq_stage_events_touch before update on public.acquisition_stage_events
  for each row execute function public.set_updated_at();
create trigger trg_acq_activities_touch before update on public.acquisition_activities
  for each row execute function public.set_updated_at();
create trigger trg_acq_tasks_touch before update on public.acquisition_tasks
  for each row execute function public.set_updated_at();
create trigger trg_acq_valuations_touch before update on public.acquisition_valuations
  for each row execute function public.set_updated_at();
create trigger trg_acq_offers_touch before update on public.acquisition_offers
  for each row execute function public.set_updated_at();
create trigger trg_acq_commitment_links_touch before update on public.acquisition_commitment_links
  for each row execute function public.set_updated_at();

create trigger trg_acq_opportunities_audit after insert or update or delete on public.acquisition_opportunities
  for each row execute function public.tg_audit_row();
create trigger trg_acq_stage_events_audit after insert or update or delete on public.acquisition_stage_events
  for each row execute function public.tg_audit_row();
create trigger trg_acq_activities_audit after insert or update or delete on public.acquisition_activities
  for each row execute function public.tg_audit_row();
create trigger trg_acq_tasks_audit after insert or update or delete on public.acquisition_tasks
  for each row execute function public.tg_audit_row();
create trigger trg_acq_valuations_audit after insert or update or delete on public.acquisition_valuations
  for each row execute function public.tg_audit_row();
create trigger trg_acq_offers_audit after insert or update or delete on public.acquisition_offers
  for each row execute function public.tg_audit_row();
create trigger trg_acq_commitment_links_audit after insert or update or delete on public.acquisition_commitment_links
  for each row execute function public.tg_audit_row();

-- ---------- 10. write guard ---------------------------------------------------
create or replace function public.tg_guard_acquisition_record()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.acquisition_fn', true), '') = 'on';
begin
  if not internal then
    if tg_op = 'DELETE' then
      raise exception 'Acquisition records are archived or cancelled, never deleted'
        using errcode='check_violation';
    end if;
    raise exception 'Acquisition records are maintained by the acquisition functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger trg_guard_acq_opportunities before insert or update or delete on public.acquisition_opportunities
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_stage_events before insert or update or delete on public.acquisition_stage_events
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_activities before insert or update or delete on public.acquisition_activities
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_tasks before insert or update or delete on public.acquisition_tasks
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_valuations before insert or update or delete on public.acquisition_valuations
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_offers before insert or update or delete on public.acquisition_offers
  for each row execute function public.tg_guard_acquisition_record();
create trigger trg_guard_acq_commitment_links before insert or update or delete on public.acquisition_commitment_links
  for each row execute function public.tg_guard_acquisition_record();

-- ---------- 11. lifecycle functions --------------------------------------------
create or replace function public.create_acquisition_opportunity(
  _company_id uuid, _title text,
  _opportunity_type text default 'other',
  _property_name text default null, _address text default null, _location text default null,
  _source text default null, _broker_id uuid default null, _seller_id uuid default null,
  _contact_name text default null, _contact_email text default null, _contact_phone text default null,
  _assigned_to uuid default null, _probability integer default null,
  _link_kind text default 'prospective_property', _property_id uuid default null,
  _asking_price numeric default null, _indicative_offer numeric default null,
  _valuation_amount numeric default null,
  _target_acquisition_date date default null, _expected_closing_date date default null,
  _currency text default 'EUR', _notes text default null, _reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create an opportunity' using errcode='42501';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'An opportunity needs a title' using errcode='check_violation';
  end if;
  if _property_id is not null and not exists (
    select 1 from public.properties p where p.id = _property_id and p.company_id = _company_id) then
    raise exception 'Unknown property' using errcode='check_violation';
  end if;
  v_ref := coalesce(nullif(btrim(_reference), ''),
                    'AQ-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6));
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_opportunities (
    company_id, reference, title, property_name, address, location, opportunity_type, source,
    broker_id, seller_id, contact_name, contact_email, contact_phone, assigned_to,
    probability, link_kind, property_id, currency, asking_price, indicative_offer, valuation_amount,
    target_acquisition_date, expected_closing_date, notes)
  values (
    _company_id, v_ref, btrim(_title), _property_name, _address, _location,
    coalesce(_opportunity_type,'other'), _source, _broker_id, _seller_id,
    _contact_name, _contact_email, _contact_phone, _assigned_to,
    coalesce(_probability, 10), coalesce(_link_kind,'prospective_property'), _property_id,
    coalesce(_currency,'EUR'), _asking_price, _indicative_offer, _valuation_amount,
    _target_acquisition_date, _expected_closing_date, _notes)
  returning id into v_id;

  insert into public.acquisition_stage_events (company_id, opportunity_id, from_stage, to_stage, reason)
  values (_company_id, v_id, null, 'lead', 'Opportunity created');
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_acquisition_opportunity(
  _opportunity_id uuid, _title text default null,
  _opportunity_type text default null,
  _property_name text default null, _address text default null, _location text default null,
  _source text default null, _broker_id uuid default null, _seller_id uuid default null,
  _contact_name text default null, _contact_email text default null, _contact_phone text default null,
  _assigned_to uuid default null, _probability integer default null,
  _link_kind text default null, _property_id uuid default null,
  _asking_price numeric default null, _indicative_offer numeric default null,
  _valuation_amount numeric default null,
  _target_acquisition_date date default null, _expected_closing_date date default null,
  _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to edit this opportunity' using errcode='42501';
  end if;
  if o.archived_at is not null then
    raise exception 'An archived opportunity cannot be edited' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_opportunities set
    title = coalesce(nullif(btrim(_title),''), title),
    opportunity_type = coalesce(_opportunity_type, opportunity_type),
    property_name = coalesce(_property_name, property_name),
    address = coalesce(_address, address),
    location = coalesce(_location, location),
    source = coalesce(_source, source),
    broker_id = coalesce(_broker_id, broker_id),
    seller_id = coalesce(_seller_id, seller_id),
    contact_name = coalesce(_contact_name, contact_name),
    contact_email = coalesce(_contact_email, contact_email),
    contact_phone = coalesce(_contact_phone, contact_phone),
    assigned_to = coalesce(_assigned_to, assigned_to),
    probability = coalesce(_probability, probability),
    link_kind = coalesce(_link_kind, link_kind),
    property_id = coalesce(_property_id, property_id),
    asking_price = coalesce(_asking_price, asking_price),
    indicative_offer = coalesce(_indicative_offer, indicative_offer),
    valuation_amount = coalesce(_valuation_amount, valuation_amount),
    target_acquisition_date = coalesce(_target_acquisition_date, target_acquisition_date),
    expected_closing_date = coalesce(_expected_closing_date, expected_closing_date),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

create or replace function public.move_acquisition_stage(
  _opportunity_id uuid, _stage text, _reason text default null, _probability integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  o public.acquisition_opportunities%rowtype;
  t public.acquisition_stage_transitions%rowtype;
  v_event uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to move this opportunity' using errcode='42501';
  end if;
  if o.archived_at is not null then
    raise exception 'An archived opportunity cannot change stage' using errcode='check_violation';
  end if;
  if _stage = o.stage then
    raise exception 'The opportunity is already at that stage' using errcode='check_violation';
  end if;

  select * into t from public.acquisition_stage_transitions
   where from_stage = o.stage and to_stage = _stage;
  if t.id is null then
    raise exception 'An opportunity cannot move from % to %', o.stage, _stage using errcode='check_violation';
  end if;
  if t.requires_manage and not public.can_manage_company(o.company_id) then
    raise exception 'You do not have permission to make that stage decision' using errcode='42501';
  end if;

  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_opportunities set
    stage = _stage,
    probability = coalesce(_probability, case
      when _stage = 'offer_accepted' then 100
      when _stage in ('offer_rejected','withdrawn') then 0
      else probability end),
    decision = case
      when _stage = 'offer_accepted' then 'accepted'
      when _stage = 'offer_rejected' then 'rejected'
      when _stage = 'withdrawn' then 'withdrawn'
      when t.is_reopen then null
      else decision end,
    decision_reason = case
      when _stage in ('offer_accepted','offer_rejected','withdrawn') then _reason
      when t.is_reopen then null
      else decision_reason end,
    decided_at = case
      when _stage in ('offer_accepted','offer_rejected','withdrawn') then now()
      when t.is_reopen then null
      else decided_at end,
    decided_by = case
      when _stage in ('offer_accepted','offer_rejected','withdrawn') then auth.uid()
      when t.is_reopen then null
      else decided_by end,
    updated_by = auth.uid()
  where id = _opportunity_id;

  insert into public.acquisition_stage_events
    (company_id, opportunity_id, from_stage, to_stage, is_reopen, reason)
  values (o.company_id, _opportunity_id, o.stage, _stage, t.is_reopen, _reason)
  returning id into v_event;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_event;
end $$;

create or replace function public.archive_acquisition_opportunity(
  _opportunity_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_manage_company(o.company_id) then
    raise exception 'You do not have permission to archive this opportunity' using errcode='42501';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_opportunities
     set archived_at = now(), archived_by = auth.uid(), archive_reason = _reason, updated_by = auth.uid()
   where id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

create or replace function public.restore_acquisition_opportunity(_opportunity_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_manage_company(o.company_id) then
    raise exception 'You do not have permission to restore this opportunity' using errcode='42501';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_opportunities
     set archived_at = null, archived_by = null, archive_reason = null, updated_by = auth.uid()
   where id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

-- ---------- 12. activities, tasks, valuations ---------------------------------
create or replace function public.record_acquisition_activity(
  _opportunity_id uuid, _activity_type text, _summary text,
  _body text default null, _occurred_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to record activities' using errcode='42501';
  end if;
  if coalesce(btrim(_summary),'') = '' then
    raise exception 'An activity needs a summary' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_activities
    (company_id, opportunity_id, activity_type, summary, body, occurred_at)
  values (o.company_id, _opportunity_id, coalesce(_activity_type,'note'), btrim(_summary), _body,
          coalesce(_occurred_at, now()))
  returning id into v_id;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

create or replace function public.create_acquisition_task(
  _opportunity_id uuid, _description text, _assignee_id uuid default null,
  _due_date date default null, _priority text default 'normal',
  _reminder_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to create tasks' using errcode='42501';
  end if;
  if coalesce(btrim(_description),'') = '' then
    raise exception 'A task needs a description' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_tasks
    (company_id, opportunity_id, description, assignee_id, due_date, priority, reminder_at)
  values (o.company_id, _opportunity_id, btrim(_description), _assignee_id, _due_date,
          coalesce(_priority,'normal'), _reminder_at)
  returning id into v_id;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

create or replace function public.set_acquisition_task_status(
  _task_id uuid, _status text, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.acquisition_tasks%rowtype;
begin
  select * into t from public.acquisition_tasks where id = _task_id for update;
  if t.id is null then raise exception 'Task not found'; end if;
  if not public.can_record_company(t.company_id) then
    raise exception 'You do not have permission to change this task' using errcode='42501';
  end if;
  if _status not in ('open','completed','cancelled') then
    raise exception 'Unknown task status' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_tasks set
    status = _status,
    completed_at = case when _status = 'completed' then now() else null end,
    completed_by = case when _status = 'completed' then auth.uid() else null end,
    updated_by = auth.uid()
  where id = _task_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

create or replace function public.record_acquisition_valuation(
  _opportunity_id uuid, _estimated_value numeric, _method text default 'other',
  _valued_on date default null, _comments text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to record valuations' using errcode='42501';
  end if;
  if _estimated_value is null or _estimated_value < 0 then
    raise exception 'A valuation needs an estimated value' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_valuations
    (company_id, opportunity_id, valued_on, method, estimated_value, currency, comments)
  values (o.company_id, _opportunity_id, coalesce(_valued_on, current_date),
          coalesce(_method,'other'), _estimated_value, o.currency, _comments)
  returning id into v_id;
  update public.acquisition_opportunities
     set valuation_amount = _estimated_value, updated_by = auth.uid()
   where id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

-- ---------- 13. offers -----------------------------------------------------------
create or replace function public.record_acquisition_offer(
  _opportunity_id uuid, _amount numeric, _submitted_on date default null,
  _expires_on date default null, _negotiation_notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_id uuid; v_no int;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id for update;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to record offers' using errcode='42501';
  end if;
  if o.archived_at is not null then
    raise exception 'An archived opportunity cannot receive offers' using errcode='check_violation';
  end if;
  if _amount is null or _amount < 0 then
    raise exception 'An offer needs an amount' using errcode='check_violation';
  end if;
  select coalesce(max(offer_no), 0) + 1 into v_no
    from public.acquisition_offers where opportunity_id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_offers
    (company_id, opportunity_id, offer_no, amount, currency, submitted_on, expires_on, negotiation_notes)
  values (o.company_id, _opportunity_id, v_no, _amount, o.currency,
          coalesce(_submitted_on, current_date), _expires_on, _negotiation_notes)
  returning id into v_id;
  update public.acquisition_opportunities
     set indicative_offer = _amount, updated_by = auth.uid()
   where id = _opportunity_id;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

create or replace function public.decide_acquisition_offer(
  _offer_id uuid, _decision text, _notes text default null, _decided_on date default null)
returns void language plpgsql security definer set search_path = public as $$
declare f public.acquisition_offers%rowtype;
begin
  select * into f from public.acquisition_offers where id = _offer_id for update;
  if f.id is null then raise exception 'Offer not found'; end if;
  if _decision not in ('accepted','rejected','withdrawn','expired') then
    raise exception 'Unknown offer decision' using errcode='check_violation';
  end if;
  if _decision = 'accepted' then
    if not public.can_manage_company(f.company_id) then
      raise exception 'You do not have permission to accept an offer' using errcode='42501';
    end if;
  elsif not public.can_record_company(f.company_id) then
    raise exception 'You do not have permission to decide this offer' using errcode='42501';
  end if;
  if f.status <> 'submitted' then
    raise exception 'Only a submitted offer can be decided' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  update public.acquisition_offers
     set status = _decision, decision_notes = _notes,
         decided_on = coalesce(_decided_on, current_date), decided_by = auth.uid(),
         updated_by = auth.uid()
   where id = _offer_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

-- ---------- 14. commitment integration (explicit only) -----------------------------
create or replace function public.link_acquisition_commitment(
  _opportunity_id uuid, _commitment_id uuid, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; c public.commitments%rowtype; v_id uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to link a commitment' using errcode='42501';
  end if;
  select * into c from public.commitments where id = _commitment_id;
  if c.id is null or c.company_id <> o.company_id then
    raise exception 'Unknown commitment' using errcode='check_violation';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  insert into public.acquisition_commitment_links
    (company_id, opportunity_id, commitment_id, link_reason)
  values (o.company_id, _opportunity_id, _commitment_id, _reason)
  returning id into v_id;
  perform set_config('pedra.acquisition_fn','off',true);
  return v_id;
end $$;

create or replace function public.unlink_acquisition_commitment(_link_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l public.acquisition_commitment_links%rowtype;
begin
  select * into l from public.acquisition_commitment_links where id = _link_id;
  if l.id is null then raise exception 'Link not found'; end if;
  if not public.can_record_company(l.company_id) then
    raise exception 'You do not have permission to unlink this commitment' using errcode='42501';
  end if;
  perform set_config('pedra.acquisition_fn','on',true);
  delete from public.acquisition_commitment_links where id = _link_id;
  perform set_config('pedra.acquisition_fn','off',true);
end $$;

create or replace function public.create_acquisition_commitment(
  _opportunity_id uuid, _title text, _authorised_amount numeric default 0,
  _commitment_type text default 'purchase_order', _counterparty_id uuid default null,
  _start_date date default null, _end_date date default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o public.acquisition_opportunities%rowtype; v_commitment uuid;
begin
  select * into o from public.acquisition_opportunities where id = _opportunity_id;
  if o.id is null then raise exception 'Opportunity not found'; end if;
  if not public.can_record_company(o.company_id) then
    raise exception 'You do not have permission to create a commitment' using errcode='42501';
  end if;

  v_commitment := public.create_commitment_draft(
    _company_id => o.company_id,
    _title => coalesce(nullif(btrim(_title),''), o.title),
    _commitment_type => coalesce(_commitment_type,'purchase_order'),
    _authorised_amount => coalesce(_authorised_amount, 0),
    _counterparty_id => coalesce(_counterparty_id, o.seller_id),
    _currency => o.currency,
    _description => 'Created from acquisition opportunity ' || o.reference,
    _start_date => _start_date,
    _end_date => _end_date,
    _source_type => 'acquisition_opportunity',
    _source_id => o.id,
    _notes => _notes);

  perform public.link_acquisition_commitment(_opportunity_id, v_commitment, 'Created from the opportunity');
  return v_commitment;
end $$;

-- ---------- 15. derived views --------------------------------------------------------
create or replace view public.v_acquisition_pipeline
with (security_invoker = true) as
select
  o.id as opportunity_id,
  o.company_id,
  o.reference,
  o.title,
  o.property_name,
  o.address,
  o.location,
  o.opportunity_type,
  o.source,
  o.broker_id,
  broker.name as broker_name,
  o.seller_id,
  seller.name as seller_name,
  o.contact_name,
  o.contact_email,
  o.contact_phone,
  o.assigned_to,
  o.stage,
  o.probability,
  o.link_kind,
  o.property_id,
  o.currency,
  o.asking_price,
  o.indicative_offer,
  o.valuation_amount,
  o.target_acquisition_date,
  o.expected_closing_date,
  o.decision,
  o.decision_reason,
  o.notes,
  o.archived_at,
  o.created_at,
  o.updated_at,
  o.created_by,
  (o.archived_at is not null) as is_archived,
  round(coalesce(o.indicative_offer, o.asking_price, 0) * o.probability / 100.0, 2)
    as weighted_estimate,
  act.activity_count,
  tsk.open_task_count,
  ofr.offer_count,
  ofr.latest_offer_amount,
  val.latest_valuation,
  lnk.linked_commitment_count
from public.acquisition_opportunities o
left join public.counterparties broker on broker.id = o.broker_id
left join public.counterparties seller on seller.id = o.seller_id
left join lateral (
  select count(*)::int as activity_count from public.acquisition_activities a
   where a.opportunity_id = o.id) act on true
left join lateral (
  select count(*)::int as open_task_count from public.acquisition_tasks t
   where t.opportunity_id = o.id and t.status = 'open') tsk on true
left join lateral (
  select count(*)::int as offer_count,
         (select amount from public.acquisition_offers x
           where x.opportunity_id = o.id order by offer_no desc limit 1) as latest_offer_amount
    from public.acquisition_offers f where f.opportunity_id = o.id) ofr on true
left join lateral (
  select estimated_value as latest_valuation from public.acquisition_valuations v
   where v.opportunity_id = o.id order by valued_on desc, created_at desc limit 1) val on true
left join lateral (
  select count(*)::int as linked_commitment_count from public.acquisition_commitment_links cl
   where cl.opportunity_id = o.id) lnk on true;

grant select on public.v_acquisition_pipeline to authenticated;

create or replace view public.v_acquisition_stage_summary
with (security_invoker = true) as
select
  o.company_id,
  o.stage,
  count(*)::int as opportunity_count,
  coalesce(sum(coalesce(o.indicative_offer, o.asking_price, 0)), 0)::numeric(14,2) as estimate_total,
  coalesce(sum(round(coalesce(o.indicative_offer, o.asking_price, 0) * o.probability / 100.0, 2)), 0)::numeric(14,2)
    as weighted_total
from public.acquisition_opportunities o
where o.archived_at is null
group by o.company_id, o.stage;

grant select on public.v_acquisition_stage_summary to authenticated;

create or replace view public.v_acquisition_commitment_link
with (security_invoker = true) as
select
  l.id as link_id,
  l.company_id,
  l.opportunity_id,
  l.commitment_id,
  l.link_reason,
  l.linked_at,
  c.code as commitment_code,
  c.title as commitment_title,
  c.status as commitment_status,
  c.currency as commitment_currency,
  c.authorised_amount
from public.acquisition_commitment_links l
join public.commitments c on c.id = l.commitment_id;

grant select on public.v_acquisition_commitment_link to authenticated;