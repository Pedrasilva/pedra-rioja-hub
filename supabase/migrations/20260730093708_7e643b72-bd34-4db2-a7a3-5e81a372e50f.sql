DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'can_override_approval','approval_step_approvers','approval_step_applies',
        'ensure_default_approval_workflow','approval_run_callback','retry_approval_callback',
        'approval_finalise','approval_activate_stage','approval_advance',
        'submit_approval_request','record_approval_decision','withdraw_approval_request',
        'run_approval_maintenance','create_approval_workflow','create_approval_workflow_version',
        'upsert_approval_workflow_step','delete_approval_workflow_step',
        'set_approval_step_assignment','publish_approval_workflow_version',
        'archive_approval_workflow','tg_approval_append_only','tg_guard_approval',
        'tg_guard_workflow_version','tg_guard_workflow_child',
        'approval_cb_commitment_granted','approval_cb_commitment_rejected',
        'approval_cb_commitment_released','approval_cb_commitment_variance_granted')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.can_override_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approval_step_applies(numeric,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approval_step_approvers(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_approval_request(uuid,text,uuid,text,numeric,jsonb,text,uuid,jsonb,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_approval_decision(uuid,text,text,text,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_approval_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_approval_callback(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_approval_maintenance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_approval_workflow(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_approval_workflow_version(uuid,uuid,text,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_approval_workflow_step(uuid,integer,text,text,integer,numeric,numeric,boolean,boolean,integer,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_approval_workflow_step(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_approval_step_assignment(uuid,text,uuid,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_approval_workflow_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_approval_workflow(uuid,text) TO authenticated;

REVOKE ALL ON FUNCTION public.request_commitment_approval(uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.approve_commitment(uuid,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.reject_commitment(uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.approve_commitment_variance(uuid,text) FROM anon;