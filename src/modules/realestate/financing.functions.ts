import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  agreementInputSchema,
  commitImportSchema,
  discardImportSchema,
  instalmentStateSchema,
  reviewRow,
  scheduleFingerprint,
  stageImportSchema,
} from "@/modules/realestate/financing-schemas";
import { planChildFolder } from "@/modules/realestate/drive-template";

const updateAgreementSchema = agreementInputSchema.partial().extend({
  agreementId: z.string().uuid(),
});

/** Creates a financing agreement and plans its Drive folder (metadata only). */
export const createFinancingAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => agreementInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: agreement, error } = await context.supabase
      .from("financing_agreements")
      .insert({
        company_id: data.companyId,
        property_id: data.propertyId ?? null,
        type: data.type,
        lender: data.lender,
        reference: data.reference ?? null,
        principal: data.principal,
        currency: data.currency,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        term_months: data.termMonths ?? null,
        rate_type: data.rateType,
        fixed_rate: data.fixedRate ?? null,
        index_name: data.indexName ?? null,
        index_tenor: data.indexTenor ?? null,
        spread: data.spread ?? null,
        repayment_type: data.repaymentType,
        grace_months: data.graceMonths ?? 0,
        payment_day: data.paymentDay ?? null,
        status: data.status,
        notes: data.notes ?? null,
      })
      .select("id, company_id, property_id, lender, code")
      .single();
    if (error) throw new Error(error.message);

    // Drive folder plan, reusing the Phase 2.5 pending-folder pattern.
    try {
      const planned = planChildFolder("financing_agreement", agreement.id, [
        agreement.code ?? agreement.lender,
      ]);
      if (planned) {
        await context.supabase.from("drive_folders").upsert(
          {
            company_id: data.companyId,
            entity_type: "financing_agreement",
            entity_id: agreement.id,
            folder_kind: planned.folderKind,
            path: planned.path,
            sync_status: "pending",
          },
          { onConflict: "company_id,entity_type,entity_id,folder_kind", ignoreDuplicates: true },
        );
      }
    } catch {
      // folder planning never blocks agreement creation
    }

    return agreement;
  });

export const updateFinancingAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateAgreementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { agreementId, companyId: _c, ...rest } = data;
    const patch: Record<string, unknown> = {};
    const map: Record<string, string> = {
      propertyId: "property_id",
      type: "type",
      lender: "lender",
      reference: "reference",
      principal: "principal",
      currency: "currency",
      startDate: "start_date",
      endDate: "end_date",
      termMonths: "term_months",
      rateType: "rate_type",
      fixedRate: "fixed_rate",
      indexName: "index_name",
      indexTenor: "index_tenor",
      spread: "spread",
      repaymentType: "repayment_type",
      graceMonths: "grace_months",
      paymentDay: "payment_day",
      status: "status",
      notes: "notes",
    };
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && map[k]) patch[map[k]] = v === "" ? null : v;
    }
    const { error } = await context.supabase
      .from("financing_agreements")
      .update(patch)
      .eq("id", agreementId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Stages a parsed schedule for review. Nothing touches the live schedule until
 * commitScheduleImport runs; duplicates of an already-committed file are
 * rejected here so the reviewer sees the problem before confirming.
 */
export const stageScheduleImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => stageImportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: agreement, error: aErr } = await context.supabase
      .from("financing_agreements")
      .select("id, company_id")
      .eq("id", data.agreementId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!agreement) throw new Error("Financing agreement not found");

    const reviewed = data.rows.map((r, i) => reviewRow({ ...r, line_no: r.line_no ?? i + 1 }));
    const hash = scheduleFingerprint(data.rows);

    const { data: dupe } = await context.supabase
      .from("financing_schedule_imports")
      .select("id, committed_at, file_name")
      .eq("agreement_id", data.agreementId)
      .eq("content_hash", hash)
      .eq("status", "committed")
      .maybeSingle();
    if (dupe) {
      throw new Error(
        "This exact schedule has already been imported and committed for this agreement.",
      );
    }

    const errorCount = reviewed.filter((r) => r.issues.length > 0).length;
    const { data: imp, error } = await context.supabase
      .from("financing_schedule_imports")
      .insert({
        company_id: agreement.company_id,
        agreement_id: data.agreementId,
        source: data.source,
        file_name: data.fileName ?? null,
        content_hash: hash,
        effective_from: data.effectiveFrom,
        reason: data.reason,
        index_rate_used: data.indexRateUsed ?? null,
        rate_applied: data.rateApplied ?? null,
        status: "draft",
        row_count: reviewed.length,
        error_count: errorCount,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: rErr } = await context.supabase.from("financing_schedule_import_rows").insert(
      reviewed.map((r) => ({
        company_id: agreement.company_id,
        import_id: imp.id,
        line_no: r.line_no,
        period_no: r.period_no,
        due_date: r.due_date,
        opening_balance: r.opening_balance,
        interest: r.interest,
        principal: r.principal,
        vat: r.vat,
        commissions: r.commissions,
        insurance: r.insurance,
        fees: r.fees,
        total_payment: r.total_payment,
        closing_balance: r.closing_balance,
        issues: r.issues,
        include: r.include,
      })),
    );
    if (rErr) throw new Error(rErr.message);

    return { importId: imp.id, rowCount: reviewed.length, errorCount, rows: reviewed };
  });

/**
 * Confirms a reviewed import. The database routine opens a new schedule
 * version, retires only future unreconciled projections from the effective
 * date and leaves settled/reconciled instalments untouched.
 */
export const commitScheduleImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => commitImportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: imp, error } = await context.supabase
      .from("financing_schedule_imports")
      .select("*")
      .eq("id", data.importId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!imp) throw new Error("Import not found");
    if (imp.status !== "draft") throw new Error(`This import is already ${imp.status}`);

    const { data: rows, error: rErr } = await context.supabase
      .from("financing_schedule_import_rows")
      .select("*")
      .eq("import_id", imp.id)
      .eq("include", true)
      .order("line_no");
    if (rErr) throw new Error(rErr.message);
    if (!rows?.length) throw new Error("No rows are marked for inclusion");

    const blocking = rows.filter((r) => (r.issues ?? []).length > 0);
    if (blocking.length) {
      throw new Error(`${blocking.length} row(s) still have validation issues`);
    }

    const payload = rows.map((r) => ({
      period_no: r.period_no,
      due_date: r.due_date,
      opening_balance: r.opening_balance,
      interest: r.interest,
      principal: r.principal,
      vat: r.vat,
      commissions: r.commissions,
      insurance: r.insurance,
      fees: r.fees,
      total_payment: r.total_payment,
      closing_balance: r.closing_balance,
    }));

    const { data: versionId, error: fnErr } = await context.supabase.rpc(
      "apply_financing_schedule",
      {
        _agreement_id: imp.agreement_id,
        _effective_from: imp.effective_from,
        _reason: imp.reason,
        _rows: payload,
        _notes: imp.notes,
        _import_id: imp.id,
        _index_rate_used: imp.index_rate_used,
        _rate_applied: imp.rate_applied,
      },
    );
    if (fnErr) throw new Error(fnErr.message);

    return { versionId: versionId as unknown as string, rowCount: payload.length };
  });

export const discardScheduleImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => discardImportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financing_schedule_imports")
      .update({ status: "discarded" })
      .eq("id", data.importId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marks an instalment settled or reconciled; locked rows are refused by the database. */
export const setInstalmentState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => instalmentStateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financing_schedule_rows")
      .update({
        status: data.status,
        settled_amount: data.settledAmount ?? null,
        settled_on: data.settledOn ?? null,
      })
      .eq("id", data.rowId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
