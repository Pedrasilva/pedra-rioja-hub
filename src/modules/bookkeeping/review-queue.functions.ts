import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  confirmClassificationSchema,
  confirmCounterpartySchema,
  fileDocumentSchema,
  ignoreDocumentSchema,
  rejectDocumentSchema,
  reopenReviewSchema,
} from "@/modules/bookkeeping/review-queue-schemas";

/**
 * Review queue: the human gate between "AI read a document" and "this is
 * bookkeeping truth". Two checkpoints must be cleared independently —
 * counterparty and classification — before a document can be filed (posted).
 * Nothing here posts implicitly; filing is always an explicit act.
 */

/** Checkpoint 1 — confirm who this document is with. */
export const confirmDocumentCounterparty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => confirmCounterpartySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        counterparty_id: data.counterpartyId,
        ...(data.counterpartyName ? { counterparty_name: data.counterpartyName } : {}),
        ...(data.direction ? { direction: data.direction, direction_confirmed: true } : {}),
        counterparty_confirmed: true,
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId };
  });

/** Checkpoint 2 — confirm how this document is classified. */
export const confirmDocumentClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => confirmClassificationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        classification_id: data.classificationId,
        ...(data.propertyId !== undefined ? { property_id: data.propertyId } : {}),
        classification_confirmed: true,
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId };
  });

/**
 * File the document: only allowed once both checkpoints are cleared. This is
 * the single place review state turns into a posted financial document.
 */
export const fileReviewedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => fileDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc, error: readError } = await context.supabase
      .from("financial_documents")
      .select(
        "id, status, counterparty_confirmed, classification_confirmed, direction_confirmed, classification_id",
      )
      .eq("id", data.documentId)
      .eq("company_id", data.companyId)
      .single();
    if (readError || !doc) throw new Error(readError?.message ?? "Document not found");

    if (!doc.counterparty_confirmed) {
      throw new Error("Confirm the supplier before filing this document.");
    }
    if (!doc.classification_confirmed) {
      throw new Error("Confirm the classification before filing this document.");
    }
    if (!doc.direction_confirmed) {
      throw new Error(
        "Confirm whether this is money in or money out before filing this document.",
      );
    }
    if (!doc.classification_id) {
      throw new Error("This document has no classification set.");
    }
    if (doc.status === "cancelled") {
      throw new Error("This document was cancelled and can't be filed.");
    }

    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        review_status: "approved",
        review_rejected_reason: null,
        ...(doc.status === "draft" ? { status: "posted" } : {}),
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId, posted: doc.status === "draft" };
  });

/** Reject: something is wrong with the document itself. Stays visible with a reason. */
export const rejectReviewedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rejectDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        review_status: "rejected",
        review_rejected_reason: data.reason,
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId };
  });

/** Ignore: not a bookkeeping document at all. Kept, never posted. */
export const ignoreReviewedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ignoreDocumentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        review_status: "ignored",
        review_rejected_reason: data.reason ?? null,
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId };
  });

/** Put a rejected/ignored document back in the queue. Never un-posts anything. */
export const reopenDocumentReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reopenReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("financial_documents")
      .update({
        review_status: "pending",
        review_rejected_reason: null,
        updated_by: context.userId,
      })
      .eq("id", data.documentId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { id: data.documentId };
  });
