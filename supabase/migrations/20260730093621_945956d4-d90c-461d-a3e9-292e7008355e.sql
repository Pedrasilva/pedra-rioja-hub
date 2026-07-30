-- ============================================================
-- Phase 8C — Generic approval & workflow engine (additive)
-- ============================================================
-- §5C / §5D / §5E are frozen. The engine owns workflows, requests,
-- decisions and events only. Domain lifecycle changes happen exclusively
-- through registered, server-side, idempotent domain callbacks.

-- ---------- 0. capability helpers --------------------------------------
create or replace function public.can_override_approval(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur
                 where ur.user_id = auth.uid() and ur.company_id = _company_id
                   and ur.role in ('owner','manager'))
$$;

-- ---------- 1. generic target registry ---------------------------------
create table public.approval_target_types (
  target_type text primary key,
  label text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.approval_target_types to authenticated;
grant all on public.approval_target_types to service_role;
alter table public.approval_target_types enable row level security;
create policy "approval_target_types_select" on public.approval_target_types
  for select to authenticated using (true);

insert into public.approval_target_types (target_type, label, description) values
  ('commitment','Commitment','Authorised spend commitment'),
  ('commitment_change','Commitment change','Material change to an existing commitment'),
  ('commitment_schedule_version','Commitment schedule version','Replacement payment schedule'),
  ('commitment_variance','Commitment variance','Schedule variance above tolerance'),
  ('service_contract','Service contract','Operational service contract'),
  ('insurance_policy','Insurance policy','Insurance policy'),
  ('lease','Lease','Tenancy or lease agreement'),
  ('procurement_request','Procurement request','Procurement request'),
  ('budget','Budget','Budget submission'),
  ('capex_project','Capex project decision','Capital project decision'),
  ('financial_document','Financial document','Bookkeeping document');

-- ---------- 2. workflow definitions ------------------------------------
create table public.approval_workflows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  target_type text not null references public.approval_target_types(target_type),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_system boolean not null default false,
  published_version_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_approval_workflow_code on public.approval_workflows(company_id, lower(code));
create index idx_approval_workflow_target on public.approval_workflows(company_id, target_type, status);
grant select on public.approval_workflows to authenticated;
grant all on public.approval_workflows to service_role;
alter table public.approval_workflows enable row level security;
create policy "approval_workflows_select" on public.approval_workflows for select to authenticated
  using (public.can_view_company(company_id));

create table public.approval_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  workflow_id uuid not null references public.approval_workflows(id) on delete cascade,
  version_no integer not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  expiry_hours integer check (expiry_hours is null or expiry_hours > 0),
  reminder_hours integer check (reminder_hours is null or reminder_hours > 0),
  escalation_hours integer check (escalation_hours is null or escalation_hours > 0),
  notes text,
  published_at timestamptz,
  published_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (workflow_id, version_no)
);
create index idx_approval_version_workflow on public.approval_workflow_versions(workflow_id, version_no);
grant select on public.approval_workflow_versions to authenticated;
grant all on public.approval_workflow_versions to service_role;
alter table public.approval_workflow_versions enable row level security;
create policy "approval_workflow_versions_select" on public.approval_workflow_versions
  for select to authenticated using (public.can_view_company(company_id));

alter table public.approval_workflows
  add constraint approval_workflows_published_version_fkey
  foreign key (published_version_id) references public.approval_workflow_versions(id) on delete set null;

create table public.approval_workflow_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  version_id uuid not null references public.approval_workflow_versions(id) on delete cascade,
  step_no integer not null check (step_no >= 1),
  name text not null,
  rule text not null default 'any_one' check (rule in ('any_one','unanimous','quorum')),
  quorum_count integer check (quorum_count is null or quorum_count >= 1),
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  allow_self_approval boolean not null default false,
  restrict_creator boolean not null default true,
  incompatible_with_step_no integer,
  reminder_after_hours integer,
  escalate_after_hours integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (version_id, step_no, name)
);
create index idx_approval_steps_version on public.approval_workflow_steps(version_id, step_no);
grant select on public.approval_workflow_steps to authenticated;
grant all on public.approval_workflow_steps to service_role;
alter table public.approval_workflow_steps enable row level security;
create policy "approval_workflow_steps_select" on public.approval_workflow_steps
  for select to authenticated using (public.can_view_company(company_id));

create table public.approval_step_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  step_id uuid not null references public.approval_workflow_steps(id) on delete cascade,
  assignee_type text not null
    check (assignee_type in ('user','role','capability','hierarchy','domain_candidate')),
  user_id uuid,
  role text check (role is null or role in ('owner','manager','bookkeeper','assistant','approver','viewer')),
  capability text check (capability is null or capability in ('view','record','manage','approve')),
  candidate_source text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  check (
    (assignee_type = 'user' and user_id is not null)
    or (assignee_type = 'role' and role is not null)
    or (assignee_type = 'capability' and capability is not null)
    or (assignee_type in ('hierarchy','domain_candidate'))
  )
);
create index idx_approval_assignments_step on public.approval_step_assignments(step_id);
grant select on public.approval_step_assignments to authenticated;
grant all on public.approval_step_assignments to service_role;
alter table public.approval_step_assignments enable row level security;
create policy "approval_step_assignments_select" on public.approval_step_assignments
  for select to authenticated using (public.can_view_company(company_id));

-- ---------- 3. request spine (extended, never rewritten) ---------------
alter table public.approval_requests
  add column workflow_id uuid references public.approval_workflows(id) on delete set null,
  add column workflow_version_id uuid references public.approval_workflow_versions(id) on delete set null,
  add column current_step_no integer not null default 1,
  add column target_label text,
  add column snapshot jsonb not null default '{}'::jsonb,
  add column expires_at timestamptz,
  add column completed_at timestamptz,
  add column last_reminder_at timestamptz,
  add column escalated_at timestamptz,
  add column callback_status text not null default 'not_required'
    check (callback_status in ('not_required','pending','succeeded','failed')),
  add column callback_attempts integer not null default 0,
  add column callback_error text,
  add column callback_at timestamptz;

alter table public.approval_requests drop constraint if exists approval_requests_decision_check;
alter table public.approval_requests add constraint approval_requests_decision_check
  check (decision in ('pending','approved','rejected','withdrawn','returned','expired','cancelled'));
alter table public.approval_requests drop constraint if exists approval_requests_target_type_check;
alter table public.approval_requests add constraint approval_requests_target_type_fkey
  foreign key (target_type) references public.approval_target_types(target_type);
create index if not exists idx_approval_requests_pending
  on public.approval_requests(company_id, decision, expires_at);

create table public.approval_request_candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  user_id uuid not null,
  source text not null default 'domain'
    check (source in ('domain','dimension_owner','project_responsible','delegation','escalation')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (request_id, user_id, source)
);
create index idx_approval_candidates_request on public.approval_request_candidates(request_id);
grant select on public.approval_request_candidates to authenticated;
grant all on public.approval_request_candidates to service_role;
alter table public.approval_request_candidates enable row level security;
create policy "approval_request_candidates_select" on public.approval_request_candidates
  for select to authenticated using (public.can_view_company(company_id));

-- ---------- 4. append-only decisions -----------------------------------
create table public.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  step_id uuid references public.approval_workflow_steps(id) on delete set null,
  step_no integer,
  actor_id uuid default auth.uid(),
  decision text not null check (decision in
    ('approve','reject','return','withdraw','delegate','override_approve','override_reject','expire','cancel','abstain')),
  reason text,
  override_reason text,
  delegated_to uuid,
  evidence_document_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_approval_decisions_request on public.approval_decisions(request_id, created_at);
create index idx_approval_decisions_step on public.approval_decisions(step_id, actor_id);
grant select on public.approval_decisions to authenticated;
grant all on public.approval_decisions to service_role;
alter table public.approval_decisions enable row level security;
create policy "approval_decisions_select" on public.approval_decisions for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 5. events (extended, append-only) --------------------------
alter table public.approval_events
  add column step_no integer,
  add column decision_id uuid references public.approval_decisions(id) on delete set null,
  add column payload jsonb not null default '{}'::jsonb;
alter table public.approval_events drop constraint if exists approval_events_event_check;
alter table public.approval_events add constraint approval_events_event_check
  check (event in (
    'requested','approved','rejected','withdrawn','overridden','commented',
    'request_created','step_activated','approver_resolved','reminder','escalation',
    'delegation','decision','callback_started','callback_succeeded','callback_failed',
    'workflow_completed','workflow_published','returned','expired','cancelled'));

-- ---------- 6. callback registry ---------------------------------------
create table public.approval_callbacks (
  id uuid primary key default gen_random_uuid(),
  target_type text not null references public.approval_target_types(target_type) on delete cascade,
  event text not null check (event in ('granted','rejected','returned','withdrawn','expired')),
  function_name text not null,
  created_at timestamptz not null default now(),
  unique (target_type, event)
);
grant select on public.approval_callbacks to authenticated;
grant all on public.approval_callbacks to service_role;
alter table public.approval_callbacks enable row level security;
create policy "approval_callbacks_select" on public.approval_callbacks
  for select to authenticated using (true);

-- ---------- 7. immutability guards -------------------------------------
create or replace function public.tg_approval_append_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Approval history is immutable' using errcode = 'check_violation';
end $$;
create trigger trg_approval_decisions_append_only
  before update or delete on public.approval_decisions
  for each row execute function public.tg_approval_append_only();
create trigger trg_approval_events_append_only
  before update or delete on public.approval_events
  for each row execute function public.tg_approval_append_only();

-- The request spine may only be updated from inside the engine, and never
-- after a decision except for callback bookkeeping.
create or replace function public.tg_guard_approval()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.commitment_fn', true), '') = 'on'
                          or coalesce(current_setting('pedra.approval_fn', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    raise exception 'Approval history is immutable' using errcode='check_violation';
  end if;
  if tg_op = 'UPDATE' then
    if not internal then
      raise exception 'Approval decisions are recorded through approval functions'
        using errcode='check_violation';
    end if;
    if old.decision <> 'pending' then
      if new.decision is distinct from old.decision
         or new.target_type is distinct from old.target_type
         or new.target_id is distinct from old.target_id
         or new.snapshot is distinct from old.snapshot
         or new.decided_by is distinct from old.decided_by
         or new.decided_at is distinct from old.decided_at
         or new.decision_reason is distinct from old.decision_reason then
        raise exception 'This approval request is already decided' using errcode='check_violation';
      end if;
    end if;
  end if;
  return new;
end $$;

-- Published workflow versions, their steps and assignments are frozen.
create or replace function public.tg_guard_workflow_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.approval_fn', true), '') = 'on';
begin
  if not internal then
    raise exception 'Workflow definitions are maintained through approval functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'A published workflow version cannot be deleted' using errcode='check_violation';
    end if;
    return old;
  end if;
  if old.status = 'published' and new.status not in ('published','archived') then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  if old.status = 'published' and (
       new.expiry_hours is distinct from old.expiry_hours
    or new.reminder_hours is distinct from old.reminder_hours
    or new.escalation_hours is distinct from old.escalation_hours) then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'An archived workflow version cannot be reopened' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_guard_approval_version before update or delete on public.approval_workflow_versions
  for each row execute function public.tg_guard_workflow_version();

create or replace function public.tg_guard_workflow_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text; v_id uuid;
begin
  v_id := case tg_table_name
            when 'approval_workflow_steps' then coalesce(new.version_id, old.version_id)
            else (select s.version_id from public.approval_workflow_steps s
                   where s.id = coalesce(new.step_id, old.step_id))
          end;
  select status into v_status from public.approval_workflow_versions where id = v_id;
  if v_status is distinct from 'draft' then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  if coalesce(current_setting('pedra.approval_fn', true), '') <> 'on' then
    raise exception 'Workflow definitions are maintained through approval functions'
      using errcode='check_violation';
  end if;
  return case tg_op when 'DELETE' then old else new end;
end $$;
create trigger trg_guard_approval_step
  before insert or update or delete on public.approval_workflow_steps
  for each row execute function public.tg_guard_workflow_child();
create trigger trg_guard_approval_assignment
  before insert or update or delete on public.approval_step_assignments
  for each row execute function public.tg_guard_workflow_child();

create trigger trg_approval_workflow_touch before update on public.approval_workflows
  for each row execute function public.tg_touch_row();
create trigger trg_approval_version_touch before update on public.approval_workflow_versions
  for each row execute function public.tg_touch_row();

-- ============================================================
-- Phase 8C — engine functions
-- ============================================================

-- ---------- approver resolution (fail-closed) --------------------------
create or replace function public.approval_step_approvers(_step_id uuid, _request_id uuid)
returns table (user_id uuid)
language sql stable security definer set search_path = public as $$
  with s as (select * from public.approval_workflow_steps where id = _step_id),
       a as (select * from public.approval_step_assignments where step_id = _step_id)
  select distinct x.user_id from (
    select a.user_id from a where a.assignee_type = 'user' and a.user_id is not null
    union
    select ur.user_id from a
      join public.user_roles ur on ur.company_id = (select company_id from s)
     where a.assignee_type = 'role' and ur.role::text = a.role
    union
    select ur.user_id from a
      join public.user_roles ur on ur.company_id = (select company_id from s)
     where a.assignee_type = 'capability'
       and ur.role::text = any (case a.capability
             when 'approve' then array['owner','manager','approver']
             when 'manage'  then array['owner','manager']
             when 'record'  then array['owner','manager','bookkeeper','assistant']
             else array['owner','manager','bookkeeper','assistant','approver','viewer'] end)
    union
    select ur.user_id from a
      join public.user_roles ur on ur.company_id = (select company_id from s)
     where a.assignee_type = 'hierarchy' and ur.role::text in ('owner','manager')
    union
    select c.user_id from a
      join public.approval_request_candidates c on c.request_id = _request_id
     where a.assignee_type = 'domain_candidate'
       and (a.candidate_source is null or a.candidate_source = c.source)
    union
    select c2.user_id from public.approval_request_candidates c2
     where c2.request_id = _request_id and c2.source in ('delegation','escalation')
  ) x
  where x.user_id is not null
$$;

create or replace function public.approval_step_applies(
  _min numeric, _max numeric, _amount numeric)
returns boolean language sql immutable set search_path = public as $$
  select (_min is null or coalesce(_amount, 0) >= _min)
     and (_max is null or coalesce(_amount, 0) <= _max)
$$;

-- ---------- default (system) workflow ----------------------------------
create or replace function public.ensure_default_approval_workflow(
  _company_id uuid, _target_type text)
returns uuid language plpgsql security definer set search_path = public as $$
declare w_id uuid; v_id uuid; s_id uuid;
begin
  select w.id, w.published_version_id into w_id, v_id
    from public.approval_workflows w
   where w.company_id = _company_id and w.target_type = _target_type
     and w.is_system and w.status = 'published' limit 1;
  if v_id is not null then return v_id; end if;

  perform set_config('pedra.approval_fn', 'on', true);
  insert into public.approval_workflows (company_id, code, name, description, target_type, status, is_system)
  values (_company_id, 'system_' || _target_type,
          'Standard approval — ' || _target_type,
          'System default: a single approval by an owner, manager or approver.',
          _target_type, 'draft', true)
  returning id into w_id;

  insert into public.approval_workflow_versions (company_id, workflow_id, version_no, status, notes)
  values (_company_id, w_id, 1, 'draft', 'System default version')
  returning id into v_id;

  insert into public.approval_workflow_steps (
    company_id, version_id, step_no, name, rule, allow_self_approval, restrict_creator)
  values (_company_id, v_id, 1, 'Approval', 'any_one',
          _target_type = 'commitment_variance', false)
  returning id into s_id;

  insert into public.approval_step_assignments (company_id, step_id, assignee_type, capability)
  values (_company_id, s_id, 'capability', 'approve');

  update public.approval_workflow_versions
     set status = 'published', published_at = now() where id = v_id;
  update public.approval_workflows
     set status = 'published', published_version_id = v_id where id = w_id;
  perform set_config('pedra.approval_fn', 'off', true);
  return v_id;
end $$;

-- ---------- callback runner --------------------------------------------
create or replace function public.approval_run_callback(_request_id uuid, _event text)
returns text language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; fn text;
begin
  select * into r from public.approval_requests where id = _request_id;
  if r.id is null then return 'not_found'; end if;
  select function_name into fn from public.approval_callbacks
   where target_type = r.target_type and event = _event;

  perform set_config('pedra.approval_fn', 'on', true);
  if fn is null then
    update public.approval_requests set callback_status = 'not_required' where id = r.id;
    perform set_config('pedra.approval_fn', 'off', true);
    return 'not_required';
  end if;

  update public.approval_requests
     set callback_status = 'pending', callback_attempts = callback_attempts + 1
   where id = r.id;
  insert into public.approval_events (company_id, request_id, event, payload)
  values (r.company_id, r.id, 'callback_started', jsonb_build_object('handler', fn, 'event', _event));

  begin
    execute format('select %s($1, $2)', fn) using r.target_id, r.id;
    update public.approval_requests
       set callback_status = 'succeeded', callback_error = null, callback_at = now()
     where id = r.id;
    insert into public.approval_events (company_id, request_id, event, payload)
    values (r.company_id, r.id, 'callback_succeeded', jsonb_build_object('handler', fn));
    perform set_config('pedra.approval_fn', 'off', true);
    return 'succeeded';
  exception when others then
    perform set_config('pedra.approval_fn', 'on', true);
    update public.approval_requests
       set callback_status = 'failed', callback_error = sqlerrm, callback_at = now()
     where id = r.id;
    insert into public.approval_events (company_id, request_id, event, comment, payload)
    values (r.company_id, r.id, 'callback_failed', sqlerrm, jsonb_build_object('handler', fn));
    perform set_config('pedra.approval_fn', 'off', true);
    return 'failed';
  end;
end $$;

create or replace function public.retry_approval_callback(_request_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; ev text;
begin
  select * into r from public.approval_requests where id = _request_id for update;
  if r.id is null then raise exception 'Approval request not found'; end if;
  if not public.can_manage_company(r.company_id) then
    raise exception 'You do not have permission to retry approval callbacks' using errcode='42501';
  end if;
  if r.callback_status <> 'failed' then
    raise exception 'Only a failed callback can be retried' using errcode='check_violation';
  end if;
  ev := case r.decision when 'approved' then 'granted' when 'rejected' then 'rejected'
                        when 'returned' then 'returned' when 'withdrawn' then 'withdrawn'
                        when 'expired' then 'expired' else null end;
  if ev is null then raise exception 'This request has no domain callback' using errcode='check_violation'; end if;
  return public.approval_run_callback(_request_id, ev);
end $$;

-- ---------- terminal state ---------------------------------------------
create or replace function public.approval_finalise(
  _request_id uuid, _decision text, _reason text, _actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; ev text;
begin
  select * into r from public.approval_requests where id = _request_id;
  perform set_config('pedra.approval_fn', 'on', true);
  update public.approval_requests
     set decision = _decision, decided_by = _actor, decided_at = now(),
         decision_reason = coalesce(_reason, decision_reason), completed_at = now(),
         updated_by = coalesce(_actor, updated_by)
   where id = _request_id;
  insert into public.approval_events (company_id, request_id, event, comment, payload)
  values (r.company_id, _request_id, 'workflow_completed', _reason,
          jsonb_build_object('outcome', _decision));
  perform set_config('pedra.approval_fn', 'off', true);

  ev := case _decision when 'approved' then 'granted' when 'rejected' then 'rejected'
                       when 'returned' then 'returned' when 'withdrawn' then 'withdrawn'
                       when 'expired' then 'expired' else null end;
  if ev is not null then perform public.approval_run_callback(_request_id, ev); end if;
end $$;

-- ---------- deterministic step engine ----------------------------------
create or replace function public.approval_activate_stage(_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; stage integer; s record;
        n_approvers integer; already boolean;
begin
  select * into r from public.approval_requests where id = _request_id;
  select min(step_no) into stage from public.approval_workflow_steps
   where version_id = r.workflow_version_id and step_no >= r.current_step_no
     and public.approval_step_applies(min_amount, max_amount, r.requested_amount);
  if stage is null then return; end if;

  perform set_config('pedra.approval_fn', 'on', true);
  if stage <> r.current_step_no then
    update public.approval_requests set current_step_no = stage where id = _request_id;
  end if;
  select exists (select 1 from public.approval_events e
                  where e.request_id = _request_id and e.event = 'step_activated'
                    and e.step_no = stage) into already;
  if not already then
    insert into public.approval_events (company_id, request_id, event, step_no)
    values (r.company_id, _request_id, 'step_activated', stage);
  end if;

  for s in select * from public.approval_workflow_steps
            where version_id = r.workflow_version_id and step_no = stage
              and public.approval_step_applies(min_amount, max_amount, r.requested_amount)
  loop
    select count(*) into n_approvers from public.approval_step_approvers(s.id, _request_id);
    if n_approvers = 0 then
      perform set_config('pedra.approval_fn', 'off', true);
      raise exception 'No approver could be resolved for step "%". The request cannot proceed.', s.name
        using errcode = 'check_violation';
    end if;
    if not already then
      insert into public.approval_events (company_id, request_id, event, step_no, payload)
      values (r.company_id, _request_id, 'approver_resolved', stage,
              jsonb_build_object('step', s.name, 'approvers', n_approvers));
    end if;
  end loop;
  perform set_config('pedra.approval_fn', 'off', true);
end $$;

create or replace function public.approval_advance(_request_id uuid, _actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; stage integer; s record;
        required integer; got integer; all_ok boolean; guard integer := 0;
begin
  loop
    guard := guard + 1;
    if guard > 50 then raise exception 'Workflow could not be resolved' using errcode='check_violation'; end if;
    select * into r from public.approval_requests where id = _request_id;
    if r.decision <> 'pending' then return; end if;

    select min(step_no) into stage from public.approval_workflow_steps
     where version_id = r.workflow_version_id and step_no >= r.current_step_no
       and public.approval_step_applies(min_amount, max_amount, r.requested_amount);
    if stage is null then
      perform public.approval_finalise(_request_id, 'approved', null, _actor);
      return;
    end if;

    all_ok := true;
    for s in select * from public.approval_workflow_steps
              where version_id = r.workflow_version_id and step_no = stage
                and public.approval_step_applies(min_amount, max_amount, r.requested_amount)
    loop
      select count(distinct actor_id) into got from public.approval_decisions
       where request_id = _request_id and step_id = s.id
         and decision in ('approve','override_approve');
      required := case s.rule
        when 'any_one' then 1
        when 'quorum' then greatest(coalesce(s.quorum_count, 1), 1)
        else (select count(*) from public.approval_step_approvers(s.id, _request_id)) end;
      if got < required then all_ok := false; end if;
    end loop;

    if not all_ok then
      perform set_config('pedra.approval_fn', 'on', true);
      update public.approval_requests set current_step_no = stage where id = _request_id;
      perform set_config('pedra.approval_fn', 'off', true);
      perform public.approval_activate_stage(_request_id);
      return;
    end if;

    perform set_config('pedra.approval_fn', 'on', true);
    update public.approval_requests set current_step_no = stage + 1 where id = _request_id;
    perform set_config('pedra.approval_fn', 'off', true);
  end loop;
end $$;

-- ---------- submission --------------------------------------------------
create or replace function public.submit_approval_request(
  _company_id uuid, _target_type text, _target_id uuid,
  _reason text default null, _amount numeric default null,
  _snapshot jsonb default '{}'::jsonb, _target_label text default null,
  _workflow_id uuid default null, _candidates jsonb default '[]'::jsonb,
  _threshold_amount numeric default null, _rule_reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; req uuid; v public.approval_workflow_versions%rowtype; cand jsonb;
begin
  -- Submitting needs recording capability, or approval authority for domains
  -- where the approver is also the requesting officer.
  if not (public.can_record_company(_company_id) or public.can_approve_company(_company_id)) then
    raise exception 'You do not have permission to request approval' using errcode='42501';
  end if;
  if not exists (select 1 from public.approval_target_types where target_type = _target_type) then
    raise exception 'Unknown approval target type "%"', _target_type using errcode='check_violation';
  end if;
  if exists (select 1 from public.approval_requests
              where target_type = _target_type and target_id = _target_id and decision = 'pending') then
    raise exception 'An approval request is already pending for this record' using errcode='check_violation';
  end if;

  if _workflow_id is not null then
    select published_version_id into v_id from public.approval_workflows
     where id = _workflow_id and company_id = _company_id and status = 'published';
    if v_id is null then
      raise exception 'That workflow has no published version' using errcode='check_violation';
    end if;
  else
    select w.published_version_id into v_id from public.approval_workflows w
     where w.company_id = _company_id and w.target_type = _target_type
       and w.status = 'published' and not w.is_system
       and w.published_version_id is not null
     order by w.created_at desc limit 1;
  end if;
  if v_id is null then
    v_id := public.ensure_default_approval_workflow(_company_id, _target_type);
  end if;
  select * into v from public.approval_workflow_versions where id = v_id;

  if not exists (select 1 from public.approval_workflow_steps
                  where version_id = v_id
                    and public.approval_step_applies(min_amount, max_amount, _amount)) then
    raise exception 'This workflow has no approval step applicable to this request'
      using errcode='check_violation';
  end if;

  perform set_config('pedra.approval_fn', 'on', true);
  insert into public.approval_requests (
    company_id, target_type, target_id, target_label, reason, requested_amount,
    threshold_amount, rule_reference, workflow_id, workflow_version_id, snapshot,
    expires_at, current_step_no)
  values (_company_id, _target_type, _target_id, _target_label, _reason, _amount,
          _threshold_amount, _rule_reference, v.workflow_id, v_id, coalesce(_snapshot, '{}'::jsonb),
          case when v.expiry_hours is null then null else now() + make_interval(hours => v.expiry_hours) end,
          1)
  returning id into req;

  for cand in select * from jsonb_array_elements(coalesce(_candidates, '[]'::jsonb)) loop
    insert into public.approval_request_candidates (company_id, request_id, user_id, source)
    values (_company_id, req, (cand->>'user_id')::uuid, coalesce(cand->>'source', 'domain'))
    on conflict do nothing;
  end loop;

  insert into public.approval_events (company_id, request_id, event, comment, payload)
  values (_company_id, req, 'request_created', _reason,
          jsonb_build_object('target_type', _target_type, 'workflow_version', v.version_no));
  -- Legacy event kept so Phase 8A readers keep working unchanged.
  insert into public.approval_events (company_id, request_id, event, comment)
  values (_company_id, req, 'requested', _reason);
  perform set_config('pedra.approval_fn', 'off', true);

  perform public.approval_activate_stage(req);
  return req;
end $$;

-- ---------- decisions ---------------------------------------------------
create or replace function public.record_approval_decision(
  _request_id uuid, _decision text, _reason text default null,
  _override_reason text default null, _delegate_to uuid default null,
  _step_id uuid default null, _evidence_document_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.approval_requests%rowtype; s public.approval_workflow_steps%rowtype;
        d_id uuid; actor uuid := auth.uid(); is_override boolean; eligible boolean;
        legacy_event text;
begin
  select * into r from public.approval_requests where id = _request_id for update;
  if r.id is null then raise exception 'Approval request not found'; end if;
  if r.decision <> 'pending' then
    raise exception 'This approval request is already decided' using errcode='check_violation';
  end if;
  if _decision not in ('approve','reject','return','withdraw','delegate',
                       'override_approve','override_reject','expire','cancel','abstain') then
    raise exception 'Unknown decision "%"', _decision using errcode='check_violation';
  end if;

  is_override := _decision in ('override_approve','override_reject')
                 or coalesce(btrim(_override_reason), '') <> '';

  if _decision = 'withdraw' then
    if not (r.requested_by = actor or public.can_manage_company(r.company_id)) then
      raise exception 'You do not have permission to withdraw this request' using errcode='42501';
    end if;
  elsif _decision = 'cancel' then
    if not public.can_manage_company(r.company_id) then
      raise exception 'You do not have permission to cancel this request' using errcode='42501';
    end if;
  elsif _decision = 'expire' then
    if coalesce(current_setting('pedra.approval_fn', true), '') <> 'on'
       and not public.can_manage_company(r.company_id) then
      raise exception 'Expiry is applied by the approval engine' using errcode='42501';
    end if;
  else
    if not public.can_approve_company(r.company_id) then
      raise exception 'You do not have approval authority' using errcode='42501';
    end if;
  end if;
  if is_override and not public.can_override_approval(r.company_id) then
    raise exception 'You do not have permission to override an approval' using errcode='42501';
  end if;
  if _decision in ('reject','override_reject','return') and coalesce(btrim(_reason), '') = '' then
    raise exception 'A reason is required' using errcode='check_violation';
  end if;
  if is_override and coalesce(btrim(_override_reason), '') = '' and _decision in ('override_approve','override_reject') then
    raise exception 'An override reason is required' using errcode='check_violation';
  end if;

  if _decision in ('approve','override_approve','reject','override_reject','return','delegate','abstain') then
    if _step_id is not null then
      select * into s from public.approval_workflow_steps where id = _step_id;
    else
      select st.* into s from public.approval_workflow_steps st
       where st.version_id = r.workflow_version_id and st.step_no = r.current_step_no
         and public.approval_step_applies(st.min_amount, st.max_amount, r.requested_amount)
         and (exists (select 1 from public.approval_step_approvers(st.id, r.id) a where a.user_id = actor)
              or is_override)
       order by st.name limit 1;
    end if;
    if s.id is null then
      raise exception 'You are not an approver for the current step' using errcode='42501';
    end if;

    select exists (select 1 from public.approval_step_approvers(s.id, r.id) a where a.user_id = actor)
      into eligible;
    if not eligible and not is_override then
      raise exception 'You are not an approver for the current step' using errcode='42501';
    end if;

    if _decision in ('approve','override_approve') then
      if r.requested_by = actor and not s.allow_self_approval
         and coalesce(btrim(_override_reason), '') = '' then
        raise exception 'You cannot approve your own request' using errcode='42501';
      end if;
      if s.restrict_creator and coalesce((r.snapshot->>'created_by')::uuid, '00000000-0000-0000-0000-000000000000') = actor
         and coalesce(btrim(_override_reason), '') = '' and not s.allow_self_approval then
        raise exception 'The record creator cannot approve this step' using errcode='42501';
      end if;
      if s.incompatible_with_step_no is not null and exists (
           select 1 from public.approval_decisions d
            where d.request_id = r.id and d.actor_id = actor
              and d.step_no = s.incompatible_with_step_no
              and d.decision in ('approve','override_approve')) then
        raise exception 'You already approved an incompatible step of this workflow' using errcode='42501';
      end if;
      if exists (select 1 from public.approval_decisions d
                  where d.request_id = r.id and d.step_id = s.id and d.actor_id = actor
                    and d.decision in ('approve','override_approve')) then
        raise exception 'You have already decided this step' using errcode='check_violation';
      end if;
    end if;

    if _decision = 'delegate' then
      if _delegate_to is null then
        raise exception 'Select the person you are delegating to' using errcode='check_violation';
      end if;
      if not exists (select 1 from public.user_roles ur
                      where ur.user_id = _delegate_to and ur.company_id = r.company_id
                        and ur.role::text in ('owner','manager','approver')) then
        raise exception 'A delegate must hold equivalent approval authority' using errcode='42501';
      end if;
    end if;
  end if;

  insert into public.approval_decisions (
    company_id, request_id, step_id, step_no, actor_id, decision, reason,
    override_reason, delegated_to, evidence_document_id)
  values (r.company_id, r.id, s.id, coalesce(s.step_no, r.current_step_no), actor, _decision,
          _reason, nullif(btrim(coalesce(_override_reason, '')), ''), _delegate_to, _evidence_document_id)
  returning id into d_id;

  perform set_config('pedra.approval_fn', 'on', true);
  insert into public.approval_events (company_id, request_id, event, step_no, decision_id, comment, payload)
  values (r.company_id, r.id, 'decision', coalesce(s.step_no, r.current_step_no), d_id,
          coalesce(_override_reason, _reason), jsonb_build_object('decision', _decision));
  legacy_event := case
    when _decision in ('override_approve','override_reject') then 'overridden'
    when _decision = 'approve' and coalesce(btrim(_override_reason), '') <> '' then 'overridden'
    when _decision = 'approve' then 'approved'
    when _decision = 'reject' then 'rejected'
    when _decision = 'withdraw' then 'withdrawn'
    when _decision = 'return' then 'returned'
    when _decision = 'expire' then 'expired'
    when _decision = 'cancel' then 'cancelled'
    when _decision = 'delegate' then 'delegation'
    else 'commented' end;
  insert into public.approval_events (company_id, request_id, event, step_no, decision_id, comment)
  values (r.company_id, r.id, legacy_event, coalesce(s.step_no, r.current_step_no), d_id,
          coalesce(_override_reason, _reason));
  perform set_config('pedra.approval_fn', 'off', true);

  if _decision in ('reject','override_reject') then
    perform public.approval_finalise(r.id, 'rejected', _reason, actor);
  elsif _decision = 'return' then
    perform public.approval_finalise(r.id, 'returned', _reason, actor);
  elsif _decision = 'withdraw' then
    perform public.approval_finalise(r.id, 'withdrawn', _reason, actor);
  elsif _decision = 'cancel' then
    perform public.approval_finalise(r.id, 'cancelled', _reason, actor);
  elsif _decision = 'expire' then
    perform public.approval_finalise(r.id, 'expired', coalesce(_reason, 'Approval window elapsed'), actor);
  elsif _decision in ('approve','override_approve') then
    perform public.approval_advance(r.id, actor);
  elsif _decision = 'delegate' then
    insert into public.approval_request_candidates (company_id, request_id, user_id, source)
    values (r.company_id, r.id, _delegate_to, 'delegation') on conflict do nothing;
  end if;
  return d_id;
end $$;

create or replace function public.withdraw_approval_request(_request_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.record_approval_decision(_request_id, 'withdraw', _reason);
end $$;

-- ---------- maintenance: reminders, escalation, expiry -----------------
create or replace function public.run_approval_maintenance(_company_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v public.approval_workflow_versions%rowtype;
        n_rem integer := 0; n_esc integer := 0; n_exp integer := 0; u record;
begin
  if not public.can_manage_company(_company_id) then
    raise exception 'You do not have permission to run approval maintenance' using errcode='42501';
  end if;
  for r in select * from public.approval_requests
            where company_id = _company_id and decision = 'pending' order by requested_at
  loop
    select * into v from public.approval_workflow_versions where id = r.workflow_version_id;
    if r.expires_at is not null and r.expires_at <= now() then
      perform set_config('pedra.approval_fn', 'on', true);
      perform public.record_approval_decision(r.id, 'expire', 'Approval window elapsed');
      perform set_config('pedra.approval_fn', 'off', true);
      n_exp := n_exp + 1;
      continue;
    end if;
    if v.reminder_hours is not null
       and now() >= coalesce(r.last_reminder_at, r.requested_at) + make_interval(hours => v.reminder_hours) then
      perform set_config('pedra.approval_fn', 'on', true);
      insert into public.approval_events (company_id, request_id, event, step_no)
      values (r.company_id, r.id, 'reminder', r.current_step_no);
      update public.approval_requests set last_reminder_at = now() where id = r.id;
      perform set_config('pedra.approval_fn', 'off', true);
      n_rem := n_rem + 1;
    end if;
    if v.escalation_hours is not null and r.escalated_at is null
       and now() >= r.requested_at + make_interval(hours => v.escalation_hours) then
      perform set_config('pedra.approval_fn', 'on', true);
      for u in select ur.user_id from public.user_roles ur
                where ur.company_id = _company_id and ur.role::text in ('owner','manager')
      loop
        insert into public.approval_request_candidates (company_id, request_id, user_id, source)
        values (_company_id, r.id, u.user_id, 'escalation') on conflict do nothing;
      end loop;
      insert into public.approval_events (company_id, request_id, event, step_no)
      values (r.company_id, r.id, 'escalation', r.current_step_no);
      update public.approval_requests set escalated_at = now() where id = r.id;
      perform set_config('pedra.approval_fn', 'off', true);
      n_esc := n_esc + 1;
    end if;
  end loop;
  return jsonb_build_object('reminders', n_rem, 'escalations', n_esc, 'expired', n_exp);
end $$;

-- ---------- workflow configuration --------------------------------------
create or replace function public.create_approval_workflow(
  _company_id uuid, _code text, _name text, _target_type text, _description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare w_id uuid; v_id uuid;
begin
  if not public.can_manage_company(_company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  if coalesce(btrim(_code), '') = '' or coalesce(btrim(_name), '') = '' then
    raise exception 'A workflow needs a code and a name' using errcode='check_violation';
  end if;
  if not exists (select 1 from public.approval_target_types where target_type = _target_type) then
    raise exception 'Unknown approval target type "%"', _target_type using errcode='check_violation';
  end if;
  perform set_config('pedra.approval_fn', 'on', true);
  insert into public.approval_workflows (company_id, code, name, description, target_type)
  values (_company_id, btrim(_code), btrim(_name), _description, _target_type)
  returning id into w_id;
  insert into public.approval_workflow_versions (company_id, workflow_id, version_no, status)
  values (_company_id, w_id, 1, 'draft') returning id into v_id;
  perform set_config('pedra.approval_fn', 'off', true);
  return w_id;
end $$;

create or replace function public.create_approval_workflow_version(
  _workflow_id uuid, _copy_from uuid default null, _notes text default null,
  _expiry_hours integer default null, _reminder_hours integer default null,
  _escalation_hours integer default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare w public.approval_workflows%rowtype; v_id uuid; next_no integer; s record; new_step uuid;
begin
  select * into w from public.approval_workflows where id = _workflow_id;
  if w.id is null then raise exception 'Workflow not found'; end if;
  if not public.can_manage_company(w.company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  if w.status = 'archived' then
    raise exception 'An archived workflow cannot gain new versions' using errcode='check_violation';
  end if;
  select coalesce(max(version_no), 0) + 1 into next_no
    from public.approval_workflow_versions where workflow_id = _workflow_id;
  perform set_config('pedra.approval_fn', 'on', true);
  insert into public.approval_workflow_versions (
    company_id, workflow_id, version_no, status, notes, expiry_hours, reminder_hours, escalation_hours)
  values (w.company_id, _workflow_id, next_no, 'draft', _notes, _expiry_hours, _reminder_hours, _escalation_hours)
  returning id into v_id;
  if _copy_from is not null then
    for s in select * from public.approval_workflow_steps where version_id = _copy_from loop
      insert into public.approval_workflow_steps (
        company_id, version_id, step_no, name, rule, quorum_count, min_amount, max_amount,
        allow_self_approval, restrict_creator, incompatible_with_step_no,
        reminder_after_hours, escalate_after_hours)
      values (w.company_id, v_id, s.step_no, s.name, s.rule, s.quorum_count, s.min_amount, s.max_amount,
        s.allow_self_approval, s.restrict_creator, s.incompatible_with_step_no,
        s.reminder_after_hours, s.escalate_after_hours)
      returning id into new_step;
      insert into public.approval_step_assignments (company_id, step_id, assignee_type, user_id, role, capability, candidate_source)
      select w.company_id, new_step, a.assignee_type, a.user_id, a.role, a.capability, a.candidate_source
        from public.approval_step_assignments a where a.step_id = s.id;
    end loop;
  end if;
  perform set_config('pedra.approval_fn', 'off', true);
  return v_id;
end $$;

create or replace function public.upsert_approval_workflow_step(
  _version_id uuid, _step_no integer, _name text, _rule text default 'any_one',
  _quorum_count integer default null, _min_amount numeric default null,
  _max_amount numeric default null, _allow_self_approval boolean default false,
  _restrict_creator boolean default true, _incompatible_with_step_no integer default null,
  _step_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.approval_workflow_versions%rowtype; s_id uuid;
begin
  select * into v from public.approval_workflow_versions where id = _version_id;
  if v.id is null then raise exception 'Workflow version not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  perform set_config('pedra.approval_fn', 'on', true);
  if _step_id is null then
    insert into public.approval_workflow_steps (
      company_id, version_id, step_no, name, rule, quorum_count, min_amount, max_amount,
      allow_self_approval, restrict_creator, incompatible_with_step_no)
    values (v.company_id, _version_id, _step_no, btrim(_name), _rule, _quorum_count,
      _min_amount, _max_amount, _allow_self_approval, _restrict_creator, _incompatible_with_step_no)
    returning id into s_id;
  else
    update public.approval_workflow_steps
       set step_no = _step_no, name = btrim(_name), rule = _rule, quorum_count = _quorum_count,
           min_amount = _min_amount, max_amount = _max_amount,
           allow_self_approval = _allow_self_approval, restrict_creator = _restrict_creator,
           incompatible_with_step_no = _incompatible_with_step_no, updated_by = auth.uid()
     where id = _step_id and version_id = _version_id
     returning id into s_id;
    if s_id is null then raise exception 'Workflow step not found'; end if;
  end if;
  perform set_config('pedra.approval_fn', 'off', true);
  return s_id;
end $$;

create or replace function public.delete_approval_workflow_step(_step_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.approval_workflow_versions%rowtype;
begin
  select ver.* into v from public.approval_workflow_versions ver
    join public.approval_workflow_steps s on s.version_id = ver.id where s.id = _step_id;
  if v.id is null then raise exception 'Workflow step not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  perform set_config('pedra.approval_fn', 'on', true);
  delete from public.approval_workflow_steps where id = _step_id;
  perform set_config('pedra.approval_fn', 'off', true);
end $$;

create or replace function public.set_approval_step_assignment(
  _step_id uuid, _assignee_type text, _user_id uuid default null, _role text default null,
  _capability text default null, _candidate_source text default null, _remove_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.approval_workflow_versions%rowtype; a_id uuid;
begin
  select ver.* into v from public.approval_workflow_versions ver
    join public.approval_workflow_steps s on s.version_id = ver.id where s.id = _step_id;
  if v.id is null then raise exception 'Workflow step not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  perform set_config('pedra.approval_fn', 'on', true);
  if _remove_id is not null then
    delete from public.approval_step_assignments where id = _remove_id and step_id = _step_id;
    perform set_config('pedra.approval_fn', 'off', true);
    return _remove_id;
  end if;
  insert into public.approval_step_assignments (
    company_id, step_id, assignee_type, user_id, role, capability, candidate_source)
  values (v.company_id, _step_id, _assignee_type, _user_id, _role, _capability, _candidate_source)
  returning id into a_id;
  perform set_config('pedra.approval_fn', 'off', true);
  return a_id;
end $$;

create or replace function public.publish_approval_workflow_version(_version_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v public.approval_workflow_versions%rowtype; s record; n integer;
begin
  select * into v from public.approval_workflow_versions where id = _version_id for update;
  if v.id is null then raise exception 'Workflow version not found'; end if;
  if not public.can_manage_company(v.company_id) then
    raise exception 'You do not have permission to publish workflows' using errcode='42501';
  end if;
  if v.status <> 'draft' then
    raise exception 'Only a draft version can be published' using errcode='check_violation';
  end if;
  if not exists (select 1 from public.approval_workflow_steps where version_id = _version_id) then
    raise exception 'A workflow version needs at least one step' using errcode='check_violation';
  end if;
  for s in select * from public.approval_workflow_steps where version_id = _version_id loop
    select count(*) into n from public.approval_step_assignments where step_id = s.id;
    if n = 0 then
      raise exception 'Step "%" has no approver assignment', s.name using errcode='check_violation';
    end if;
    if s.rule = 'quorum' and coalesce(s.quorum_count, 0) < 1 then
      raise exception 'Step "%" needs a quorum size', s.name using errcode='check_violation';
    end if;
  end loop;
  perform set_config('pedra.approval_fn', 'on', true);
  update public.approval_workflow_versions
     set status = 'published', published_at = now(), published_by = auth.uid()
   where id = _version_id;
  update public.approval_workflow_versions
     set status = 'archived', archived_at = now()
   where workflow_id = v.workflow_id and id <> _version_id and status = 'published';
  update public.approval_workflows
     set status = 'published', published_version_id = _version_id, updated_by = auth.uid()
   where id = v.workflow_id;
  perform set_config('pedra.approval_fn', 'off', true);
  return _version_id;
end $$;

create or replace function public.archive_approval_workflow(_workflow_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare w public.approval_workflows%rowtype;
begin
  select * into w from public.approval_workflows where id = _workflow_id;
  if w.id is null then raise exception 'Workflow not found'; end if;
  if not public.can_manage_company(w.company_id) then
    raise exception 'You do not have permission to configure workflows' using errcode='42501';
  end if;
  perform set_config('pedra.approval_fn', 'on', true);
  update public.approval_workflows
     set status = 'archived', archived_at = now(), published_version_id = null,
         description = coalesce(description, '') || coalesce(' — archived: ' || _reason, ''),
         updated_by = auth.uid()
   where id = _workflow_id;
  perform set_config('pedra.approval_fn', 'off', true);
end $$;

-- ============================================================
-- Phase 8C — domain callbacks, commitment rewiring, views
-- ============================================================

create or replace function public.approval_cb_commitment_granted(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; d record;
begin
  select * into c from public.commitments where id = _target_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if c.approval_status = 'approved' then return; end if;   -- idempotent
  if c.status <> 'pending_approval' then
    raise exception 'Commitment % is no longer awaiting approval', _target_id using errcode='check_violation';
  end if;
  select actor_id, override_reason into d from public.approval_decisions
   where request_id = _request_id and decision in ('approve','override_approve')
   order by created_at desc limit 1;
  perform set_config('pedra.commitment_fn', 'on', true);
  update public.commitments
     set status = 'approved', approval_status = 'approved',
         approved_by = d.actor_id, approved_at = now(),
         approval_override_reason = d.override_reason, updated_by = d.actor_id
   where id = _target_id;
  perform set_config('pedra.commitment_fn', 'off', true);
end $$;

create or replace function public.approval_cb_commitment_rejected(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  select * into c from public.commitments where id = _target_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if c.approval_status = 'rejected' then return; end if;   -- idempotent
  if c.status <> 'pending_approval' then
    raise exception 'Commitment % is no longer awaiting approval', _target_id using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn', 'on', true);
  update public.commitments
     set status = 'draft', approval_status = 'rejected', updated_by = auth.uid()
   where id = _target_id;
  perform set_config('pedra.commitment_fn', 'off', true);
end $$;

create or replace function public.approval_cb_commitment_released(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  select * into c from public.commitments where id = _target_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if c.approval_status <> 'pending' then return; end if;   -- idempotent
  perform set_config('pedra.commitment_fn', 'on', true);
  update public.commitments
     set status = 'draft', approval_status = 'not_requested', updated_by = auth.uid()
   where id = _target_id;
  perform set_config('pedra.commitment_fn', 'off', true);
end $$;

create or replace function public.approval_cb_commitment_variance_granted(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.commitment_schedule_versions%rowtype; d record;
begin
  select * into v from public.commitment_schedule_versions where id = _target_id for update;
  if v.id is null then raise exception 'Schedule version not found'; end if;
  if v.variance_approved then return; end if;              -- idempotent
  select reason, override_reason into d from public.approval_decisions
   where request_id = _request_id and decision in ('approve','override_approve')
   order by created_at desc limit 1;
  perform set_config('pedra.commitment_fn', 'on', true);
  update public.commitment_schedule_versions
     set variance_approved = true,
         variance_reason = coalesce(d.reason, variance_reason),
         approval_request_id = _request_id
   where id = _target_id;
  perform set_config('pedra.commitment_fn', 'off', true);
end $$;

insert into public.approval_callbacks (target_type, event, function_name) values
  ('commitment','granted','public.approval_cb_commitment_granted'),
  ('commitment','rejected','public.approval_cb_commitment_rejected'),
  ('commitment','returned','public.approval_cb_commitment_released'),
  ('commitment','withdrawn','public.approval_cb_commitment_released'),
  ('commitment','expired','public.approval_cb_commitment_released'),
  ('commitment_variance','granted','public.approval_cb_commitment_variance_granted');

create or replace function public.request_commitment_approval(_commitment_id uuid, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; v_req uuid;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to request approval' using errcode='42501';
  end if;
  if c.status <> 'draft' then
    raise exception 'Only a draft commitment can be sent for approval' using errcode='check_violation';
  end if;

  v_req := public.submit_approval_request(
    _company_id => c.company_id,
    _target_type => 'commitment',
    _target_id => c.id,
    _reason => _reason,
    _amount => c.authorised_amount,
    _snapshot => jsonb_build_object(
      'title', c.title, 'code', c.code, 'commitment_type', c.commitment_type,
      'currency', c.currency, 'authorised_amount', c.authorised_amount,
      'start_date', c.start_date, 'end_date', c.end_date,
      'counterparty_id', c.counterparty_id, 'description', c.description),
    _target_label => c.title);

  perform set_config('pedra.commitment_fn', 'on', true);
  update public.commitments set status = 'pending_approval', approval_status = 'pending',
    updated_by = auth.uid() where id = _commitment_id;
  perform set_config('pedra.commitment_fn', 'off', true);
  return v_req;
end $$;

create or replace function public.approve_commitment(
  _commitment_id uuid, _comment text default null, _override_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; r public.approval_requests%rowtype;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_approve_company(c.company_id) then
    raise exception 'You do not have approval authority' using errcode='42501';
  end if;
  if c.status <> 'pending_approval' then
    raise exception 'Only a commitment pending approval can be approved' using errcode='check_violation';
  end if;
  select * into r from public.approval_requests
   where target_type = 'commitment' and target_id = _commitment_id and decision = 'pending' for update;
  if r.id is null then
    raise exception 'No pending approval request for this commitment' using errcode='check_violation';
  end if;
  perform public.record_approval_decision(
    _request_id => r.id,
    _decision => 'approve',
    _reason => _comment,
    _override_reason => _override_reason);
end $$;

create or replace function public.reject_commitment(_commitment_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; r public.approval_requests%rowtype;
begin
  if coalesce(btrim(_reason), '') = '' then
    raise exception 'A rejection reason is required' using errcode='check_violation';
  end if;
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_approve_company(c.company_id) then
    raise exception 'You do not have approval authority' using errcode='42501';
  end if;
  select * into r from public.approval_requests
   where target_type = 'commitment' and target_id = _commitment_id and decision = 'pending' for update;
  if r.id is null then raise exception 'No pending approval request' using errcode='check_violation'; end if;
  perform public.record_approval_decision(
    _request_id => r.id, _decision => 'reject', _reason => _reason);
end $$;

create or replace function public.approve_commitment_variance(_version_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.commitment_schedule_versions%rowtype; v_req uuid;
begin
  if coalesce(btrim(_reason), '') = '' then
    raise exception 'A variance reason is required' using errcode='check_violation';
  end if;
  select * into v from public.commitment_schedule_versions where id = _version_id for update;
  if v.id is null then raise exception 'Schedule version not found'; end if;
  if not public.can_approve_company(v.company_id) then
    raise exception 'You do not have approval authority' using errcode='42501';
  end if;
  v_req := public.submit_approval_request(
    _company_id => v.company_id,
    _target_type => 'commitment_variance',
    _target_id => v.id,
    _reason => _reason,
    _amount => v.variance_amount,
    _snapshot => jsonb_build_object('commitment_id', v.commitment_id, 'version_no', v.version_no,
                                    'variance_amount', v.variance_amount, 'total_amount', v.total_amount),
    _target_label => 'Schedule version ' || v.version_no);
  perform public.record_approval_decision(
    _request_id => v_req, _decision => 'approve', _reason => _reason);
end $$;

-- ---------- reporting views ---------------------------------------------
create or replace view public.v_approval_workflow_overview
with (security_invoker = true) as
select
  w.id as workflow_id, w.company_id, w.code, w.name, w.description, w.target_type,
  w.status, w.is_system, w.published_version_id, w.archived_at, w.created_at,
  pv.version_no as published_version_no, pv.published_at,
  (select count(*) from public.approval_workflow_versions v where v.workflow_id = w.id) as version_count,
  (select count(*) from public.approval_workflow_steps s where s.version_id = w.published_version_id) as step_count,
  (select count(*) from public.approval_requests r where r.workflow_id = w.id) as request_count,
  (select count(*) from public.approval_requests r where r.workflow_id = w.id and r.decision = 'pending') as pending_count
from public.approval_workflows w
left join public.approval_workflow_versions pv on pv.id = w.published_version_id;

create or replace view public.v_approval_request_detail
with (security_invoker = true) as
select
  r.id as request_id, r.company_id, r.target_type, r.target_id, r.target_label,
  r.reason, r.requested_amount, r.threshold_amount, r.rule_reference,
  r.requested_by, r.requested_at, r.decision, r.decided_by, r.decided_at, r.decision_reason,
  r.current_step_no, r.snapshot, r.expires_at, r.completed_at,
  r.callback_status, r.callback_attempts, r.callback_error, r.callback_at,
  r.last_reminder_at, r.escalated_at,
  w.id as workflow_id, w.name as workflow_name, w.code as workflow_code, w.is_system,
  v.id as workflow_version_id, v.version_no as workflow_version_no,
  t.label as target_type_label,
  (select count(*) from public.approval_decisions d where d.request_id = r.id) as decision_count,
  (select count(*) from public.approval_events e where e.request_id = r.id) as event_count,
  (select string_agg(s.name, ', ' order by s.name) from public.approval_workflow_steps s
    where s.version_id = r.workflow_version_id and s.step_no = r.current_step_no) as current_step_name
from public.approval_requests r
left join public.approval_workflows w on w.id = r.workflow_id
left join public.approval_workflow_versions v on v.id = r.workflow_version_id
left join public.approval_target_types t on t.target_type = r.target_type;

create or replace view public.v_approval_inbox
with (security_invoker = true) as
select distinct
  r.id as request_id, r.company_id, r.target_type, r.target_id, r.target_label,
  r.requested_amount, r.requested_by, r.requested_at, r.expires_at, r.current_step_no,
  s.id as step_id, s.name as step_name, s.rule, a.user_id as approver_id
from public.approval_requests r
join public.approval_workflow_steps s
  on s.version_id = r.workflow_version_id and s.step_no = r.current_step_no
 and public.approval_step_applies(s.min_amount, s.max_amount, r.requested_amount)
cross join lateral public.approval_step_approvers(s.id, r.id) a
where r.decision = 'pending';

create or replace view public.v_approval_history
with (security_invoker = true) as
select
  d.id as history_id, d.request_id, d.company_id, r.target_type, r.target_id,
  d.step_no, d.decision, d.actor_id, d.reason, d.override_reason, d.delegated_to,
  d.created_at, 'decision'::text as source
from public.approval_decisions d
join public.approval_requests r on r.id = d.request_id
union all
select
  r.id as history_id, r.id as request_id, r.company_id, r.target_type, r.target_id,
  1 as step_no, r.decision, r.decided_by, r.decision_reason, null::text, null::uuid,
  r.decided_at as created_at, 'legacy'::text as source
from public.approval_requests r
where r.decision <> 'pending' and r.decided_at is not null
  and not exists (select 1 from public.approval_decisions d2 where d2.request_id = r.id);

grant select on public.v_approval_workflow_overview to authenticated;
grant select on public.v_approval_request_detail to authenticated;
grant select on public.v_approval_inbox to authenticated;
grant select on public.v_approval_history to authenticated;