/**
 * Claude-powered document extraction (server-only).
 *
 * Takes a document already sitting in Drive (bank statement, lease/payment
 * schedule, deed, promissory note / loan agreement, invoice, etc.), sends it
 * to Claude, and gets back a structured, typed summary. This never writes
 * financial data directly into ledgers or schedules — it lands in
 * `document_extractions` for a human to review and apply, per the same
 * "review before it becomes truth" rule the schedule-import flow already
 * follows.
 */

import type { Json } from "@/integrations/supabase/types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function isExtractableMimeType(mimeType: string) {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

const EXTRACTION_SYSTEM_PROMPT = `You are a document-extraction engine for a real-estate portfolio management app.
You will be shown one document (a bank statement, lease/mortgage payment schedule, property deed, promissory note or loan agreement, invoice, or something else).

Read it carefully and respond with ONLY a single JSON object — no prose, no markdown fences, nothing before or after it. Match this shape exactly:

{
  "document_kind": "bank_statement" | "lease_schedule" | "deed" | "loan_agreement" | "invoice" | "other",
  "summary": "one or two plain sentences describing what this document is and its key figures",
  "confidence": "high" | "medium" | "low",
  "core_fields": {
    "title": "a short human-readable title for this document",
    "issue_date": "YYYY-MM-DD or null",
