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
  (select count(*) from public.payment_batches b where b.payment_run_id = r.id) as batch_count,
  coalesce(i.instruction_count, 0) as instruction_count,
  coalesce(i.executed_count, 0)    as executed_count,
  coalesce(i.failed_count, 0)      as failed_count,
  coalesce(i.outstanding_total, 0)::numeric(14,2) as outstanding_total,
  coalesce(i.payable_total, 0)::numeric(14,2)     as payable_total
from public.payment_runs r
left join lateral (
  select
    count(pi.id)                                      as instruction_count,
    count(pi.id) filter (where pi.status = 'executed') as executed_count,
    count(pi.id) filter (where pi.status = 'failed')   as failed_count,
    sum(d.outstanding_amount)                          as outstanding_total,
    sum(d.payable_amount)                              as payable_total
  from public.payment_instructions pi
  left join public.financial_documents d on d.id = pi.document_id
  where pi.payment_run_id = r.id and pi.status <> 'cancelled'
) i on true;

grant select on public.v_payment_run_summary to authenticated;