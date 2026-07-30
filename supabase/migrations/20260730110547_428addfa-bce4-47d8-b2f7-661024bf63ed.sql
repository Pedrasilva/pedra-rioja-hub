-- =====================================================================
-- Phase 8D (2) — Preventive maintenance + derived investment metrics.
--   Schedules create JOBS ONLY. Money still enters exclusively through
--   quotation → commitment → approval → cash flow (§5D).
-- =====================================================================

create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  title text not null,
  description text,
  schedule_kind text not null default 'preventive'
    check (schedule_kind in ('preventive','inspection')),
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.property_units(id) on delete set null,
  asset_label text,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  responsible_user_id uuid,
  responsible_name text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  frequency text not null default 'annual'
    check (frequency in ('monthly','quarterly','semiannual','annual','custom_days')),
  interval_days integer check (interval_days > 0),
  start_date date not null default current_date,
  end_date date,
  lead_time_days integer not null default 14 check (lead_time_days >= 0),
  is_active boolean not null default true,
  last_generated_at timestamptz,
  last_generated_through date,
  notes text,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  constraint ms_custom_needs_interval
    check (frequency <> 'custom_days' or interval_days is not null)
);
grant select, insert, update on public.maintenance_schedules to authenticated;
grant all on public.maintenance_schedules to service_role;
alter table public.maintenance_schedules enable row level security;
create policy ms_select on public.maintenance_schedules for select to authenticated
  using (public.can_view_company(company_id));
create policy ms_insert on public.maintenance_schedules for insert to authenticated
  with check (public.can_record_company(company_id));
create policy ms_update on public.maintenance_schedules for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));
create index idx_ms_company on public.maintenance_schedules (company_id, is_active) where archived_at is null;
create index idx_ms_property on public.maintenance_schedules (property_id);

create trigger trg_ms_touch before update on public.maintenance_schedules
  for each row execute function public.tg_touch_row();
create trigger trg_ms_audit after insert or update or delete on public.maintenance_schedules
  for each row execute function public.tg_audit_row();
create trigger trg_ms_no_delete before delete on public.maintenance_schedules
  for each row execute function public.tg_guard_budget_row();

-- ---------------- jobs gain a preventive origin ----------------------
alter table public.maintenance_jobs
  add column if not exists schedule_id uuid references public.maintenance_schedules(id) on delete set null,
  add column if not exists job_kind text not null default 'reactive',
  add column if not exists planned_date date,
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists unit_id uuid references public.property_units(id) on delete set null,
  add column if not exists occurrence_key text;

alter table public.maintenance_jobs
  add constraint mj_job_kind_check check (job_kind in ('reactive','preventive','inspection'));

create unique index uq_mj_schedule_occurrence
  on public.maintenance_jobs (schedule_id, occurrence_key)
  where schedule_id is not null and occurrence_key is not null;
create index idx_mj_schedule on public.maintenance_jobs (schedule_id);
create index idx_mj_property on public.maintenance_jobs (property_id);

-- ---------------- inspection evidence --------------------------------
create table public.maintenance_inspection_evidence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.maintenance_jobs(id) on delete cascade,
  outcome text not null default 'observation'
    check (outcome in ('pass','fail','observation','action_required')),
  finding text not null,
  document_id uuid references public.documents(id) on delete set null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid default auth.uid(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
grant select, insert, update on public.maintenance_inspection_evidence to authenticated;
grant all on public.maintenance_inspection_evidence to service_role;
alter table public.maintenance_inspection_evidence enable row level security;
create policy mie_select on public.maintenance_inspection_evidence for select to authenticated
  using (public.can_view_company(company_id));
create policy mie_insert on public.maintenance_inspection_evidence for insert to authenticated
  with check (public.can_record_company(company_id));
create policy mie_update on public.maintenance_inspection_evidence for update to authenticated
  using (public.can_record_company(company_id)) with check (public.can_record_company(company_id));
create index idx_mie_job on public.maintenance_inspection_evidence (job_id, recorded_at desc);

create trigger trg_mie_touch before update on public.maintenance_inspection_evidence
  for each row execute function public.tg_touch_row();
create trigger trg_mie_audit after insert or update or delete on public.maintenance_inspection_evidence
  for each row execute function public.tg_audit_row();
create trigger trg_mie_no_delete before delete on public.maintenance_inspection_evidence
  for each row execute function public.tg_guard_budget_row();

-- ---------------- schedule RPCs --------------------------------------
create or replace function public.upsert_maintenance_schedule(
  _company_id uuid, _title text, _schedule_id uuid default null,
  _schedule_kind text default 'preventive', _description text default null,
  _property_id uuid default null, _unit_id uuid default null,
  _asset_label text default null, _counterparty_id uuid default null,
  _responsible_name text default null, _priority text default 'medium',
  _frequency text default 'annual', _interval_days integer default null,
  _start_date date default null, _end_date date default null,
  _lead_time_days integer default 14, _is_active boolean default true,
  _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to manage maintenance schedules' using errcode='42501';
  end if;
  if _schedule_id is null then
    insert into public.maintenance_schedules (
      company_id, title, schedule_kind, description, property_id, unit_id, asset_label,
      counterparty_id, responsible_name, priority, frequency, interval_days,
      start_date, end_date, lead_time_days, is_active, notes)
    values (_company_id, _title, coalesce(_schedule_kind,'preventive'), _description,
      _property_id, _unit_id, _asset_label, _counterparty_id, _responsible_name,
      coalesce(_priority,'medium'), coalesce(_frequency,'annual'), _interval_days,
      coalesce(_start_date, current_date), _end_date, coalesce(_lead_time_days,14),
      coalesce(_is_active,true), _notes)
    returning id into v_id;
  else
    update public.maintenance_schedules set
      title = coalesce(_title, title),
      schedule_kind = coalesce(_schedule_kind, schedule_kind),
      description = _description,
      property_id = _property_id,
      unit_id = _unit_id,
      asset_label = _asset_label,
      counterparty_id = _counterparty_id,
      responsible_name = _responsible_name,
      priority = coalesce(_priority, priority),
      frequency = coalesce(_frequency, frequency),
      interval_days = _interval_days,
      start_date = coalesce(_start_date, start_date),
      end_date = _end_date,
      lead_time_days = coalesce(_lead_time_days, lead_time_days),
      is_active = coalesce(_is_active, is_active),
      notes = coalesce(_notes, notes),
      updated_by = auth.uid()
    where id = _schedule_id and company_id = _company_id and archived_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'Maintenance schedule not found' using errcode='check_violation';
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.archive_maintenance_schedule(_schedule_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.maintenance_schedules%rowtype;
begin
  select * into s from public.maintenance_schedules where id = _schedule_id;
  if s.id is null then raise exception 'Maintenance schedule not found'; end if;
  if not public.can_manage_company(s.company_id) then
    raise exception 'You do not have permission to archive schedules' using errcode='42501';
  end if;
  update public.maintenance_schedules
     set archived_at = now(), archive_reason = _reason, is_active = false, updated_by = auth.uid()
   where id = _schedule_id;
end $$;

-- Idempotent, company scoped, retry safe: planned occurrences are keyed by
-- (schedule, occurrence date). Re-running never duplicates a job.
create or replace function public.generate_maintenance_jobs(
  _company_id uuid, _horizon_months integer default 12)
returns integer language plpgsql security definer set search_path = public as $$
declare s public.maintenance_schedules%rowtype;
        horizon date; occ date; step interval; made integer := 0; guard integer;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to generate maintenance jobs' using errcode='42501';
  end if;
  horizon := (current_date + make_interval(months => greatest(coalesce(_horizon_months,12), 1)))::date;

  for s in select * from public.maintenance_schedules
            where company_id = _company_id and is_active and archived_at is null loop
    step := case s.frequency
              when 'monthly' then interval '1 month'
              when 'quarterly' then interval '3 months'
              when 'semiannual' then interval '6 months'
              when 'annual' then interval '1 year'
              else make_interval(days => coalesce(s.interval_days, 30)) end;
    occ := s.start_date;
    guard := 0;
    while occ <= horizon and (s.end_date is null or occ <= s.end_date) loop
      guard := guard + 1;
      if guard > 600 then exit; end if;
      if occ >= current_date - interval '1 day' then
        insert into public.maintenance_jobs (
          company_id, title, description, status, priority, requested_date,
          target_date, planned_date, responsible_user_id, responsible_name,
          counterparty_id, schedule_id, job_kind, property_id, unit_id,
          occurrence_key, notes)
        values (
          s.company_id,
          s.title || ' — ' || to_char(occ, 'YYYY-MM-DD'),
          s.description, 'scheduled', s.priority,
          greatest(current_date, (occ - make_interval(days => s.lead_time_days))::date),
          occ, occ, s.responsible_user_id, s.responsible_name, s.counterparty_id,
          s.id,
          case when s.schedule_kind = 'inspection' then 'inspection' else 'preventive' end,
          s.property_id, s.unit_id, to_char(occ, 'YYYY-MM-DD'), s.notes)
        on conflict (schedule_id, occurrence_key) where schedule_id is not null and occurrence_key is not null
        do nothing;
        if found then made := made + 1; end if;
      end if;
      occ := (occ + step)::date;
    end loop;

    update public.maintenance_schedules
       set last_generated_at = now(), last_generated_through = horizon, updated_by = auth.uid()
     where id = s.id;
  end loop;
  return made;
end $$;

create or replace function public.record_inspection_evidence(
  _job_id uuid, _finding text, _outcome text default 'observation',
  _document_id uuid default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare j public.maintenance_jobs%rowtype; v_id uuid;
begin
  select * into j from public.maintenance_jobs where id = _job_id;
  if j.id is null then raise exception 'Maintenance job not found'; end if;
  if not public.can_record_company(j.company_id) then
    raise exception 'You do not have permission to record inspection evidence' using errcode='42501';
  end if;
  insert into public.maintenance_inspection_evidence (
    company_id, job_id, outcome, finding, document_id, notes)
  values (j.company_id, _job_id, coalesce(_outcome,'observation'), _finding, _document_id, _notes)
  returning id into v_id;
  return v_id;
end $$;

create or replace view public.v_maintenance_schedule_summary
with (security_invoker = true) as
select
  s.id as schedule_id, s.company_id, s.code, s.title, s.schedule_kind,
  s.property_id, p.name as property_name, s.unit_id, s.asset_label,
  s.counterparty_id, cp.name as counterparty_name, s.responsible_name,
  s.priority, s.frequency, s.interval_days, s.start_date, s.end_date,
  s.lead_time_days, s.is_active, s.last_generated_at, s.last_generated_through,
  s.notes, s.archived_at, s.created_at, s.updated_at,
  coalesce(j.job_count, 0) as job_count,
  coalesce(j.open_count, 0) as open_count,
  j.next_planned_date, j.last_completed_date
from public.maintenance_schedules s
left join public.properties p on p.id = s.property_id
left join public.counterparties cp on cp.id = s.counterparty_id
left join lateral (
  select count(*) as job_count,
         count(*) filter (where status in ('requested','scheduled','in_progress')) as open_count,
         min(planned_date) filter (where status in ('requested','scheduled','in_progress')) as next_planned_date,
         max(completion_date) as last_completed_date
    from public.maintenance_jobs mj
   where mj.schedule_id = s.id and mj.deleted_at is null) j on true;
grant select on public.v_maintenance_schedule_summary to authenticated;

-- =====================================================================
-- Derived investment metrics (nothing stored).
-- =====================================================================
create or replace view public.v_investment_metrics
with (security_invoker = true) as
select
  a.id as agreement_id,
  a.company_id,
  a.property_id,
  p.name as property_name,
  a.lender, a.type, a.status, a.currency,
  a.principal as original_principal,
  coalesce(o.outstanding, a.principal) as outstanding_principal,
  cv.current_valuation,
  at.acquisition_total,
  ds.annual_debt_service,
  ds.debt_service_paid_12m,
  noi.net_operating_income_12m,
  case when coalesce(ds.annual_debt_service, 0) = 0 then null
       else round(coalesce(noi.net_operating_income_12m, 0) / ds.annual_debt_service, 3) end as dscr,
  case when coalesce(cv.current_valuation, at.acquisition_total, 0) = 0 then null
       else round((coalesce(o.outstanding, a.principal)
                   / coalesce(cv.current_valuation, at.acquisition_total)) * 100, 2) end as ltv_pct,
  case when coalesce(at.acquisition_total, 0) - coalesce(a.principal, 0) <= 0 then null
       else round(((coalesce(noi.net_operating_income_12m, 0)
                    - coalesce(ds.debt_service_paid_12m, 0))
                   / (at.acquisition_total - a.principal)) * 100, 2) end as cash_on_cash_pct
from public.financing_agreements a
left join public.properties p on p.id = a.property_id
left join public.v_property_current_valuation cv on cv.property_id = a.property_id
left join public.v_property_acquisition_totals at on at.property_id = a.property_id
left join lateral (
  select fr.closing_balance as outstanding
    from public.financing_schedule_versions v
    join public.financing_schedule_rows fr on fr.version_id = v.id
   where v.agreement_id = a.id and v.is_current and fr.due_date <= current_date
   order by fr.due_date desc, fr.period_no desc limit 1) o on true
left join lateral (
  select
    sum(fr.total_payment) filter (
      where fr.due_date > current_date and fr.due_date <= (current_date + interval '12 months')::date
    ) as annual_debt_service,
    sum(fr.total_payment) filter (
      where fr.due_date <= current_date and fr.due_date > (current_date - interval '12 months')::date
    ) as debt_service_paid_12m
    from public.financing_schedule_versions v
    join public.financing_schedule_rows fr on fr.version_id = v.id
   where v.agreement_id = a.id and v.is_current) ds on true
left join lateral (
  select sum(case when e.direction = 'in' then coalesce(e.amount_total, 0)
                  else -coalesce(e.amount_total, 0) end) as net_operating_income_12m
    from public.cash_flow_entries e
   where e.company_id = a.company_id
     and e.deleted_at is null
     and e.state in ('actual','reconciled')
     and (a.property_id is null or e.property_id = a.property_id)
     and coalesce(e.actual_date, e.entry_date) > (current_date - interval '12 months')::date
     and coalesce(e.source_type, '') not in ('financing_schedule_row','financing')) noi on true
where a.deleted_at is null;
grant select on public.v_investment_metrics to authenticated;

-- ---------------- performance indexes --------------------------------
create index if not exists idx_cfe_company_date
  on public.cash_flow_entries (company_id, entry_date) where deleted_at is null;
create index if not exists idx_cfe_property_state
  on public.cash_flow_entries (property_id, state) where deleted_at is null;
create index if not exists idx_td_source
  on public.transaction_dimensions (source_type, source_id);
create index if not exists idx_td_dimension_value
  on public.transaction_dimensions (dimension_value_id);
create index if not exists idx_documents_company_category
  on public.documents (company_id, category) where deleted_at is null;
create index if not exists idx_document_links_entity
  on public.document_links (entity_type, entity_id);
create index if not exists idx_fsr_version_due
  on public.financing_schedule_rows (version_id, due_date);
create index if not exists idx_drive_folders_sync
  on public.drive_folders (company_id, sync_status);

-- ---------------- grants ---------------------------------------------
revoke all on function public.upsert_maintenance_schedule(uuid,text,uuid,text,text,uuid,uuid,text,uuid,text,text,text,integer,date,date,integer,boolean,text) from public;
revoke all on function public.archive_maintenance_schedule(uuid,text) from public;
revoke all on function public.generate_maintenance_jobs(uuid,integer) from public;
revoke all on function public.record_inspection_evidence(uuid,text,text,uuid,text) from public;

grant execute on function public.upsert_maintenance_schedule(uuid,text,uuid,text,text,uuid,uuid,text,uuid,text,text,text,integer,date,date,integer,boolean,text) to authenticated;
grant execute on function public.archive_maintenance_schedule(uuid,text) to authenticated;
grant execute on function public.generate_maintenance_jobs(uuid,integer) to authenticated;
grant execute on function public.record_inspection_evidence(uuid,text,text,uuid,text) to authenticated;
