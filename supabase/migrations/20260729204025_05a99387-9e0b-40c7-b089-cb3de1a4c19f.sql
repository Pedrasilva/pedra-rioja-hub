create or replace function public.tg_guard_commitment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  -- a rejected request returns the commitment to draft so it can be revised
  if rank_new < rank_old
     and new.status <> 'cancelled'
     and not (old.status = 'pending_approval' and new.status = 'draft'
              and new.approval_status = 'rejected') then
    raise exception 'Commitment lifecycle cannot go backwards' using errcode='check_violation';
  end if;
  if new.status = 'cancelled' and coalesce(btrim(new.cancellation_reason),'') = '' then
    raise exception 'A cancellation reason is required' using errcode='check_violation';
  end if;
  return new;
end $$;

-- validate against the whole commitment schedule, frozen history included
create or replace function public.validate_commitment_schedule(_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version_id', v.id,
    'authorised_amount', c.authorised_amount,
    'scheduled_total', v.total_amount,
    'variance', v.total_amount - c.authorised_amount,
    'variance_approved', v.variance_approved,
    'balanced', abs(v.total_amount - c.authorised_amount) < 0.01)
  from public.commitment_schedule_versions v
  join public.commitments c on c.id = v.commitment_id
  where v.id = _version_id;
$$;

-- a reversal cancels the original allocation: neither row counts as consumption
create or replace function public.reverse_commitment_drawdown(_drawdown_id uuid, _reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
  if dd.kind = 'reversal' then
    raise exception 'A reversal cannot itself be reversed' using errcode='check_violation';
  end if;
  perform set_config('pedra.commitment_fn','on',true);
  insert into public.commitment_drawdowns (company_id, commitment_id, document_id, schedule_line_id,
    amount, drawdown_date, kind, status, reverses_drawdown_id, reversal_reason, reversed_at, notes)
  values (dd.company_id, dd.commitment_id, dd.document_id, dd.schedule_line_id,
    -dd.amount, current_date, 'reversal', 'reversed', dd.id, _reason, now(), dd.notes)
  returning id into v_id;
  update public.commitment_drawdowns
     set status = 'reversed', reversal_reason = _reason, reversed_at = now(), reversed_by = auth.uid()
   where id = _drawdown_id;
  perform set_config('pedra.commitment_fn','off',true);
  return v_id;
end $$;

revoke all on function public.tg_guard_commitment() from anon, public;
revoke all on function public.validate_commitment_schedule(uuid) from anon, public;
revoke all on function public.reverse_commitment_drawdown(uuid, text) from anon, public;
grant execute on function public.validate_commitment_schedule(uuid) to authenticated, service_role;
grant execute on function public.reverse_commitment_drawdown(uuid, text) to authenticated, service_role;