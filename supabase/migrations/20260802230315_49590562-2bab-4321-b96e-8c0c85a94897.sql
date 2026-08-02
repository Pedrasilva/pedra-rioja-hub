CREATE TABLE public.gmail_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  gmail_attachment_id text NOT NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, gmail_message_id, gmail_attachment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_sync_state TO authenticated;
GRANT ALL ON public.gmail_sync_state TO service_role;

ALTER TABLE public.gmail_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY gmail_sync_state_select ON public.gmail_sync_state FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY gmail_sync_state_manage ON public.gmail_sync_state FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));

CREATE INDEX gmail_sync_state_entity_idx ON public.gmail_sync_state (company_id, entity_type, entity_id);