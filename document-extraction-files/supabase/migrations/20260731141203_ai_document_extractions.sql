-- ==================================================== document_extractions
-- Structured output of the Claude extraction pipeline for a single document.
-- One row per attempt; a document can be re-extracted (e.g. after a bad scan
-- is replaced), so history is kept rather than overwritten.
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'applied')),
  -- What Claude decided the document is: bank_statement, lease_schedule,
  -- deed, loan_agreement, invoice, other. Drives which fields the review UI
  -- shows, but is never trusted blindly for anything financial.
  document_kind text,
  -- Full structured payload as returned by the model (kind-specific fields
  -- nested under `details`), before any human edits.
  extracted_json jsonb,
  -- Short human-readable summary shown in the document list.
  summary text,
  -- Plain-text transcription of the document, mirrored into
  -- documents.ocr_text once applied.
  raw_text text,
  model text NOT NULL DEFAULT 'claude-sonnet-4-6',
  error_message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX document_extractions_document_idx ON public.document_extractions (document_id, created_at DESC);
CREATE INDEX document_extractions_company_idx ON public.document_extractions (company_id, status);

GRANT SELECT, INSERT, UPDATE ON public.document_extractions TO authenticated;
GRANT ALL ON public.document_extractions TO service_role;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_extractions_select ON public.document_extractions FOR SELECT TO authenticated
  USING (public.can_view_company(company_id));
CREATE POLICY document_extractions_manage ON public.document_extractions FOR ALL TO authenticated
  USING (public.can_manage_company(company_id)) WITH CHECK (public.can_manage_company(company_id));
