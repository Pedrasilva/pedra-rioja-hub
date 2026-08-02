/**
 * Wires the Claude document-extraction pipeline into the existing
 * bookkeeping/banking machinery, instead of leaving extracted invoices and
 * bank statements as reference-only JSON.
 *
 * Ground rules, matching every other "review before it's real" flow already
 * in this app:
 * - Invoices land as a `financial_document` with status = 'draft' (the
 *   table's own default) — nothing is posted, nothing hits a ledger.
 * - Bank statements are staged via the exact same path a manual CSV/XLSX
 *   upload uses (`stageStatementImportCore`) — reviewed and committed from
 *   the normal Banking screen, not auto-imported.
 * - Counterparty matching is by tax ID (NIF) only, never by name — name
 *   matching drifts ("Banco CTT, SA" vs "BANCO CTT, SA") and silently
 *   creates duplicate counterparties over time.
 * - Direction (money in vs. out) is derived by comparing the extracted NIFs
 *   against the company's own tax_number — never guessed from vague cues.
 *   If neither NIF matches, the fallback is flagged, never silent.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  applyBankStatementSchema,
  applyInvoiceSchema,
} from "@/modules/bookkeeping/extraction-bridge-schemas";

export const applyInvoiceExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => applyInvoiceSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { applyInvoiceExtractionCore } = await import(
      "@/modules/bookkeeping/extraction-bridge"
    );
    return applyInvoiceExtractionCore(context.supabase, data, context.userId ?? null);
  });

export const applyBankStatementExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => applyBankStatementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { applyBankStatementExtractionCore } = await import(
      "@/modules/bookkeeping/extraction-bridge"
    );
    return applyBankStatementExtractionCore(context.supabase, data);
  });

export type ApplyInvoiceInput = z.infer<typeof applyInvoiceSchema>;
