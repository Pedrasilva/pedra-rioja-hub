create or replace function public.tg_guard_workflow_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text; v_id uuid;
begin
  if tg_table_name = 'approval_workflow_steps' then
    if tg_op = 'DELETE' then v_id := old.version_id; else v_id := new.version_id; end if;
  else
    if tg_op = 'DELETE' then
      select s.version_id into v_id from public.approval_workflow_steps s where s.id = old.step_id;
    else
      select s.version_id into v_id from public.approval_workflow_steps s where s.id = new.step_id;
    end if;
  end if;
  select status into v_status from public.approval_workflow_versions where id = v_id;
  if v_status is distinct from 'draft' then
    raise exception 'A published workflow version is immutable' using errcode='check_violation';
  end if;
  if coalesce(current_setting('pedra.approval_fn', true), '') <> 'on' then
    raise exception 'Workflow definitions are maintained through approval functions'
      using errcode='check_violation';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
REVOKE ALL ON FUNCTION public.tg_guard_workflow_child() FROM PUBLIC, anon, authenticated;