import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  archiveEntrySchema,
  bankAccountSchema,
  entryInclusionSchema,
  generateSchema,
  manualEntrySchema,
  recordActualSchema,
  ruleSchema,
  updateEntrySchema,
  updateRuleSchema,
} from "@/modules/cashflow/schemas";

const nn = <T,>(v: T | null | undefined) => (v === undefined ? null : v);

/**
 * Manual scenario items only. Instalments, leases, invoices and project
 * commitments reach the ledger through their own module's sync, never here.
 */
export const createCashFlowEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => manualEntrySchema.parse(data))
  .handler(async ({ data, context }) => {
    const gross = data.amountNet + data.vat;
    const { data: row, error } = await context.supabase
      .from("cash_flow_entries")
      .insert({
        company_id: data.companyId,
        property_id: nn(data.propertyId),
        unit_id: nn(data.unitId),
        project_id: nn(data.projectId),
        agreement_id: nn(data.agreementId),
        tenancy_id: nn(data.tenancyId),
        bank_account_id: nn(data.bankAccountId),
        document_id: nn(data.documentId),
        category: data.category,
        direction: data.direction,
        state: data.state,
        counterparty_type: data.counterpartyType ?? null,
        counterparty_name: data.counterpartyName ?? null,
        description: data.description,
        currency: data.currency,
        amount_net: data.amountNet,
        vat: data.vat,
        amount_total: gross,
        entry_date: data.expectedDate,
        expected_date: data.expectedDate,
        confidence: data.confidence,
        scenario_code: nn(data.scenarioCode),
        notes: data.notes ?? null,
        source_type: "manual",
        source_id: null,
        is_manual: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCashFlowEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateEntrySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { entryId, companyId: _c, amountNet, vat, ...rest } = data;
    const patch: Record<string, unknown> = {};
    const map: Record<string, string> = {
      propertyId: "property_id",
      unitId: "unit_id",
      projectId: "project_id",
      agreementId: "agreement_id",
      tenancyId: "tenancy_id",
      bankAccountId: "bank_account_id",
      documentId: "document_id",
      category: "category",
      direction: "direction",
      state: "state",
      counterpartyType: "counterparty_type",
      counterpartyName: "counterparty_name",
      description: "description",
      currency: "currency",
      expectedDate: "expected_date",
      confidence: "confidence",
      scenarioCode: "scenario_code",
      notes: "notes",
    };
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && map[k]) patch[map[k]] = v === "" ? null : v;
    }
    if (amountNet !== undefined || vat !== undefined) {
      const { data: current } = await context.supabase
        .from("cash_flow_entries")
        .select("amount_net, vat")
        .eq("id", entryId)
        .maybeSingle();
      const net = amountNet ?? Number(current?.amount_net ?? 0);
      const tax = vat ?? Number(current?.vat ?? 0);
      patch.amount_net = net;
      patch.vat = tax;
      patch.amount_total = net + tax;
    }
    const { error } = await context.supabase
      .from("cash_flow_entries")
      .update(patch as never)
      .eq("id", entryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Scenario switches: include or exclude an item without ever deleting it. */
export const setCashFlowEntryInclusion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entryInclusionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_flow_entries")
      .update({ is_included: data.isIncluded })
      .eq("id", data.entryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Records that a projected movement actually happened. Amounts stay untouched. */
export const recordCashFlowActual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => recordActualSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_flow_entries")
      .update({
        actual_date: data.actualDate,
        state: data.state,
        reconciliation_state: data.state === "reconciled" ? "reconciled" : "matched",
        ...(data.bankAccountId ? { bank_account_id: data.bankAccountId } : {}),
      })
      .eq("id", data.entryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Archive, never delete. */
export const archiveCashFlowEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => archiveEntrySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_flow_entries")
      .update({ deleted_at: new Date().toISOString(), is_included: false })
      .eq("id", data.entryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ rules */

export const createRecurringRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ruleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cash_flow_recurring_rules")
      .insert({
        company_id: data.companyId,
        property_id: nn(data.propertyId),
        unit_id: nn(data.unitId),
        project_id: nn(data.projectId),
        agreement_id: nn(data.agreementId),
        tenancy_id: nn(data.tenancyId),
        bank_account_id: nn(data.bankAccountId),
        name: data.name,
        category: data.category,
        direction: data.direction,
        state: data.state,
        counterparty_type: data.counterpartyType ?? null,
        counterparty_name: data.counterpartyName ?? null,
        currency: data.currency,
        amount_net: data.amountNet,
        vat: data.vat,
        amount_total: data.amountNet + data.vat,
        frequency: data.frequency,
        interval_count: data.intervalCount,
        day_of_month: data.dayOfMonth ?? null,
        start_date: data.startDate,
        end_date: data.endDate || null,
        max_occurrences: data.maxOccurrences ?? null,
        confidence: data.confidence,
        scenario_code: nn(data.scenarioCode),
        is_active: data.isActive,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateRecurringRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateRuleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { ruleId, companyId: _c, amountNet, vat, ...rest } = data;
    const map: Record<string, string> = {
      propertyId: "property_id",
      unitId: "unit_id",
      projectId: "project_id",
      agreementId: "agreement_id",
      tenancyId: "tenancy_id",
      bankAccountId: "bank_account_id",
      name: "name",
      category: "category",
      direction: "direction",
      state: "state",
      counterpartyType: "counterparty_type",
      counterpartyName: "counterparty_name",
      currency: "currency",
      frequency: "frequency",
      intervalCount: "interval_count",
      dayOfMonth: "day_of_month",
      startDate: "start_date",
      endDate: "end_date",
      maxOccurrences: "max_occurrences",
      confidence: "confidence",
      scenarioCode: "scenario_code",
      isActive: "is_active",
      notes: "notes",
    };
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && map[k]) patch[map[k]] = v === "" ? null : v;
    }
    if (amountNet !== undefined || vat !== undefined) {
      const { data: current } = await context.supabase
        .from("cash_flow_recurring_rules")
        .select("amount_net, vat")
        .eq("id", ruleId)
        .maybeSingle();
      const net = amountNet ?? Number(current?.amount_net ?? 0);
      const tax = vat ?? Number(current?.vat ?? 0);
      patch.amount_net = net;
      patch.vat = tax;
      patch.amount_total = net + tax;
    }
    const { error } = await context.supabase
      .from("cash_flow_recurring_rules")
      .update(patch as never)
      .eq("id", ruleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveRecurringRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ({ ruleId: String((data as { ruleId: string }).ruleId) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cash_flow_recurring_rules")
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq("id", data.ruleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Idempotent: re-running over the same horizon never duplicates occurrences. */
export const generateOccurrences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (data.ruleId) {
      const { data: created, error } = await context.supabase.rpc("generate_recurring_cash_flow", {
        _rule_id: data.ruleId,
        _through: data.through,
      });
      if (error) throw new Error(error.message);
      return { created: (created as unknown as number) ?? 0 };
    }
    const { data: created, error } = await context.supabase.rpc("generate_company_cash_flow", {
      _company_id: data.companyId,
      _through: data.through,
    });
    if (error) throw new Error(error.message);
    return { created: (created as unknown as number) ?? 0 };
  });

/* ---------------------------------------------------- bank accounts (P5 prep) */

export const createBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bankAccountSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bank_accounts")
      .insert({
        company_id: data.companyId,
        name: data.name,
        bank_name: data.bankName ?? null,
        iban: data.iban ?? null,
        bic: data.bic ?? null,
        currency: data.currency,
        account_type: data.accountType,
        opening_balance: data.openingBalance,
        opening_balance_date: data.openingBalanceDate,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
