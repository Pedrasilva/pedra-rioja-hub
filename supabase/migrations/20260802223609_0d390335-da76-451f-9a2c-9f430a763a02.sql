ALTER TABLE public.financial_documents
  ADD COLUMN review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'ignored')),
  ADD COLUMN counterparty_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN classification_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN direction_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN classification_confidence_pct numeric(5,2),
  ADD COLUMN review_rejected_reason text;

CREATE INDEX IF NOT EXISTS financial_documents_review_status_idx
  ON public.financial_documents (company_id, review_status);

COMMENT ON COLUMN public.financial_documents.review_status IS
  'Where this document sits in the human review queue: pending, approved, rejected, or ignored. Independent of status (draft/posted/cancelled).';
COMMENT ON COLUMN public.financial_documents.counterparty_confirmed IS
  'True once a human has confirmed (not just AI-matched) the counterparty on this document.';
COMMENT ON COLUMN public.financial_documents.classification_confirmed IS
  'True once a human has confirmed (not just AI-suggested) the classification on this document.';
COMMENT ON COLUMN public.financial_documents.direction_confirmed IS
  'True if direction (inbound/outbound) was derived with certainty from matching tax numbers, false if it was a fallback default requiring human confirmation.';