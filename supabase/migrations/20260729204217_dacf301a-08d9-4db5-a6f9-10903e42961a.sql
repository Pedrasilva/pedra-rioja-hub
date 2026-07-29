create or replace function public.tg_sync_commitment_line_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _doc uuid := coalesce(new.document_id, old.document_id);
  _paid boolean;
  _reconciled boolean;
begin
  if _doc is null then return coalesce(new, old); end if;

  select coalesce(d.paid_amount, 0) >= coalesce(d.gross_amount, 0) - 0.01
         and coalesce(d.gross_amount, 0) > 0
    into _paid
    from public.financial_documents d where d.id = _doc;

  select exists (select 1 from public.financial_payments p
                  where p.document_id = _doc
                    and p.status = 'active'
                    and p.bank_transaction_id is not null)
    into _reconciled;

  if not coalesce(_paid, false) then return coalesce(new, old); end if;

  perform set_config('pedra.commitment_fn','on',true);
  update public.commitment_schedule_lines l
     set status = case when _reconciled then 'reconciled' else 'paid' end
   where l.status in ('scheduled','invoiced','paid')
     and l.id in (select dd.schedule_line_id
                    from public.commitment_drawdowns dd
                   where dd.document_id = _doc
                     and dd.status = 'active'
                     and dd.schedule_line_id is not null);
  perform set_config('pedra.commitment_fn','off',true);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_commitment_line_settlement on public.financial_payments;
create trigger trg_commitment_line_settlement
after insert or update on public.financial_payments
for each row execute function public.tg_sync_commitment_line_settlement();

revoke all on function public.tg_sync_commitment_line_settlement() from anon, public;