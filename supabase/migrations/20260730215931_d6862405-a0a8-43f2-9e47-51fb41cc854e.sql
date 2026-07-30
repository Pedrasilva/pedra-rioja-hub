-- ============================================================
-- Phase 8F.1 — Financial execution core (payment runs)
--   Payment runs orchestrate execution only. They own no accounting
--   amount, post no journal, create no bank transaction and write no
--   cash-flow entry. §5C and §5D remain untouched.
-- ============================================================

-- ---------- 1. payment_runs -------------------------------------------
create table public.payment_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference text not null,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','exported','executed','completed','cancelled')),
  approval_status text not null default 'not_requested'
    check (approval_status in ('not_requested','pending','approved','rejected')),
  approval_request_id uuid,
  scheduled_execution_date date,
  actual_execution_date date,
  approved_by uuid,
  approved_at timestamptz,
  exported_by uuid,
  exported_at timestamptz,
  executed_by uuid,
  executed_at timestamptz,
  completed_by uuid,
  completed_at timestamptz,
  completion_notes text,
  cancelled_by uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_payment_runs_reference on public.payment_runs(company_id, lower(reference));
create index idx_payment_runs_company on public.payment_runs(company_id, status);
create index idx_payment_runs_scheduled on public.payment_runs(company_id, scheduled_execution_date);

grant select on public.payment_runs to authenticated;
grant all on public.payment_runs to service_role;
alter table public.payment_runs enable row level security;
create policy "payment_runs_select" on public.payment_runs for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 2. payment_batches ----------------------------------------
create table public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_run_id uuid not null references public.payment_runs(id) on delete cascade,
  counterparty_id uuid references public.counterparties(id) on delete restrict,
  currency char(3) not null default 'EUR',
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  execution_order integer not null default 1,
  export_status text not null default 'pending'
    check (export_status in ('pending','generated','exported')),
  exported_at timestamptz,
  export_format text,
  export_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_payment_batch_group
  on public.payment_batches(payment_run_id, coalesce(counterparty_id, '00000000-0000-0000-0000-000000000000'::uuid), currency);
create index idx_payment_batches_run on public.payment_batches(payment_run_id, execution_order);

grant select on public.payment_batches to authenticated;
grant all on public.payment_batches to service_role;
alter table public.payment_batches enable row level security;
create policy "payment_batches_select" on public.payment_batches for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 3. payment_instructions -----------------------------------
create table public.payment_instructions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_run_id uuid not null references public.payment_runs(id) on delete cascade,
  batch_id uuid not null references public.payment_batches(id) on delete cascade,
  document_id uuid not null references public.financial_documents(id) on delete restrict,
  counterparty_id uuid references public.counterparties(id) on delete restrict,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  payment_method text not null default 'transfer'
    check (payment_method in ('transfer','direct_debit','cheque','card','cash','other')),
  payment_reference text,
  status text not null default 'pending'
    check (status in ('pending','ready','exported','executed','failed','cancelled')),
  failure_reason text,
  executed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create unique index uq_payment_instruction_document
  on public.payment_instructions(payment_run_id, document_id);
create index idx_payment_instructions_run on public.payment_instructions(payment_run_id, status);
create index idx_payment_instructions_batch on public.payment_instructions(batch_id);
create index idx_payment_instructions_document on public.payment_instructions(document_id);

grant select on public.payment_instructions to authenticated;
grant all on public.payment_instructions to service_role;
alter table public.payment_instructions enable row level security;
create policy "payment_instructions_select" on public.payment_instructions for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 4. payment_run_exports ------------------------------------
create table public.payment_run_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payment_run_id uuid not null references public.payment_runs(id) on delete cascade,
  batch_id uuid references public.payment_batches(id) on delete cascade,
  format text not null check (format in ('sepa_xml','csv','api')),
  provider text,
  file_name text,
  content_hash text,
  instruction_count integer not null default 0,
  document_id uuid references public.documents(id) on delete set null,
  notes text,
  generated_by uuid default auth.uid(),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);
create index idx_payment_run_exports_run on public.payment_run_exports(payment_run_id, generated_at desc);

grant select on public.payment_run_exports to authenticated;
grant all on public.payment_run_exports to service_role;
alter table public.payment_run_exports enable row level security;
create policy "payment_run_exports_select" on public.payment_run_exports for select to authenticated
  using (public.can_view_company(company_id));

-- ---------- 5. audit + updated_at --------------------------------------
create trigger trg_payment_runs_touch before update on public.payment_runs
  for each row execute function public.set_updated_at();
create trigger trg_payment_batches_touch before update on public.payment_batches
  for each row execute function public.set_updated_at();
create trigger trg_payment_instructions_touch before update on public.payment_instructions
  for each row execute function public.set_updated_at();
create trigger trg_payment_run_exports_touch before update on public.payment_run_exports
  for each row execute function public.set_updated_at();

create trigger trg_payment_runs_audit after insert or update or delete on public.payment_runs
  for each row execute function public.tg_audit_row();
create trigger trg_payment_batches_audit after insert or update or delete on public.payment_batches
  for each row execute function public.tg_audit_row();
create trigger trg_payment_instructions_audit after insert or update or delete on public.payment_instructions
  for each row execute function public.tg_audit_row();
create trigger trg_payment_run_exports_audit after insert or update or delete on public.payment_run_exports
  for each row execute function public.tg_audit_row();

-- ---------- 6. guards ---------------------------------------------------
create or replace function public.tg_guard_payment_record()
returns trigger language plpgsql security definer set search_path = public as $$
declare internal boolean := coalesce(current_setting('pedra.payment_fn', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    raise exception 'Payment records are cancelled or archived, never deleted' using errcode='check_violation';
  end if;
  if not internal then
    raise exception 'Payment records are maintained by payment run functions' using errcode='check_violation';
  end if;
  return new;
end $$;

create trigger trg_guard_payment_batches before insert or update or delete on public.payment_batches
  for each row execute function public.tg_guard_payment_record();
create trigger trg_guard_payment_instructions before insert or update or delete on public.payment_instructions
  for each row execute function public.tg_guard_payment_record();
create trigger trg_guard_payment_run_exports before insert or update or delete on public.payment_run_exports
  for each row execute function public.tg_guard_payment_record();

create or replace function public.tg_guard_payment_run()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  internal boolean := coalesce(current_setting('pedra.payment_fn', true), '') = 'on';
  rank_old int; rank_new int;
begin
  if tg_op = 'DELETE' then
    raise exception 'Payment runs are cancelled or archived, never deleted' using errcode='check_violation';
  end if;
  if not internal then
    raise exception 'Payment runs are maintained by payment run functions' using errcode='check_violation';
  end if;
  if tg_op = 'INSERT' then return new; end if;

  rank_old := case old.status when 'draft' then 1 when 'pending_approval' then 2 when 'approved' then 3
                              when 'exported' then 4 when 'executed' then 5 when 'completed' then 6 else 7 end;
  rank_new := case new.status when 'draft' then 1 when 'pending_approval' then 2 when 'approved' then 3
                              when 'exported' then 4 when 'executed' then 5 when 'completed' then 6 else 7 end;

  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled payment run is final' using errcode='check_violation';
  end if;
  if old.status in ('executed','completed') then
    if new.status = 'cancelled' then
      raise exception 'An executed payment run can no longer be cancelled' using errcode='check_violation';
    end if;
    if new.title is distinct from old.title
       or new.reference is distinct from old.reference
       or new.description is distinct from old.description
       or new.scheduled_execution_date is distinct from old.scheduled_execution_date
       or new.actual_execution_date is distinct from old.actual_execution_date then
      raise exception 'An executed payment run is immutable' using errcode='check_violation';
    end if;
  end if;
  if rank_new < rank_old and new.status not in ('cancelled','draft') then
    raise exception 'Payment run lifecycle cannot go backwards' using errcode='check_violation';
  end if;
  if new.status = 'cancelled' and coalesce(btrim(new.cancellation_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  return new;
end $$;
create trigger trg_guard_payment_run before insert or update or delete on public.payment_runs
  for each row execute function public.tg_guard_payment_run();

-- ---------- 7. derived views -------------------------------------------
create or replace view public.v_payment_instruction_detail
with (security_invoker = true) as
select
  i.id                 as instruction_id,
  i.company_id,
  i.payment_run_id,
  i.batch_id,
  i.document_id,
  i.counterparty_id,
  i.bank_account_id,
  i.payment_method,
  i.payment_reference,
  i.status,
  i.failure_reason,
  i.executed_at,
  i.notes,
  d.document_number,
  d.series,
  d.doc_type,
  d.issue_date,
  d.due_date,
  d.currency,
  d.status               as document_status,
  d.payment_state,
  d.payable_amount,
  d.paid_amount,
  d.outstanding_amount,
  cp.name                as counterparty_name,
  ba.name                as bank_account_name
from public.payment_instructions i
join public.financial_documents d on d.id = i.document_id
left join public.counterparties cp on cp.id = i.counterparty_id
left join public.bank_accounts ba on ba.id = i.bank_account_id;

grant select on public.v_payment_instruction_detail to authenticated;

create or replace view public.v_payment_batch_summary
with (security_invoker = true) as
select
  b.id               as batch_id,
  b.company_id,
  b.payment_run_id,
  b.counterparty_id,
  cp.name            as counterparty_name,
  b.currency,
  b.bank_account_id,
  b.execution_order,
  b.export_status,
  b.exported_at,
  b.export_format,
  b.export_reference,
  count(i.id)                                          as instruction_count,
  coalesce(sum(d.outstanding_amount), 0)::numeric(14,2) as outstanding_total,
  coalesce(sum(d.payable_amount), 0)::numeric(14,2)     as payable_total
from public.payment_batches b
left join public.payment_instructions i
       on i.batch_id = b.id and i.status <> 'cancelled'
left join public.financial_documents d on d.id = i.document_id
left join public.counterparties cp on cp.id = b.counterparty_id
group by b.id, cp.name;

grant select on public.v_payment_batch_summary to authenticated;

create or replace view public.v_payment_run_summary
with (security_invoker = true) as
select
  r.id                as payment_run_id,
  r.company_id,
  r.reference,
  r.title,
  r.description,
  r.status,
  r.approval_status,
  r.approval_request_id,
  r.scheduled_execution_date,
  r.actual_execution_date,
  r.archived_at,
  r.cancellation_reason,
  r.completion_notes,
  r.created_at,
  r.created_by,
  r.approved_by,
  r.exported_at,
  r.executed_at,
  r.completed_at,
  count(distinct b.id)                                  as batch_count,
  count(i.id)                                           as instruction_count,
  count(i.id) filter (where i.status = 'executed')      as executed_count,
  count(i.id) filter (where i.status = 'failed')        as failed_count,
  coalesce(sum(d.outstanding_amount), 0)::numeric(14,2) as outstanding_total,
  coalesce(sum(d.payable_amount), 0)::numeric(14,2)     as payable_total
from public.payment_runs r
left join public.payment_batches b on b.payment_run_id = r.id
left join public.payment_instructions i
       on i.payment_run_id = r.id and i.status <> 'cancelled'
left join public.financial_documents d on d.id = i.document_id
group by r.id;

grant select on public.v_payment_run_summary to authenticated;

-- ---------- 8. approval integration -------------------------------------
insert into public.approval_target_types (target_type, label, description)
values ('payment_run','Payment run','A settlement session submitted for authority to pay')
on conflict (target_type) do nothing;

create or replace function public.approval_cb_payment_run_granted(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare d record;
begin
  select actor_id into d from public.approval_decisions
   where request_id = _request_id and decision in ('approve','override_approve')
   order by created_at desc limit 1;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set status = 'approved', approval_status = 'approved',
         approval_request_id = _request_id,
         approved_by = d.actor_id, approved_at = now()
   where id = _target_id and status = 'pending_approval';
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.approval_cb_payment_run_rejected(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set status = 'draft', approval_status = 'rejected', approval_request_id = _request_id
   where id = _target_id and status = 'pending_approval';
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.approval_cb_payment_run_released(_target_id uuid, _request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set status = 'draft', approval_status = 'not_requested', approval_request_id = _request_id
   where id = _target_id and status = 'pending_approval';
  perform set_config('pedra.payment_fn','off',true);
end $$;

insert into public.approval_callbacks (target_type, event, function_name) values
  ('payment_run','granted','public.approval_cb_payment_run_granted'),
  ('payment_run','rejected','public.approval_cb_payment_run_rejected'),
  ('payment_run','returned','public.approval_cb_payment_run_released'),
  ('payment_run','withdrawn','public.approval_cb_payment_run_released'),
  ('payment_run','expired','public.approval_cb_payment_run_released')
on conflict do nothing;

-- ---------- 9. lifecycle functions ---------------------------------------
create or replace function public.create_payment_run(
  _company_id uuid, _title text, _description text default null,
  _scheduled_execution_date date default null, _reference text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text;
begin
  if not public.can_record_company(_company_id) then
    raise exception 'You do not have permission to create a payment run' using errcode='42501';
  end if;
  if coalesce(btrim(_title),'') = '' then
    raise exception 'A payment run needs a title' using errcode='check_violation';
  end if;
  v_ref := coalesce(nullif(btrim(_reference), ''),
                    'PR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6));
  perform set_config('pedra.payment_fn','on',true);
  insert into public.payment_runs (company_id, reference, title, description, scheduled_execution_date)
  values (_company_id, v_ref, btrim(_title), _description, _scheduled_execution_date)
  returning id into v_id;
  perform set_config('pedra.payment_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_payment_run(
  _run_id uuid, _title text default null, _description text default null,
  _scheduled_execution_date date default null, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to edit this payment run' using errcode='42501';
  end if;
  if r.status <> 'draft' then
    raise exception 'Only a draft payment run can be edited' using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set title = coalesce(nullif(btrim(_title),''), title),
         description = coalesce(_description, description),
         scheduled_execution_date = coalesce(_scheduled_execution_date, scheduled_execution_date),
         notes = coalesce(_notes, notes),
         updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.add_payment_instruction(
  _run_id uuid, _document_id uuid, _payment_method text default 'transfer',
  _payment_reference text default null, _bank_account_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype; d public.financial_documents%rowtype;
        v_batch uuid; v_id uuid; v_order int;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to change this payment run' using errcode='42501';
  end if;
  if r.status <> 'draft' then
    raise exception 'Documents can only be added to a draft payment run' using errcode='check_violation';
  end if;

  select * into d from public.financial_documents where id = _document_id;
  if d.id is null or d.company_id <> r.company_id then
    raise exception 'Unknown document' using errcode='check_violation';
  end if;
  if d.direction <> 'inbound' then
    raise exception 'Only payable supplier documents can be paid through a payment run'
      using errcode='check_violation';
  end if;
  if d.status <> 'posted' then
    raise exception 'Only a posted document can be included in a payment run' using errcode='check_violation';
  end if;
  if coalesce(d.outstanding_amount, 0) <= 0 then
    raise exception 'That document has nothing outstanding' using errcode='check_violation';
  end if;
  if exists (
      select 1 from public.payment_instructions pi
       join public.payment_runs pr on pr.id = pi.payment_run_id
      where pi.document_id = _document_id
        and pi.status <> 'cancelled'
        and pr.status not in ('cancelled')
        and pr.id <> _run_id) then
    raise exception 'That document is already in another payment run' using errcode='check_violation';
  end if;

  perform set_config('pedra.payment_fn','on',true);
  select id into v_batch from public.payment_batches
   where payment_run_id = _run_id
     and coalesce(counterparty_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = coalesce(d.counterparty_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and currency = d.currency;
  if v_batch is null then
    select coalesce(max(execution_order), 0) + 1 into v_order
      from public.payment_batches where payment_run_id = _run_id;
    insert into public.payment_batches (
      company_id, payment_run_id, counterparty_id, currency, bank_account_id, execution_order)
    values (r.company_id, _run_id, d.counterparty_id, d.currency,
            coalesce(_bank_account_id, d.bank_account_id), v_order)
    returning id into v_batch;
  end if;

  insert into public.payment_instructions (
    company_id, payment_run_id, batch_id, document_id, counterparty_id,
    bank_account_id, payment_method, payment_reference, status)
  values (r.company_id, _run_id, v_batch, _document_id, d.counterparty_id,
          coalesce(_bank_account_id, d.bank_account_id),
          coalesce(nullif(btrim(_payment_method),''), 'transfer'),
          nullif(btrim(_payment_reference), ''), 'ready')
  returning id into v_id;
  perform set_config('pedra.payment_fn','off',true);
  return v_id;
end $$;

create or replace function public.update_payment_instruction(
  _instruction_id uuid, _payment_method text default null,
  _payment_reference text default null, _bank_account_id uuid default null,
  _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare i public.payment_instructions%rowtype; r public.payment_runs%rowtype;
begin
  select * into i from public.payment_instructions where id = _instruction_id for update;
  if i.id is null then raise exception 'Payment instruction not found'; end if;
  select * into r from public.payment_runs where id = i.payment_run_id;
  if not public.can_record_company(i.company_id) then
    raise exception 'You do not have permission to change this instruction' using errcode='42501';
  end if;
  if r.status not in ('draft','pending_approval','approved') then
    raise exception 'Instructions can no longer be changed on a % run', r.status
      using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_instructions
     set payment_method = coalesce(nullif(btrim(_payment_method),''), payment_method),
         payment_reference = coalesce(nullif(btrim(_payment_reference),''), payment_reference),
         bank_account_id = coalesce(_bank_account_id, bank_account_id),
         notes = coalesce(_notes, notes),
         updated_by = auth.uid()
   where id = _instruction_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.remove_payment_instruction(_instruction_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare i public.payment_instructions%rowtype; r public.payment_runs%rowtype;
begin
  select * into i from public.payment_instructions where id = _instruction_id for update;
  if i.id is null then raise exception 'Payment instruction not found'; end if;
  select * into r from public.payment_runs where id = i.payment_run_id for update;
  if not public.can_record_company(i.company_id) then
    raise exception 'You do not have permission to change this payment run' using errcode='42501';
  end if;
  if r.status <> 'draft' then
    raise exception 'Instructions can only be removed from a draft payment run' using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_instructions
     set status = 'cancelled', updated_by = auth.uid() where id = _instruction_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.request_payment_run_approval(_run_id uuid, _reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype; v_total numeric; v_count int; v_req uuid;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to submit this payment run' using errcode='42501';
  end if;
  if r.status <> 'draft' then
    raise exception 'Only a draft payment run can be submitted for approval' using errcode='check_violation';
  end if;

  select count(*), coalesce(sum(d.outstanding_amount), 0) into v_count, v_total
    from public.payment_instructions i
    join public.financial_documents d on d.id = i.document_id
   where i.payment_run_id = _run_id and i.status <> 'cancelled';
  if v_count = 0 then
    raise exception 'A payment run needs at least one payable document' using errcode='check_violation';
  end if;

  v_req := public.submit_approval_request(
    r.company_id, 'payment_run', r.id, _reason, v_total,
    jsonb_build_object('reference', r.reference, 'title', r.title,
                       'instruction_count', v_count, 'outstanding_total', v_total),
    r.reference || ' — ' || r.title);

  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set status = 'pending_approval', approval_status = 'pending',
         approval_request_id = v_req, updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
  return v_req;
end $$;

create or replace function public.export_payment_run(
  _run_id uuid, _format text, _file_name text default null,
  _content_hash text default null, _provider text default null,
  _batch_id uuid default null, _notes text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype; v_count int; v_id uuid;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_record_company(r.company_id) then
    raise exception 'You do not have permission to export this payment run' using errcode='42501';
  end if;
  if r.status not in ('approved','exported') then
    raise exception 'A payment run must be approved before it can be exported' using errcode='check_violation';
  end if;
  if _format not in ('sepa_xml','csv','api') then
    raise exception 'Unknown export format' using errcode='check_violation';
  end if;

  select count(*) into v_count from public.payment_instructions
   where payment_run_id = _run_id and status not in ('cancelled')
     and (_batch_id is null or batch_id = _batch_id);
  if v_count = 0 then
    raise exception 'There is nothing to export in this payment run' using errcode='check_violation';
  end if;

  perform set_config('pedra.payment_fn','on',true);
  insert into public.payment_run_exports (
    company_id, payment_run_id, batch_id, format, provider, file_name,
    content_hash, instruction_count, notes)
  values (r.company_id, _run_id, _batch_id, _format, _provider, _file_name,
          _content_hash, v_count, _notes)
  returning id into v_id;

  update public.payment_instructions
     set status = 'exported', updated_by = auth.uid()
   where payment_run_id = _run_id and status in ('pending','ready')
     and (_batch_id is null or batch_id = _batch_id);

  update public.payment_batches
     set export_status = 'exported', exported_at = now(),
         export_format = _format, export_reference = coalesce(_file_name, export_reference),
         updated_by = auth.uid()
   where payment_run_id = _run_id and (_batch_id is null or id = _batch_id);

  update public.payment_runs
     set status = 'exported', exported_by = auth.uid(), exported_at = now(), updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
  return v_id;
end $$;

create or replace function public.execute_payment_run(
  _run_id uuid, _execution_date date default current_date)
returns void language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_manage_company(r.company_id) then
    raise exception 'You do not have permission to execute a payment run' using errcode='42501';
  end if;
  if r.status <> 'exported' then
    raise exception 'A payment run must be exported before it can be executed' using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_instructions
     set status = 'executed', executed_at = now(), updated_by = auth.uid()
   where payment_run_id = _run_id and status = 'exported';
  update public.payment_runs
     set status = 'executed', executed_by = auth.uid(), executed_at = now(),
         actual_execution_date = coalesce(_execution_date, current_date), updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.fail_payment_instruction(_instruction_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare i public.payment_instructions%rowtype;
begin
  select * into i from public.payment_instructions where id = _instruction_id for update;
  if i.id is null then raise exception 'Payment instruction not found'; end if;
  if not public.can_manage_company(i.company_id) then
    raise exception 'You do not have permission to change this instruction' using errcode='42501';
  end if;
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A failure reason is required' using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_instructions
     set status = 'failed', failure_reason = _reason, updated_by = auth.uid()
   where id = _instruction_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.complete_payment_run(_run_id uuid, _notes text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_manage_company(r.company_id) then
    raise exception 'You do not have permission to complete a payment run' using errcode='42501';
  end if;
  if r.status <> 'executed' then
    raise exception 'Only an executed payment run can be completed' using errcode='check_violation';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set status = 'completed', completed_by = auth.uid(), completed_at = now(),
         completion_notes = _notes, updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.cancel_payment_run(_run_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_manage_company(r.company_id) then
    raise exception 'You do not have permission to cancel a payment run' using errcode='42501';
  end if;
  if coalesce(btrim(_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  if r.status in ('executed','completed','cancelled') then
    raise exception 'A % payment run can no longer be cancelled', r.status using errcode='check_violation';
  end if;
  if r.status = 'pending_approval' and r.approval_request_id is not null then
    perform public.withdraw_approval_request(r.approval_request_id, _reason);
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_instructions
     set status = 'cancelled', updated_by = auth.uid()
   where payment_run_id = _run_id and status <> 'cancelled';
  update public.payment_runs
     set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(),
         cancellation_reason = _reason, approval_status = 'not_requested', updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;

create or replace function public.archive_payment_run(_run_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.payment_runs%rowtype;
begin
  select * into r from public.payment_runs where id = _run_id for update;
  if r.id is null then raise exception 'Payment run not found'; end if;
  if not public.can_manage_company(r.company_id) then
    raise exception 'You do not have permission to archive a payment run' using errcode='42501';
  end if;
  perform set_config('pedra.payment_fn','on',true);
  update public.payment_runs
     set archived_at = coalesce(archived_at, now()),
         notes = coalesce(_reason, notes), updated_by = auth.uid()
   where id = _run_id;
  perform set_config('pedra.payment_fn','off',true);
end $$;
