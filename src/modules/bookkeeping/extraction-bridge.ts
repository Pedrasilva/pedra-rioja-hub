/**
 * Server-side core of the extraction → bookkeeping bridge. Kept out of the
 * *.functions.ts wrapper so that file stays a thin server-function module.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type {
  applyBankStatementSchema,
  applyInvoiceSchema,
} from "@/modules/bookkeeping/extraction-bridge-schemas";

type ExtractionRow = {
  id: string;
  document_id: string;
  document_kind: string;
  extracted_json: Record<string, unknown>;
};

async function loadExtraction(
  supabase: SupabaseClient,
  companyId: string,
  extractionId: string,
  expectedKind: string,
): Promise<ExtractionRow> {
  const { data: extraction, error } = await supabase
    .from("document_extractions")
    .select("id, document_id, document_kind, extracted_json")
    .eq("id", extractionId)
    .eq("company_id", companyId)
    .single();
  if (error || !extraction) throw new Error(error?.message ?? "Extraction not found");
  if (extraction.document_kind !== expectedKind) {
    throw new Error(
      `This extraction is a "${extraction.document_kind}", not a "${expectedKind}" — wrong apply action for this document.`,
    );
  }
  return extraction as ExtractionRow;
}

function normalizeNif(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const digits = v.replace(/\D/g, "");
  return digits.length ? digits : null;
}

/**
 * Turns an "invoice"-kind extraction into a draft financial document.
 * Matches the counterparty by tax number only, derives direction by
 * comparing both parties' tax numbers against the company's own, and
 * attaches the source file as evidence.
 */
export async function applyInvoiceExtractionCore(
  supabase: SupabaseClient,
  data: z.infer<typeof applyInvoiceSchema>,
  userId: string | null,
) {
  const extraction = await loadExtraction(supabase, data.companyId, data.extractionId, "invoice");

  const { data: alreadyApplied } = await supabase
    .from("financial_documents")
    .select("id")
    .eq("company_id", data.companyId)
    .eq("source_type", "external_import")
    .eq("source_id", extraction.id)
    .maybeSingle();
  if (alreadyApplied) {
    throw new Error(
      "This extraction was already applied — find the existing draft in Bookkeeping rather than creating a duplicate.",
    );
  }

  const details = (extraction.extracted_json.details ?? {}) as Record<string, unknown>;
  const core = (extraction.extracted_json.core_fields ?? {}) as Record<string, unknown>;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("tax_number, base_currency")
    .eq("id", data.companyId)
    .single();
  if (companyError || !company) throw new Error(companyError?.message ?? "Company not found");
  const ownNif = normalizeNif(company.tax_number);

  const vendorNif = normalizeNif(details.vendor_nif) ?? normalizeNif(core.counterparty_nif);
  const buyerNif = normalizeNif(details.buyer_nif);

  let direction: "inbound" | "outbound" = "inbound";
  if (ownNif && buyerNif === ownNif) direction = "inbound"; // we're the buyer — a purchase
  else if (ownNif && vendorNif === ownNif) direction = "outbound"; // we're the issuer — a sale
  const directionConfirmed = Boolean(ownNif && (buyerNif === ownNif || vendorNif === ownNif));

  // The counterparty is whichever party isn't us. If that can't be
  // established, fall back to the vendor (the common case for uploads).
  const counterpartyNif = direction === "outbound" ? buyerNif : (vendorNif ?? buyerNif);
  const counterpartyName =
    direction === "outbound"
      ? ((details.buyer_name as string | undefined) ?? null)
      : ((details.vendor as string | undefined) ??
        (core.counterparty_name as string | undefined) ??
        null);

  let counterpartyId: string | null = null;
  let counterpartyMatch: "matched" | "no_match" | "ambiguous" | "no_nif" = "no_nif";
  if (counterpartyNif) {
    const { data: matches, error: matchError } = await supabase
      .from("counterparties")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("nif", counterpartyNif);
    if (matchError) throw new Error(matchError.message);
    const found = (matches ?? []) as Array<{ id: string }>;
    if (found.length === 1) {
      counterpartyId = found[0].id;
      counterpartyMatch = "matched";
    } else if (found.length > 1) {
      counterpartyMatch = "ambiguous";
    } else {
      counterpartyMatch = "no_match";
    }
  }

  const totalAmount = (details.total_amount as number | null) ?? (core.amount as number | null);
  const vatAmount = (details.vat_amount as number | null) ?? null;
  const netAmount =
    totalAmount != null && vatAmount != null
      ? Math.round((totalAmount - vatAmount) * 100) / 100
      : totalAmount;
  const vatRate =
    netAmount && vatAmount != null && netAmount !== 0
      ? Math.round((vatAmount / netAmount) * 100 * 100) / 100
      : 0;

  const issueDate =
    (details.invoice_date as string | undefined) ?? (core.issue_date as string | undefined);
  if (!issueDate) {
    throw new Error(
      "No invoice date could be read from this document — fill it in on the extraction review panel and try again.",
    );
  }

  // AI-suggested classification is only ever a prefill — classification_confirmed
  // stays false until a human explicitly approves it in the review queue.
  const suggestedCode = (core.suggested_classification_code as string | undefined) ?? null;
  const classificationConfidence =
    (core.classification_confidence as number | undefined) ?? null;
  let classificationId: string | null = null;
  if (suggestedCode) {
    const { data: match } = await supabase
      .from("financial_classifications")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("code", suggestedCode)
      .maybeSingle();
    classificationId = match?.id ?? null;
  }


  const notesParts = [`Created from document extraction ${extraction.id}.`];
  if (counterpartyMatch === "no_match") {
    notesParts.push(
      `No existing counterparty matched tax number ${counterpartyNif} (name on document: ${counterpartyName ?? "unknown"}) — create or link one before posting.`,
    );
  } else if (counterpartyMatch === "ambiguous") {
    notesParts.push(
      `Multiple counterparties share tax number ${counterpartyNif} — resolve before posting.`,
    );
  } else if (counterpartyMatch === "no_nif") {
    notesParts.push("No tax number was readable on this document — set the counterparty manually.");
  }
  if (!directionConfirmed) {
    notesParts.push(
      'Direction defaulted to "inbound" — neither party\'s tax number matched this company\'s, so this wasn\'t confirmed automatically.',
    );
  }

  const { data: doc, error } = await supabase
    .from("financial_documents")
    .insert({
      company_id: data.companyId,
      counterparty_id: counterpartyId,
      counterparty_name: counterpartyName,
      counterparty_nif: counterpartyNif,
      direction,
      doc_type: "invoice",
      document_number: (details.invoice_number as string | undefined) ?? null,
      issue_date: issueDate,
      due_date: (details.due_date as string | undefined) ?? null,
      currency: (core.currency as string | undefined) ?? company.base_currency,
      property_id: data.propertyId ?? null,
      document_id: extraction.document_id,
      source_type: "external_import",
      source_id: extraction.id,
      notes: notesParts.join(" "),
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (netAmount != null) {
    const { error: lineError } = await supabase.from("financial_document_lines").insert({
      company_id: data.companyId,
      document_id: doc.id,
      line_no: 1,
      description: "Imported from document extraction",
      quantity: 1,
      unit_price: netAmount,
      discount_pct: 0,
      vat_rate: vatRate,
      vat_recoverable: true,
      property_id: data.propertyId ?? null,
    });
    if (lineError) throw new Error(lineError.message);
  }

  // Evidence link — the same document_links table the manual "attach
  // document" flows use, so the source file shows up wherever this
  // financial document is reviewed.
  const { error: linkError } = await supabase.from("document_links").upsert(
    {
      company_id: data.companyId,
      document_id: extraction.document_id,
      entity_type: "financial_document",
      entity_id: doc.id,
      relation: "primary",
    },
    { onConflict: "document_id,entity_type,entity_id,relation" },
  );
  if (linkError) throw new Error(linkError.message);

  return {
    financialDocumentId: doc.id as string,
    direction,
    directionConfirmed,
    counterpartyMatch,
    counterpartyNif,
    counterpartyName,
  };
}

/**
 * Turns a completed "bank_statement" extraction's transactions into a
 * staged statement import — the exact same staging table a manual CSV/XLSX
 * upload lands in, so review and commit happen on the normal Banking
 * screen with no separate code path to trust.
 */
export async function applyBankStatementExtractionCore(
  supabase: SupabaseClient,
  data: z.infer<typeof applyBankStatementSchema>,
) {
  const extraction = await loadExtraction(
    supabase,
    data.companyId,
    data.extractionId,
    "bank_statement",
  );
  const details = (extraction.extracted_json.details ?? {}) as Record<string, unknown>;
  const transactions = Array.isArray(details.transactions)
    ? (details.transactions as Array<{
        date?: string;
        description?: string;
        amount?: number;
        balance_after?: number | null;
      }>)
    : [];
  if (!transactions.length) {
    throw new Error("No transaction lines were found in this extraction.");
  }

  const { stageStatementImportCore } = await import("@/modules/banking/staging");

  const rows = transactions.map((t, i) => {
    const amount = t.amount ?? 0;
    return {
      line_no: i + 1,
      transaction_date: t.date ?? null,
      value_date: null,
      description: t.description ?? null,
      bank_reference: null,
      counterparty_name: null,
      counterparty_account: null,
      debit_amount: amount < 0 ? Math.abs(amount) : 0,
      credit_amount: amount > 0 ? amount : 0,
      amount,
      running_balance: t.balance_after ?? null,
      source_row_id: null,
    };
  });

  return stageStatementImportCore(supabase, {
    bankAccountId: data.bankAccountId,
    source: "ai_extraction",
    fileName: undefined,
    documentId: extraction.document_id,
    periodStart: (details.period_start as string | undefined) || undefined,
    periodEnd: (details.period_end as string | undefined) || undefined,
    statementOpeningBalance: (details.opening_balance as number | undefined) ?? undefined,
    statementClosingBalance: (details.closing_balance as number | undefined) ?? undefined,
    notes: `Staged from document extraction ${extraction.id}.`,
    rows,
  });
}
