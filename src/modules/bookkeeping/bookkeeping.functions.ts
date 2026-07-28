import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveCounterpartySchema,
  bankClassificationRuleSchema,
  cancelDocumentSchema,
  classificationSchema,
  counterpartySchema,
  financialDocumentSchema,
  periodSchema,
  postDocumentSchema,
  reversePaymentSchema,
  settlementSchema,
  updateCounterpartySchema,
  updateFinancialDocumentSchema,
} from "@/modules/bookkeeping/schemas";

const nn = <T,>(v: T | null | undefined) => (v === undefined || v === "" ? null : v);

/* -------------------------------------------------------- counterparties */

export const createCounterparty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => counterpartySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("counterparties")
      .insert({
        company_id: data.companyId,
        code: nn(data.code),
        name: data.name,
        legal_name: nn(data.legalName),
        trading_name: nn(data.tradingName),
        counterparty_type: data.counterpartyType,
        nif: nn(data.nif),
        country_code: data.countryCode,
        address_line1: nn(data.addressLine1),
        address_line2: nn(data.addressLine2),
        postal_code: nn(data.postalCode),
        city: nn(data.city),
        email: nn(data.email),
        phone: nn(data.phone),
        contact_name: nn(data.contactName),
        website: nn(data.website),
        payment_terms_days: nn(data.paymentTermsDays),
        payment_method: nn(data.paymentMethod),
        iban: nn(data.iban),
        bic: nn(data.bic),
        default_classification_id: nn(data.defaultClassificationId),
        currency: data.currency,
        notes: nn(data.notes),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCounterparty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateCounterpartySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, companyId: _c, ...rest } = data;
    const patch: Record<string, unknown> = { updated_by: context.userId };
    const map: Record<string, string> = {
      code: "code",
      name: "name",
      legalName: "legal_name",
      tradingName: "trading_name",
      counterpartyType: "counterparty_type",
      nif: "nif",
      countryCode: "country_code",
      addressLine1: "address_line1",
      addressLine2: "address_line2",
      postalCode: "postal_code",
      city: "city",
      email: "email",
      phone: "phone",
      contactName: "contact_name",
      website: "website",
      paymentTermsDays: "payment_terms_days",
      paymentMethod: "payment_method",
      iban: "iban",
      bic: "bic",
      defaultClassificationId: "default_classification_id",
      currency: "currency",
      notes: "notes",
    };
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && map[k]) patch[map[k]] = nn(v as string);
    }
    const { error } = await context.supabase.from("counterparties").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const archiveCounterparty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveCounterpartySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("counterparties")
      .update({
        status: data.archived ? "archived" : "active",
        deleted_at: data.archived ? new Date().toISOString() : null,
        updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ----------------------------------------------------------- classifications */

export const createClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => classificationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("financial_classifications")
      .insert({
        company_id: data.companyId,
        parent_id: nn(data.parentId),
        level: data.level,
        code: data.code,
        name_pt: nn(data.namePt),
        name_en: data.nameEn,
        nature: data.nature,
        default_vat_rate: nn(data.defaultVatRate),
        default_vat_code: nn(data.defaultVatCode),
        vat_recoverable: data.vatRecoverable,
        affects_cash_flow: data.affectsCashFlow,
        affects_profit: data.affectsProfit,
        counterparty_required: data.counterpartyRequired,
        cash_flow_category: nn(data.cashFlowCategory),
        sort_order: data.sortOrder,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ------------------------------------------------------ financial documents */

async function writeLines(
  supabase: { from: (t: string) => any },
  companyId: string,
  documentId: string,
  lines: ReturnType<typeof financialDocumentSchema.parse>["lines"],
) {
  const del = await supabase.from("financial_document_lines").delete().eq("document_id", documentId);
  if (del.error) throw new Error(del.error.message);
  if (!lines.length) return;
  const ins = await supabase.from("financial_document_lines").insert(
    lines.map((l) => ({
      company_id: companyId,
      document_id: documentId,
      line_no: l.lineNo,
      description: nn(l.description),
      quantity: l.quantity,
      unit_price: l.unitPrice,
      discount_pct: l.discountPct,
      vat_rate: l.vatRate,
      vat_code: nn(l.vatCode),
      vat_recoverable: l.vatRecoverable,
      classification_id: nn(l.classificationId),
      property_id: nn(l.propertyId),
      unit_id: nn(l.unitId),
      project_id: nn(l.projectId),
      notes: nn(l.notes),
    })),
  );
  if (ins.error) throw new Error(ins.error.message);
}

export const createFinancialDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => financialDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    let counterpartyName: string | null = null;
    let counterpartyNif: string | null = null;
    if (data.counterpartyId) {
      const { data: cp } = await context.supabase
        .from("counterparties")
        .select("name, nif")
        .eq("id", data.counterpartyId)
        .maybeSingle();
      counterpartyName = cp?.name ?? null;
      counterpartyNif = cp?.nif ?? null;
    }

    const { data: row, error } = await context.supabase
      .from("financial_documents")
      .insert({
        company_id: data.companyId,
        counterparty_id: nn(data.counterpartyId),
        counterparty_name: counterpartyName,
        counterparty_nif: counterpartyNif,
        direction: data.direction,
        doc_type: data.docType,
        series: nn(data.series),
        document_number: nn(data.documentNumber),
        atcud: nn(data.atcud),
        issue_date: data.issueDate,
        due_date: nn(data.dueDate),
        tax_period: nn(data.taxPeriod),
        period_id: nn(data.periodId),
        currency: data.currency,
        withholding_rate: nn(data.withholdingRate),
        classification_id: nn(data.classificationId),
        property_id: nn(data.propertyId),
        unit_id: nn(data.unitId),
        project_id: nn(data.projectId),
        bank_account_id: nn(data.bankAccountId),
        document_id: nn(data.documentId),
        corrects_document_id: nn(data.correctsDocumentId),
        source_type: nn(data.sourceType),
        source_id: nn(data.sourceId),
        notes: nn(data.notes),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await writeLines(context.supabase, data.companyId, row!.id, data.lines);
    return row;
  });

export const updateFinancialDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateFinancialDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_by: context.userId };
    const map: Record<string, string> = {
      counterpartyId: "counterparty_id",
      series: "series",
      documentNumber: "document_number",
      atcud: "atcud",
      issueDate: "issue_date",
      dueDate: "due_date",
      taxPeriod: "tax_period",
      periodId: "period_id",
      withholdingRate: "withholding_rate",
      classificationId: "classification_id",
      propertyId: "property_id",
      unitId: "unit_id",
      projectId: "project_id",
      bankAccountId: "bank_account_id",
      documentId: "document_id",
      notes: "notes",
    };
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && map[k]) patch[map[k]] = nn(v as string);
    }
    const { error } = await context.supabase
      .from("financial_documents")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.lines && data.companyId) {
      await writeLines(context.supabase, data.companyId, data.id, data.lines);
    }
    return { id: data.id };
  });

export const postFinancialDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => postDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({ status: "posted", updated_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const cancelFinancialDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cancelDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        status: "cancelled",
        cancellation_reason: data.reason,
        deleted_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ------------------------------------------------------------ settlement */

export const settleFinancialDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settlementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("settle_financial_document", {
      _document_id: data.documentId,
      _amount: data.amount,
      _payment_date: data.paymentDate,
      _bank_transaction_id: nn(data.bankTransactionId) ?? undefined,
      _method: nn(data.method) ?? undefined,
      _notes: nn(data.notes) ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { paymentId: id as string };
  });

export const reverseFinancialPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reversePaymentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("reverse_financial_payment", {
      _payment_id: data.paymentId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { paymentId: data.paymentId };
  });

/* ------------------------------------------------- bank classification rules */

export const upsertBankClassificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    bankClassificationRuleSchema.extend({ id: bankClassificationRuleSchema.shape.companyId.optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      company_id: data.companyId,
      bank_account_id: nn(data.bankAccountId),
      name: data.name,
      priority: data.priority,
      match_field: data.matchField,
      match_type: data.matchType,
      match_value: data.matchValue,
      direction: nn(data.direction),
      min_amount: nn(data.minAmount),
      max_amount: nn(data.maxAmount),
      classification_id: nn(data.classificationId),
      counterparty_id: nn(data.counterpartyId),
      property_id: nn(data.propertyId),
      project_id: nn(data.projectId),
      cash_flow_category: nn(data.cashFlowCategory),
      is_internal_transfer: data.isInternalTransfer,
      notes: nn(data.notes),
      updated_by: context.userId,
    };
    const query = data.id
      ? context.supabase.from("bank_classification_rules").update(payload).eq("id", data.id).select("id").single()
      : context.supabase
          .from("bank_classification_rules")
          .insert({ ...payload, created_by: context.userId })
          .select("id")
          .single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row;
  });

export const recomputePeriodTotals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ periodId: String((data as { periodId: string }).periodId) }))
  .handler(async ({ data, context }) => {
    const { data: count, error } = await context.supabase.rpc("recompute_period_totals", {
      _period_id: data.periodId,
    });
    if (error) throw new Error(error.message);
    return { rows: (count as number) ?? 0 };
  });

export const createFinancialPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => periodSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("financial_periods")
      .insert({
        company_id: data.companyId,
        code: data.code,
        period_type: data.periodType,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        notes: nn(data.notes),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
