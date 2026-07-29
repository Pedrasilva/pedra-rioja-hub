-- ============================================================
-- Phase 8A — Commitment layer
-- ============================================================

-- ---------- helper: approval capability -------------------------------
create or replace function public.can_approve_company(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles ur
                 where ur.user_id = auth.uid() and ur.company_id = _company_id
                   and ur.role in ('owner','manager','approver'))
$$;

-- ---------- 1. commitments --------------------------------------------
create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  commitment_type text not null default 'other'
    check (commitment_type in ('capex_contract','purchase_order','maintenance','service_contract','insurance','utility','tax_instalment','other')),
  code text,
  title text not null,
  description text,
  currency char(3) not null default 'EUR',
  authorised_amount numeric(14,2) not null default 0 check (authorised_amount >= 0),
  committed_amount numeric(14,2) not null default 0,
  start_date date,
  end_date date,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','active','completed','cancelled')),
  approval_status text not null default 'not_requested'
    check (approval_status in ('not_requested','pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  approval_override_reason text,
  source_type text,
  source_id uuid,
  cancellation_reason text,
  completion_notes text,
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_commitments_company on public.commitments(company_id) where deleted_at is null;
create index idx_commitments_status on public.commitments(company_id, status);
create index idx_commitments_source on public.commitments(source_type, source_id);
create index idx_commitments_counterparty on public.commitments(counterparty_id);

grant select, insert, update on public.commitments to authenticated;
grant all on public.commitments to service_role;
alter table public.commitments enable row level security;
create policy "commitments_select" on public.commitments for select to authenticated
  using (public.can_view_company(company_id));
create policy "commitments_insert" on public.commitments for insert to authenticated
  with check (public.can_record_company(company_id));
create policy "commitments_update" on public.commitments for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));

-- ---------- 2. approvals ----------------------------------------------
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  target_type text not null
    check (target_type in ('commitment','commitment_change','commitment_schedule_version','commitment_variance')),
  target_id uuid not null,
  reason text,
  requested_amount numeric(14,2),
  threshold_amount numeric(14,2),
  rule_reference text,
  requested_by uuid not null default auth.uid(),
  requested_at timestamptz not null default now(),
  decision text not null default 'pending'
    check (decision in ('pending','approved','rejected','withdrawn')),
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_approval_pending on public.approval_requests(target_type, target_id)
  where decision = 'pending';
create index idx_approval_target on public.approval_requests(target_type, target_id);
create index idx_approval_company on public.approval_requests(company_id, decision);

grant select, insert on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;
alter table public.approval_requests enable row level security;
create policy "approvals_select" on public.approval_requests for select to authenticated
  using (public.can_view_company(company_id));
create policy "approvals_insert" on public.approval_requests for insert to authenticated
  with check (public.can_record_company(company_id) and requested_by = auth.uid());

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  event text not null check (event in ('requested','approved','rejected','withdrawn','overridden','commented')),
  actor_id uuid default auth.uid(),
  comment text,
  created_at timestamptz not null default now()
);
create index idx_approval_events_request on public.approval_events(request_id, created_at);
grant select on public.approval_events to authenticated;
grant all on public.approval_events to service_role;
alter table public.approval_events enable row level security;
create policy "approval_events_select" on public.approval_events for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 3. schedule versions --------------------------------------
create table public.commitment_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  version_no integer not null,
  schedule_type text not null default 'single'
    check (schedule_type in ('single','milestone','monthly','custom')),
  effective_from date not null,
  reason text,
  status text not null default 'draft'
    check (status in ('draft','active','superseded','cancelled')),
  is_current boolean not null default false,
  total_amount numeric(14,2) not null default 0,
  variance_amount numeric(14,2) not null default 0,
  variance_approved boolean not null default false,
  variance_reason text,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  requires_approval boolean not null default false,
  activated_at timestamptz,
  activated_by uuid,
  superseded_at timestamptz,
  superseded_by_version_id uuid references public.commitment_schedule_versions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (commitment_id, version_no)
);
create unique index uq_commitment_current_version on public.commitment_schedule_versions(commitment_id)
  where is_current;
grant select, insert, update on public.commitment_schedule_versions to authenticated;
grant all on public.commitment_schedule_versions to service_role;
alter table public.commitment_schedule_versions enable row level security;
create policy "csv_select" on public.commitment_schedule_versions for select to authenticated
  using (public.can_view_company(company_id));
create policy "csv_insert" on public.commitment_schedule_versions for insert to authenticated
  with check (public.can_record_company(company_id));
create policy "csv_update" on public.commitment_schedule_versions for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));

-- ---------- 4. schedule lines -----------------------------------------
create table public.commitment_schedule_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  version_id uuid not null references public.commitment_schedule_versions(id) on delete cascade,
  line_no integer not null,
  expected_date date not null,
  amount numeric(14,2) not null,
  line_type text not null default 'instalment'
    check (line_type in ('instalment','milestone','retention','contingency','final')),
  status text not null default 'scheduled'
    check (status in ('scheduled','invoiced','paid','reconciled','superseded','cancelled')),
  is_retention boolean not null default false,
  is_contingency boolean not null default false,
  description text,
  source_type text,
  source_id uuid,
  superseded_at timestamptz,
  superseded_by_version_id uuid references public.commitment_schedule_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  unique (version_id, line_no)
);
create index idx_csl_commitment on public.commitment_schedule_lines(commitment_id, status);
create index idx_csl_version on public.commitment_schedule_lines(version_id);
grant select, insert, update on public.commitment_schedule_lines to authenticated;
grant all on public.commitment_schedule_lines to service_role;
alter table public.commitment_schedule_lines enable row level security;
create policy "csl_select" on public.commitment_schedule_lines for select to authenticated
  using (public.can_view_company(company_id));
create policy "csl_insert" on public.commitment_schedule_lines for insert to authenticated
  with check (public.can_record_company(company_id));
create policy "csl_update" on public.commitment_schedule_lines for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));

-- ---------- 5. drawdowns ----------------------------------------------
create table public.commitment_drawdowns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  document_id uuid references public.financial_documents(id) on delete restrict,
  schedule_line_id uuid references public.commitment_schedule_lines(id) on delete set null,
  amount numeric(14,2) not null check (amount <> 0),
  drawdown_date date not null default current_date,
  kind text not null default 'allocation'
    check (kind in ('allocation','retention_release','variation','reversal')),
  status text not null default 'active' check (status in ('active','reversed')),
  reverses_drawdown_id uuid references public.commitment_drawdowns(id) on delete set null,
  reversal_reason text,
  reversed_at timestamptz,
  reversed_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_dd_commitment on public.commitment_drawdowns(commitment_id, status);
create index idx_dd_document on public.commitment_drawdowns(document_id);
grant select, insert, update on public.commitment_drawdowns to authenticated;
grant all on public.commitment_drawdowns to service_role;
alter table public.commitment_drawdowns enable row level security;
create policy "dd_select" on public.commitment_drawdowns for select to authenticated
  using (public.can_view_company(company_id));
create policy "dd_insert" on public.commitment_drawdowns for insert to authenticated
  with check (public.can_record_company(company_id));
create policy "dd_update" on public.commitment_drawdowns for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));

-- ---------- 6. maintenance jobs ---------------------------------------
create table public.maintenance_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  description text,
  status text not null default 'requested'
    check (status in ('requested','scheduled','in_progress','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  requested_date date not null default current_date,
  target_date date,
  completion_date date,
  responsible_user_id uuid,
  responsible_name text,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  commitment_id uuid references public.commitments(id) on delete set null,
  cancellation_reason text,
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_mj_company on public.maintenance_jobs(company_id, status) where deleted_at is null;
create index idx_mj_commitment on public.maintenance_jobs(commitment_id);
grant select, insert, update on public.maintenance_jobs to authenticated;
grant all on public.maintenance_jobs to service_role;
alter table public.maintenance_jobs enable row level security;
create policy "mj_select" on public.maintenance_jobs for select to authenticated
  using (public.can_view_company(company_id));
create policy "mj_insert" on public.maintenance_jobs for insert to authenticated
  with check (public.can_record_company(company_id));
create policy "mj_update" on public.maintenance_jobs for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));

-- ---------- updated_at + audit ----------------------------------------
create trigger trg_commitments_touch before update on public.commitments
  for each row execute function public.tg_touch_row();
create trigger trg_csv_touch before update on public.commitment_schedule_versions
  for each row execute function public.tg_touch_row();
create trigger trg_csl_touch before update on public.commitment_schedule_lines
  for each row execute function public.tg_touch_row();
create trigger trg_dd_touch before update on public.commitment_drawdowns
  for each row execute function public.tg_touch_row();
create trigger trg_mj_touch before update on public.maintenance_jobs
  for each row execute function public.tg_touch_row();
create trigger trg_ar_touch before update on public.approval_requests
  for each row execute function public.tg_touch_row();

create trigger trg_commitments_audit after insert or update or delete on public.commitments
  for each row execute function public.tg_audit_row();
create trigger trg_csv_audit after insert or update or delete on public.commitment_schedule_versions
  for each row execute function public.tg_audit_row();
create trigger trg_csl_audit after insert or update or delete on public.commitment_schedule_lines
  for each row execute function public.tg_audit_row();
create trigger trg_dd_audit after insert or update or delete on public.commitment_drawdowns
  for each row execute function public.tg_audit_row();
create trigger trg_mj_audit after insert or update or delete on public.maintenance_jobs
  for each row execute function public.tg_audit_row();
create trigger trg_ar_audit after insert or update or delete on public.approval_requests
  for each row execute function public.tg_audit_row();

-- ---------- lifecycle guards ------------------------------------------
create or replace function public.tg_guard_commitment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  internal boolean := coalesce(current_setting('pedra.commitment_fn', true), '') = 'on';
  rank_old int; rank_new int;
begin
  if tg_op = 'DELETE' then
    raise exception 'Commitments are archived, never deleted' using errcode='check_violation';
  end if;
  if tg_op = 'INSERT' then
    if not internal and (new.status <> 'draft' or new.approval_status <> 'not_requested') then
      raise exception 'Commitments must be created as unapproved drafts' using errcode='check_violation';
    end if;
    return new;
  end if;

  rank_old := case old.status when 'draft' then 1 when 'pending_approval' then 2 when 'approved' then 3
                              when 'active' then 4 when 'completed' then 5 else 6 end;
  rank_new := case new.status when 'draft' then 1 when 'pending_approval' then 2 when 'approved' then 3
                              when 'active' then 4 when 'completed' then 5 else 6 end;

  if not internal then
    if old.status <> 'draft' then
      raise exception 'A % commitment can only be changed through its lifecycle functions', old.status
        using errcode='check_violation';
    end if;
    if new.status is distinct from old.status
       or new.approval_status is distinct from old.approval_status
       or new.committed_amount is distinct from old.committed_amount then
      raise exception 'Lifecycle and committed values are maintained by server functions'
        using errcode='check_violation';
    end if;
    return new;
  end if;

  if old.status in ('completed','cancelled') and new.status <> old.status then
    raise exception 'A % commitment is final', old.status using errcode='check_violation';
  end if;
  if rank_new < rank_old and new.status <> 'cancelled' then
    raise exception 'Commitment lifecycle cannot go backwards' using errcode='check_violation';
  end if;
  if new.status = 'cancelled' and coalesce(btrim(new.cancellation_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_guard_commitment before insert or update or delete on public.commitments
  for each row execute function public.tg_guard_commitment();

create or replace function public.tg_guard_commitment_schedule()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.commitment_fn', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    raise exception 'Schedule records are superseded, never deleted' using errcode='check_violation';
  end if;
  if internal then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'Schedule records are created through commitment schedule functions'
      using errcode='check_violation';
  end if;
  raise exception 'Schedule records are maintained by commitment schedule functions'
    using errcode='check_violation';
end $$;
create trigger trg_guard_csv before insert or update or delete on public.commitment_schedule_versions
  for each row execute function public.tg_guard_commitment_schedule();
create trigger trg_guard_csl before insert or update or delete on public.commitment_schedule_lines
  for each row execute function public.tg_guard_commitment_schedule();

create or replace function public.tg_guard_commitment_line_immutable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status in ('invoiced','paid','reconciled') then
    if new.amount is distinct from old.amount
       or new.expected_date is distinct from old.expected_date
       or new.status = 'superseded' then
      raise exception 'Invoiced, paid or reconciled schedule lines are immutable'
        using errcode='check_violation';
    end if;
  end if;
  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'A superseded schedule line cannot be revived' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_csl_immutable before update on public.commitment_schedule_lines
  for each row execute function public.tg_guard_commitment_line_immutable();

create or replace function public.tg_guard_drawdown()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.commitment_fn', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    raise exception 'Drawdowns are reversed, never deleted' using errcode='check_violation';
  end if;
  if not internal then
    raise exception 'Drawdowns are recorded through commitment drawdown functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'UPDATE' and old.status = 'reversed' then
    raise exception 'A reversed drawdown is immutable' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_guard_dd before insert or update or delete on public.commitment_drawdowns
  for each row execute function public.tg_guard_drawdown();

create or replace function public.tg_guard_approval()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.commitment_fn', true), '') = 'on';
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
      raise exception 'This approval request is already decided' using errcode='check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_ar before update or delete on public.approval_requests
  for each row execute function public.tg_guard_approval();

create or replace function public.tg_guard_maintenance_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Maintenance jobs are archived, never deleted' using errcode='check_violation';
  end if;
  if tg_op = 'UPDATE' and old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled maintenance job is final' using errcode='check_violation';
  end if;
  if new.status = 'cancelled' and coalesce(btrim(new.cancellation_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_guard_mj before insert or update or delete on public.maintenance_jobs
  for each row execute function public.tg_guard_maintenance_job();

-- attribution dimension for commitments
create trigger trg_commitment_dimension after insert or update on public.commitments
  for each row execute function public.tg_sync_dimension_value('commitment');

-- ---------- attribution helper ----------------------------------------
create or replace function public.commitment_attribution(_commitment_id uuid)
returns table (property_id uuid, unit_id uuid, project_id uuid)
language sql stable security definer set search_path = public as $$
  select
    (max(case when dv.entity_table = 'properties' then dv.entity_id::text end))::uuid,
    (max(case when dv.entity_table = 'property_units' then dv.entity_id::text end))::uuid,
    (max(case when dv.entity_table = 'capex_projects' then dv.entity_id::text end))::uuid
  from public.transaction_dimensions td
  join public.dimension_values dv on dv.id = td.dimension_value_id
  where td.source_type = 'commitment' and td.source_id = _commitment_id;
$$;

-- ---------- cash-flow synchronisation ---------------------------------
create or replace function public.sync_commitment_cash_flow(_commitment_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  c public.commitments%rowtype;
  attr record;
  n int := 0;
  eligible boolean;
begin
  select * into c from public.commitments where id = _commitment_id;
  if c.id is null then raise exception 'Commitment not found'; end if;

  select * into attr from public.commitment_attribution(_commitment_id);
  eligible := (c.status = 'active' and c.approval_status = 'approved' and c.deleted_at is null);

  perform set_config('pedra.cf_sync', 'on', true);

  -- remove projections that are no longer eligible and still untouched
  delete from public.cash_flow_entries e
   using public.commitment_schedule_lines l
   where e.source_type = 'commitment_schedule_line'
     and e.source_id = l.id
     and l.commitment_id = _commitment_id
     and e.state = 'committed'
     and e.reconciliation_state <> 'reconciled'
     and (not eligible
          or l.status in ('superseded','cancelled')
          or not exists (select 1 from public.commitment_schedule_versions v
                          where v.id = l.version_id and v.is_current and v.status = 'active'));

  if eligible then
    insert into public.cash_flow_entries (
      company_id, property_id, unit_id, project_id, entry_date, expected_date, direction, state,
      category, description, currency, amount_total, amount_net,
      source_type, source_id, is_manual, is_included, confidence,
      counterparty_name, reconciliation_state)
    select c.company_id, attr.property_id, attr.unit_id, attr.project_id,
           l.expected_date, l.expected_date, 'outflow', 'committed',
           case c.commitment_type
             when 'capex_contract' then 'projects'
             when 'tax_instalment' then 'taxes'
             when 'maintenance' then 'maintenance'
             else 'operating' end,
           c.title || coalesce(' — ' || l.description, '') || ' (#' || l.line_no || ')',
           c.currency, l.amount, l.amount,
           'commitment_schedule_line', l.id, false, true, 'high',
           (select cp.name from public.counterparties cp where cp.id = c.counterparty_id),
           'unmatched'
      from public.commitment_schedule_lines l
      join public.commitment_schedule_versions v on v.id = l.version_id
     where l.commitment_id = _commitment_id
       and v.is_current and v.status = 'active'
       and l.status = 'scheduled'
    on conflict (source_type, source_id, occurrence_key) do update set
      expected_date = excluded.expected_date,
      entry_date = excluded.entry_date,
      amount_total = excluded.amount_total,
      amount_net = excluded.amount_net,
      project_id = excluded.project_id,
      property_id = excluded.property_id,
      unit_id = excluded.unit_id,
      description = excluded.description,
      is_included = true,
      updated_at = now();
    get diagnostics n = row_count;
  end if;

  perform set_config('pedra.cf_sync', 'off', true);
  return n;
end $$;

-- ---------- lifecycle functions ---------------------------------------
create or replace function public.create_commitment_draft(
  _company_id uuid, _title text, _commitment_type text default 'other',
  _authorised_amount numeric default 0, _counterparty_id uuid default null,
  _currency text default 'EUR', _description text default null,
  _start_date date default null, _end_date date default null,
  _source_type text default null, _source_id uuid default null,
  _code text default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create commitments' using errcode='42501';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  insert into public.commitments (company_id, counterparty_id, commitment_type, code, title,
    description, currency, authorised_amount, start_date, end_date, source_type, source_id, notes)
  values (_company_id, _counterparty_id, coalesce(_commitment_type,'other'), _code, _title,
    _description, coalesce(_currency,'EUR'), coalesce(_authorised_amount,0), _start_date, _end_date,
    _source_type, _source_id, _notes)
  returning id into v_id;
  perform set_config('pedra.commitment_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_commitment_draft(
  _commitment_id uuid, _title text default null, _commitment_type text default null,
  _authorised_amount numeric default null, _counterparty_id uuid default null,
  _description text default null, _start_date date default null, _end_date date default null,
  _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  select * into c from public.commitments where id = _commitment_id;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to edit this commitment' using errcode='42501';
  end if;
  if c.status <> 'draft' then
    raise exception 'Only draft commitments can be edited' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  update public.commitments set
    title = coalesce(_title, title),
    commitment_type = coalesce(_commitment_type, commitment_type),
    authorised_amount = coalesce(_authorised_amount, authorised_amount),
    counterparty_id = coalesce(_counterparty_id, counterparty_id),
    description = coalesce(_description, description),
    start_date = coalesce(_start_date, start_date),
    end_date = coalesce(_end_date, end_date),
    notes = coalesce(_notes, notes),
    updated_by = auth.uid()
  where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
end $$;

create or replace function public.request_commitment_approval(_commitment_id uuid, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; v_req uuid;
begin
  select * into c from public.commitments where id = _commitment_id;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to request approval' using errcode='42501';
  end if;
  if c.status <> 'draft' then
    raise exception 'Only a draft commitment can be sent for approval' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  insert into public.approval_requests (company_id, target_type, target_id, reason, requested_amount)
  values (c.company_id, 'commitment', c.id, _reason, c.authorised_amount)
  returning id into v_req;
  insert into public.approval_events (company_id, request_id, event, comment)
  values (c.company_id, v_req, 'requested', _reason);
  update public.commitments set status = 'pending_approval', approval_status = 'pending',
    updated_by = auth.uid() where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
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
   where target_type = 'commitment' and target_id = _commitment_id and decision = 'pending'
   for update;
  if r.id is null then
    raise exception 'No pending approval request for this commitment' using errcode='check_violation';
  end if;
  if r.requested_by = auth.uid() and coalesce(btrim(_override_reason),'') = '' then
    raise exception 'You cannot approve your own request' using errcode='42501';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  update public.approval_requests set decision = 'approved', decided_by = auth.uid(),
    decided_at = now(), decision_reason = coalesce(_override_reason, _comment) where id = r.id;
  insert into public.approval_events (company_id, request_id, event, comment)
  values (c.company_id, r.id, case when _override_reason is null then 'approved' else 'overridden' end,
          coalesce(_override_reason, _comment));
  update public.commitments set status = 'approved', approval_status = 'approved',
    approved_by = auth.uid(), approved_at = now(),
    approval_override_reason = _override_reason, updated_by = auth.uid()
  where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
end $$;

create or replace function public.reject_commitment(_commitment_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype; r public.approval_requests%rowtype;
begin
  if coalesce(btrim(_reason),'') = '' then
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
  perform set_config('pedra.commitment_fn','on',true);
  update public.approval_requests set decision = 'rejected', decided_by = auth.uid(),
    decided_at = now(), decision_reason = _reason where id = r.id;
  insert into public.approval_events (company_id, request_id, event, comment)
  values (c.company_id, r.id, 'rejected', _reason);
  update public.commitments set status = 'draft', approval_status = 'rejected', updated_by = auth.uid()
  where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
end $$;

create or replace function public.activate_commitment(_commitment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to activate commitments' using errcode='42501';
  end if;
  if c.status <> 'approved' or c.approval_status <> 'approved' then
    raise exception 'Only an approved commitment can be activated' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  update public.commitments set status = 'active', updated_by = auth.uid() where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
  perform public.sync_commitment_cash_flow(_commitment_id);
end $$;

create or replace function public.complete_commitment(_commitment_id uuid, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to complete commitments' using errcode='42501';
  end if;
  if c.status <> 'active' then
    raise exception 'Only an active commitment can be completed' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  update public.commitments set status = 'completed', completion_notes = _notes, updated_by = auth.uid()
  where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
  perform public.sync_commitment_cash_flow(_commitment_id);
end $$;

create or replace function public.cancel_commitment(_commitment_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.commitments%rowtype;
begin
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_manage_company(c.company_id) then
    raise exception 'You do not have permission to cancel commitments' using errcode='42501';
  end if;
  if c.status in ('completed','cancelled') then
    raise exception 'A % commitment is final', c.status using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  update public.commitments set status = 'cancelled', cancellation_reason = _reason,
    archived_at = now(), updated_by = auth.uid() where id = _commitment_id;
  perform set_config('pedra.commitment_fn','off',true);
  perform public.sync_commitment_cash_flow(_commitment_id);
end $$;

-- ---------- schedule versioning ---------------------------------------
create or replace function public.validate_commitment_schedule(_version_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'version_id', v.id,
    'authorised_amount', c.authorised_amount,
    'scheduled_total', coalesce(sum(l.amount) filter (where l.status <> 'superseded'), 0),
    'variance', coalesce(sum(l.amount) filter (where l.status <> 'superseded'), 0) - c.authorised_amount,
    'variance_approved', v.variance_approved,
    'balanced', abs(coalesce(sum(l.amount) filter (where l.status <> 'superseded'), 0) - c.authorised_amount) < 0.01)
  from public.commitment_schedule_versions v
  join public.commitments c on c.id = v.commitment_id
  left join public.commitment_schedule_lines l on l.version_id = v.id
  where v.id = _version_id
  group by v.id, c.authorised_amount, v.variance_approved;
$$;

create or replace function public.create_commitment_schedule_version(
  _commitment_id uuid, _effective_from date, _lines jsonb,
  _schedule_type text default 'custom', _reason text default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c public.commitments%rowtype;
  v_id uuid; v_no int; v_total numeric; v_clash int; v_prev numeric;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to create schedules' using errcode='42501';
  end if;
  if c.status in ('completed','cancelled') then
    raise exception 'A % commitment cannot receive new schedules', c.status using errcode='check_violation';
  end if;
  if _lines is null or jsonb_array_length(_lines) = 0 then
    raise exception 'A schedule version needs at least one line' using errcode='check_violation';
  end if;

  select count(*) into v_clash
    from public.commitment_schedule_lines l
   where l.commitment_id = _commitment_id
     and l.status in ('invoiced','paid','reconciled')
     and l.expected_date >= _effective_from;
  if v_clash > 0 then
    raise exception 'Revision overlaps % invoiced, paid or reconciled line(s); move the effective date forward', v_clash
      using errcode='check_violation';
  end if;

  select coalesce(sum((x->>'amount')::numeric), 0) into v_total from jsonb_array_elements(_lines) x;
  select coalesce(sum(l.amount), 0) into v_prev
    from public.commitment_schedule_lines l
   where l.commitment_id = _commitment_id
     and l.status in ('invoiced','paid','reconciled')
     and l.expected_date < _effective_from;

  select coalesce(max(version_no), 0) + 1 into v_no
    from public.commitment_schedule_versions where commitment_id = _commitment_id;

  perform set_config('pedra.commitment_fn','on',true);
  insert into public.commitment_schedule_versions (
    company_id, commitment_id, version_no, schedule_type, effective_from, reason,
    status, total_amount, variance_amount, requires_approval, notes)
  values (c.company_id, _commitment_id, v_no, coalesce(_schedule_type,'custom'), _effective_from,
    coalesce(_reason, case when v_no = 1 then 'initial' else 'revision' end),
    'draft', v_total + v_prev, round(v_total + v_prev - c.authorised_amount, 2),
    (v_no > 1 and abs(v_total + v_prev - c.authorised_amount) >= 0.01), _notes)
  returning id into v_id;

  insert into public.commitment_schedule_lines (
    company_id, commitment_id, version_id, line_no, expected_date, amount, line_type,
    is_retention, is_contingency, description, source_type, source_id)
  select c.company_id, _commitment_id, v_id,
         coalesce((x->>'line_no')::int, (row_number() over ())::int),
         (x->>'expected_date')::date,
         (x->>'amount')::numeric,
         coalesce(x->>'line_type','instalment'),
         coalesce((x->>'is_retention')::boolean, coalesce(x->>'line_type','') = 'retention'),
         coalesce((x->>'is_contingency')::boolean, coalesce(x->>'line_type','') = 'contingency'),
         x->>'description', x->>'source_type', (x->>'source_id')::uuid
    from jsonb_array_elements(_lines) x;
  perform set_config('pedra.commitment_fn','off',true);
  return v_id;
end $$;

create or replace function public.activate_commitment_schedule_version(_version_id uuid, _reason text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v public.commitment_schedule_versions%rowtype;
  c public.commitments%rowtype;
  v_check jsonb;
begin
  select * into v from public.commitment_schedule_versions where id = _version_id for update;
  if v.id is null then raise exception 'Schedule version not found'; end if;
  select * into c from public.commitments where id = v.commitment_id for update;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to activate schedules' using errcode='42501';
  end if;
  if v.status = 'active' and v.is_current then
    perform public.sync_commitment_cash_flow(c.id);
    return 0;  -- idempotent
  end if;
  if v.status in ('superseded','cancelled') then
    raise exception 'A % schedule version cannot be activated', v.status using errcode='check_violation';
  end if;

  v_check := public.validate_commitment_schedule(_version_id);
  if not (v_check->>'balanced')::boolean and not v.variance_approved then
    raise exception 'Schedule total % does not match the authorised amount % and no variance is approved',
      v_check->>'scheduled_total', v_check->>'authorised_amount' using errcode='check_violation';
  end if;
  if v.requires_approval and not v.variance_approved then
    raise exception 'This schedule replacement requires an approved variance' using errcode='check_violation';
  end if;

  perform set_config('pedra.commitment_fn','on',true);

  update public.commitment_schedule_lines l
     set status = 'superseded', superseded_at = now(), superseded_by_version_id = _version_id
   where l.commitment_id = c.id
     and l.version_id <> _version_id
     and l.status = 'scheduled'
     and l.expected_date >= v.effective_from;

  update public.commitment_schedule_versions
     set is_current = false,
         status = case when status = 'active' then 'superseded' else status end,
         superseded_at = case when status = 'active' then now() else superseded_at end,
         superseded_by_version_id = case when status = 'active' then _version_id else superseded_by_version_id end
   where commitment_id = c.id and id <> _version_id and is_current;

  update public.commitment_schedule_versions
     set status = 'active', is_current = true, activated_at = now(), activated_by = auth.uid(),
         reason = coalesce(_reason, reason)
   where id = _version_id;

  update public.commitments
     set committed_amount = (select coalesce(sum(l.amount), 0)
                               from public.commitment_schedule_lines l
                              where l.commitment_id = c.id and l.status <> 'superseded'
                                and l.status <> 'cancelled'),
         updated_by = auth.uid()
   where id = c.id;
  perform set_config('pedra.commitment_fn','off',true);

  return public.sync_commitment_cash_flow(c.id);
end $$;

create or replace function public.approve_commitment_variance(_version_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v public.commitment_schedule_versions%rowtype; v_req uuid;
begin
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A variance reason is required' using errcode='check_violation';
  end if;
  select * into v from public.commitment_schedule_versions where id = _version_id for update;
  if v.id is null then raise exception 'Schedule version not found'; end if;
  if not public.can_approve_company(v.company_id) then
    raise exception 'You do not have approval authority' using errcode='42501';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  insert into public.approval_requests (company_id, target_type, target_id, reason,
    requested_amount, decision, decided_by, decided_at, decision_reason)
  values (v.company_id, 'commitment_variance', v.id, _reason, v.variance_amount,
    'approved', auth.uid(), now(), _reason)
  returning id into v_req;
  insert into public.approval_events (company_id, request_id, event, comment)
  values (v.company_id, v_req, 'approved', _reason);
  update public.commitment_schedule_versions
     set variance_approved = true, variance_reason = _reason, approval_request_id = v_req
   where id = _version_id;
  perform set_config('pedra.commitment_fn','off',true);
end $$;

-- ---------- drawdowns ---------------------------------------------------
create or replace function public.create_commitment_drawdown(
  _commitment_id uuid, _document_id uuid, _amount numeric,
  _schedule_line_id uuid default null, _drawdown_date date default null,
  _kind text default 'allocation', _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c public.commitments%rowtype; d record; v_id uuid;
  v_allocated numeric; v_doc_allocated numeric; v_capacity numeric; v_variance_ok boolean;
begin
  select * into c from public.commitments where id = _commitment_id for update;
  if c.id is null then raise exception 'Commitment not found'; end if;
  if not public.can_record_company(c.company_id) then
    raise exception 'You do not have permission to record drawdowns' using errcode='42501';
  end if;
  if c.status not in ('active','completed') then
    raise exception 'Only an active commitment can be drawn down' using errcode='check_violation';
  end if;
  select id, company_id, payable_amount, gross_amount into d
    from public.financial_documents where id = _document_id;
  if d.id is null then raise exception 'Financial document not found'; end if;
  if d.company_id <> c.company_id then
    raise exception 'The document belongs to another company' using errcode='42501';
  end if;
  if _amount <= 0 then raise exception 'A drawdown amount must be positive' using errcode='check_violation'; end if;

  select coalesce(sum(amount), 0) into v_allocated
    from public.commitment_drawdowns
   where commitment_id = _commitment_id and status = 'active';
  select coalesce(sum(amount), 0) into v_doc_allocated
    from public.commitment_drawdowns
   where document_id = _document_id and status = 'active';

  if v_doc_allocated + _amount > coalesce(d.gross_amount, 0) + 0.01 then
    raise exception 'Allocations would exceed the document total' using errcode='check_violation';
  end if;

  v_capacity := greatest(c.authorised_amount, c.committed_amount);
  select exists (select 1 from public.approval_requests r
                  where r.target_type in ('commitment_variance','commitment_change')
                    and r.decision = 'approved'
                    and (r.target_id = _commitment_id
                         or r.target_id in (select id from public.commitment_schedule_versions
                                             where commitment_id = _commitment_id)))
    into v_variance_ok;

  if v_allocated + _amount > v_capacity + 0.01 and not v_variance_ok then
    raise exception 'Drawdown would over-commit this commitment (capacity %); record an approved variance first', v_capacity
      using errcode='check_violation';
  end if;

  perform set_config('pedra.commitment_fn','on',true);
  insert into public.commitment_drawdowns (company_id, commitment_id, document_id, schedule_line_id,
    amount, drawdown_date, kind, notes)
  values (c.company_id, _commitment_id, _document_id, _schedule_line_id, _amount,
    coalesce(_drawdown_date, current_date), coalesce(_kind,'allocation'), _notes)
  returning id into v_id;

  if _schedule_line_id is not null then
    update public.commitment_schedule_lines set status = 'invoiced'
     where id = _schedule_line_id and status = 'scheduled';
  end if;
  perform set_config('pedra.commitment_fn','off',true);
  return v_id;
end $$;

create or replace function public.reverse_commitment_drawdown(_drawdown_id uuid, _reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare dd public.commitment_drawdowns%rowtype; v_id uuid;
begin
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A reversal reason is required' using errcode='check_violation';
  end if;
  select * into dd from public.commitment_drawdowns where id = _drawdown_id for update;
  if dd.id is null then raise exception 'Drawdown not found'; end if;
  if not public.can_record_company(dd.company_id) then
    raise exception 'You do not have permission to reverse drawdowns' using errcode='42501';
  end if;
  if dd.status = 'reversed' then
    raise exception 'This drawdown is already reversed' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  insert into public.commitment_drawdowns (company_id, commitment_id, document_id, schedule_line_id,
    amount, drawdown_date, kind, status, reverses_drawdown_id, reversal_reason, notes)
  values (dd.company_id, dd.commitment_id, dd.document_id, dd.schedule_line_id,
    -dd.amount, current_date, 'reversal', 'active', dd.id, _reason, dd.notes)
  returning id into v_id;
  update public.commitment_drawdowns
     set status = 'reversed', reversal_reason = _reason, reversed_at = now(), reversed_by = auth.uid()
   where id = _drawdown_id;
  perform set_config('pedra.commitment_fn','off',true);
  return v_id;
end $$;

-- ---------- maintenance jobs -------------------------------------------
create or replace function public.create_maintenance_job(
  _company_id uuid, _title text, _description text default null,
  _priority text default 'medium', _target_date date default null,
  _counterparty_id uuid default null, _commitment_id uuid default null,
  _responsible_name text default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create maintenance jobs' using errcode='42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = _company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode='42501';
  end if;
  insert into public.maintenance_jobs (company_id, title, description, priority, target_date,
    counterparty_id, commitment_id, responsible_name, notes)
  values (_company_id, _title, _description, coalesce(_priority,'medium'), _target_date,
    _counterparty_id, _commitment_id, _responsible_name, _notes)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.update_maintenance_job(
  _job_id uuid, _title text default null, _description text default null,
  _status text default null, _priority text default null, _target_date date default null,
  _completion_date date default null, _counterparty_id uuid default null,
  _commitment_id uuid default null, _responsible_name text default null,
  _notes text default null, _cancellation_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare j public.maintenance_jobs%rowtype;
begin
  select * into j from public.maintenance_jobs where id = _job_id;
  if j.id is null then raise exception 'Maintenance job not found'; end if;
  if not public.can_record_company(j.company_id) then
    raise exception 'You do not have permission to edit maintenance jobs' using errcode='42501';
  end if;
  if _commitment_id is not null and not exists (
      select 1 from public.commitments where id = _commitment_id and company_id = j.company_id) then
    raise exception 'The linked commitment belongs to another company' using errcode='42501';
  end if;
  update public.maintenance_jobs set
    title = coalesce(_title, title),
    description = coalesce(_description, description),
    status = coalesce(_status, status),
    priority = coalesce(_priority, priority),
    target_date = coalesce(_target_date, target_date),
    completion_date = coalesce(_completion_date, completion_date),
    counterparty_id = coalesce(_counterparty_id, counterparty_id),
    commitment_id = coalesce(_commitment_id, commitment_id),
    responsible_name = coalesce(_responsible_name, responsible_name),
    notes = coalesce(_notes, notes),
    cancellation_reason = coalesce(_cancellation_reason, cancellation_reason),
    updated_by = auth.uid()
  where id = _job_id;
end $$;

-- ---------- derived views ----------------------------------------------
create or replace view public.v_commitment_summary
with (security_invoker = true) as
select
  c.id as commitment_id,
  c.company_id,
  c.code,
  c.title,
  c.commitment_type,
  c.status,
  c.approval_status,
  c.currency,
  c.start_date,
  c.end_date,
  c.counterparty_id,
  cp.name as counterparty_name,
  c.authorised_amount,
  coalesce(sch.scheduled_amount, 0) as scheduled_amount,
  case when c.approval_status = 'approved' and c.status in ('active','completed')
       then coalesce(sch.scheduled_amount, 0) else 0 end as approved_committed_amount,
  coalesce(sch.overdue_amount, 0) as overdue_scheduled_amount,
  coalesce(sch.retained_amount, 0) as retained_amount,
  coalesce(dd.invoiced_amount, 0) as invoiced_amount,
  coalesce(pay.paid_amount, 0) as paid_amount,
  c.authorised_amount - coalesce(dd.invoiced_amount, 0) as remaining_commitment,
  greatest(c.authorised_amount - coalesce(dd.invoiced_amount, 0), 0) as available_drawdown,
  coalesce(var.approved_variance, 0) as approved_variance,
  case when coalesce(sch.scheduled_amount, 0) - c.authorised_amount - coalesce(var.approved_variance, 0) > 0.005
       then coalesce(sch.scheduled_amount, 0) - c.authorised_amount - coalesce(var.approved_variance, 0)
       else 0 end as unapproved_variance,
  attr.property_id,
  attr.unit_id,
  attr.project_id,
  c.archived_at,
  c.deleted_at,
  c.created_at,
  c.updated_at
from public.commitments c
left join public.counterparties cp on cp.id = c.counterparty_id
left join lateral (
  select sum(l.amount) filter (where l.status not in ('superseded','cancelled')) as scheduled_amount,
         sum(l.amount) filter (where l.status = 'scheduled' and l.expected_date < current_date) as overdue_amount,
         sum(l.amount) filter (where l.is_retention and l.status not in ('superseded','cancelled')) as retained_amount
    from public.commitment_schedule_lines l where l.commitment_id = c.id) sch on true
left join lateral (
  select sum(x.amount) as invoiced_amount from public.commitment_drawdowns x
   where x.commitment_id = c.id and x.status = 'active') dd on true
left join lateral (
  select sum(
    case when coalesce(fd.gross_amount, 0) = 0 then 0
         else x.amount * (coalesce(fd.paid_amount, 0) / fd.gross_amount) end) as paid_amount
    from public.commitment_drawdowns x
    join public.financial_documents fd on fd.id = x.document_id
   where x.commitment_id = c.id and x.status = 'active') pay on true
left join lateral (
  select sum(v.variance_amount) filter (where v.variance_approved and v.is_current) as approved_variance
    from public.commitment_schedule_versions v where v.commitment_id = c.id) var on true
left join lateral (select * from public.commitment_attribution(c.id)) attr on true;

grant select on public.v_commitment_summary to authenticated;

create or replace view public.v_maintenance_job_summary
with (security_invoker = true) as
select j.id as job_id, j.company_id, j.title, j.status, j.priority,
       j.requested_date, j.target_date, j.completion_date, j.responsible_name,
       j.counterparty_id, cp.name as counterparty_name, j.commitment_id,
       s.title as commitment_title, s.status as commitment_status,
       coalesce(s.approved_committed_amount, 0) as committed_amount,
       coalesce(s.invoiced_amount, 0) as invoiced_amount,
       coalesce(s.paid_amount, 0) as paid_amount,
       j.archived_at, j.deleted_at, j.created_at, j.updated_at
  from public.maintenance_jobs j
  left join public.counterparties cp on cp.id = j.counterparty_id
  left join public.v_commitment_summary s on s.commitment_id = j.commitment_id;

grant select on public.v_maintenance_job_summary to authenticated;

-- capex summary recast onto commitments + bookkeeping
drop view if exists public.v_capex_summary;
create view public.v_capex_summary as
select
  p.company_id,
  p.id as project_id,
  p.code,
  p.name,
  p.status,
  p.project_type,
  p.property_id,
  pr.code as property_code,
  pr.name as property_name,
  p.currency,
  p.start_date,
  p.target_end_date,
  p.actual_end_date,
  coalesce(p.budget_amount, 0) as budget_amount,
  coalesce(costs.actual_amount, 0) as actual_amount,
  coalesce(cf.committed_amount, 0) as committed_amount,
  coalesce(cf.forecast_amount, 0) as forecast_amount,
  coalesce(com.approved_commitments, 0) as approved_commitments,
  coalesce(com.active_commitments, 0) as active_commitments,
  coalesce(com.invoiced_amount, 0) as invoiced_amount,
  coalesce(com.paid_amount, 0) as paid_amount,
  coalesce(p.budget_amount, 0) - coalesce(costs.actual_amount, 0) - coalesce(cf.committed_amount, 0)
    as remaining_budget,
  coalesce(com.active_commitments, 0) - coalesce(p.budget_amount, 0) as commitment_variance,
  coalesce(com.invoiced_amount, 0) - coalesce(com.active_commitments, 0) as invoice_variance,
  case when coalesce(p.budget_amount, 0) > 0
       then round((coalesce(costs.actual_amount, 0) + coalesce(cf.committed_amount, 0))
                  / p.budget_amount * 100, 1) end as spend_pct
from public.capex_projects p
left join public.properties pr on pr.id = p.property_id
left join lateral (
  select sum(c.amount) as actual_amount from public.capex_project_costs c
   where c.project_id = p.id and c.deleted_at is null) costs on true
left join lateral (
  select sum(case when e.state = 'committed' then e.amount_total else 0 end) as committed_amount,
         sum(case when e.state = 'forecast' then e.amount_total else 0 end) as forecast_amount
    from public.cash_flow_entries e
   where e.project_id = p.id and e.deleted_at is null and e.direction = 'outflow') cf on true
left join lateral (
  select sum(s.authorised_amount) filter (where s.approval_status = 'approved') as approved_commitments,
         sum(s.approved_committed_amount) as active_commitments,
         sum(s.invoiced_amount) as invoiced_amount,
         sum(s.paid_amount) as paid_amount
    from public.v_commitment_summary s
   where s.project_id = p.id and s.deleted_at is null) com on true
where p.deleted_at is null;

grant select on public.v_capex_summary to authenticated;

create or replace function public.commitment_summary(_commitment_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(s) from public.v_commitment_summary s where s.commitment_id = _commitment_id;
$$;