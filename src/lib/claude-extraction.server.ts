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
    "expiry_date": "YYYY-MM-DD or null",
    "amount": number or null,
    "currency": "3-letter code or null",
    "counterparty_name": "string or null",
    "counterparty_nif": "the counterparty's tax number (NIF/VAT/EIN, whatever's printed) or null"
  },
  "details": { ... kind-specific fields, see below ... },
  "raw_text": "a faithful plain-text transcription of the document's key content (not necessarily every word, but every figure, date, name and clause that matters)"
}

Kind-specific "details" shapes:
- bank_statement: { "account_holder": string|null, "account_number_last4": string|null, "period_start": date|null, "period_end": date|null, "opening_balance": number|null, "closing_balance": number|null, "transactions": [ { "date": date, "description": string, "amount": number, "balance_after": number|null } ] }
- lease_schedule: { "tenant_name": string|null, "landlord_name": string|null, "property_reference": string|null, "rent_amount": number|null, "frequency": string|null, "start_date": date|null, "end_date": date|null, "installments": [ { "due_date": date, "amount": number, "description": string|null } ] }
- deed: { "property_address": string|null, "seller": string|null, "buyer": string|null, "sale_price": number|null, "registration_number": string|null, "signing_date": date|null, "notary": string|null }
- loan_agreement: { "lender": string|null, "borrower": string|null, "principal": number|null, "annual_rate_pct": number|null, "term_months": number|null, "start_date": date|null, "repayment_type": string|null, "monthly_payment": number|null, "collateral_property": string|null }
- invoice: { "vendor": string|null, "vendor_nif": string|null, "buyer_name": string|null, "buyer_nif": string|null, "invoice_number": string|null, "invoice_date": date|null, "due_date": date|null, "total_amount": number|null, "vat_amount": number|null, "line_items": [ { "description": string, "amount": number } ] }
- other: { "notes": string }

For invoices, read BOTH the issuing party's and the billed party's tax numbers whenever the document shows both — this is what lets the app work out automatically whether the document is money going out or money coming in, so don't skip one just because the other is more prominent on the page.

If a field is unreadable or absent, use null — never invent a value. If the document is low quality (blurry scan, cut-off page), say so in "summary" and set "confidence" to "low".`;

export type ClaudeExtractionResult = {
  document_kind:
    "bank_statement" | "lease_schedule" | "deed" | "loan_agreement" | "invoice" | "other";
  summary: string;
  confidence: "high" | "medium" | "low";
  core_fields: {
    title: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    amount: number | null;
    currency: string | null;
    counterparty_name: string | null;
    counterparty_nif: string | null;
  };

  details: Record<string, Json>;
  raw_text: string;
};

function stripJsonFences(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function extractDocumentFields(opts: {
  contentBase64: string;
  mimeType: string;
  fileName: string;
}): Promise<ClaudeExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Document extraction is not configured. Set ANTHROPIC_API_KEY.");
  }
  if (!isExtractableMimeType(opts.mimeType)) {
    throw new Error(
      `Cannot extract from ${opts.mimeType || "this file type"}. Supported: PDF, PNG, JPEG, WEBP.`,
    );
  }

  const contentBlock =
    opts.mimeType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: opts.mimeType, data: opts.contentBase64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: opts.mimeType, data: opts.contentBase64 },
        };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: `File name: ${opts.fileName}\n\nExtract this document now.` },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude extraction request failed [${res.status}]: ${body}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");

  const cleaned = stripJsonFences(text);
  let parsed: ClaudeExtractionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    let fallback: ClaudeExtractionResult | null = null;
    if (first !== -1 && last > first) {
      try {
        fallback = JSON.parse(cleaned.slice(first, last + 1)) as ClaudeExtractionResult;
      } catch {
        fallback = null;
      }
    }
    if (!fallback) {
      throw new Error(
        "Claude did not return valid JSON for this document. Try re-running extraction.",
      );
    }
    parsed = fallback;
  }

  return parsed;
}
