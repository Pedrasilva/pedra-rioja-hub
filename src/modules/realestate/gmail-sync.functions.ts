import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  syncGmailInvoicesSchema,
  type SyncGmailInvoicesResult,
} from "@/modules/realestate/gmail-sync-schemas";

/** Whether the Gmail connector is linked for this project. */
export const getGmailStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isGmailConfigured } = await import("@/lib/gmail.server");
  return { configured: isGmailConfigured() };
});

/**
 * Pulls PDF attachments from Gmail messages matching `query`, files each one
 * into Drive under the given entity (same folder logic as a manual upload),
 * records it in `documents`, and — unless disabled — queues a Claude
 * extraction immediately. Already-synced attachments (tracked in
 * `gmail_sync_state`) are skipped so re-running is safe.
 *
 * This stops at "extracted" — turning an extraction into an actual draft
 * financial document (and from there, into the review queue) is still the
 * separate, deliberate step it already is everywhere else in this app.
 */
export const syncInvoicesFromGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => syncGmailInvoicesSchema.parse(data))
  .handler(async ({ data, context }): Promise<SyncGmailInvoicesResult> => {
    const { syncInvoicesFromGmailCore } = await import("@/modules/realestate/gmail-sync");
    return syncInvoicesFromGmailCore(context.supabase, data);
  });
