/**
 * Gmail REST helpers (server-only), mirroring drive.server.ts exactly.
 *
 * All calls go through the Lovable connector gateway (`google_mail`), which
 * proxies straight through to Google's own `/gmail/v1/...` paths. The
 * connector is linked at project level, so this always acts as the linked
 * mailbox. Never import this file from client code — `.server.ts` is
 * bundle-protected.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail";

function keys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !connectionKey) {
    throw new Error("Gmail is not connected for this project. Link the Gmail connector first.");
  }
  return { lovableKey, connectionKey };
}

export function isGmailConfigured() {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.GOOGLE_MAIL_API_KEY);
}

async function gmailFetch(path: string, init: RequestInit = {}) {
  const { lovableKey, connectionKey } = keys();
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gmail request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`Gmail request failed [${res.status}]: ${body}`);
  }
  return res;
}

export type GmailMessageSummary = { id: string; threadId: string };

/** Searches the mailbox using normal Gmail search syntax (same as the Gmail search box). */
export async function searchMessages(
  query: string,
  maxResults = 25,
): Promise<GmailMessageSummary[]> {
  const res = await gmailFetch(
    `/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
  );
  const json = (await res.json()) as { messages?: GmailMessageSummary[] };
  return json.messages ?? [];
}

type GmailPart = {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

export type GmailAttachmentRef = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type GmailMessageDetail = {
  id: string;
  subject: string | null;
  from: string | null;
  date: string | null;
  attachments: GmailAttachmentRef[];
};

function flattenParts(part: GmailPart | undefined, out: GmailPart[]) {
  if (!part) return;
  out.push(part);
  for (const child of part.parts ?? []) flattenParts(child, out);
}

/** Fetches a message's headers plus a flat list of its attachments (PDFs and otherwise). */
export async function getMessage(messageId: string): Promise<GmailMessageDetail> {
  const res = await gmailFetch(
    `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
  );
  const json = (await res.json()) as {
    id: string;
    payload?: GmailPart & { headers?: { name: string; value: string }[] };
  };

  const headers = json.payload?.headers ?? [];
  const header = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

  const flat: GmailPart[] = [];
  flattenParts(json.payload, flat);

  const attachments: GmailAttachmentRef[] = flat
    .filter((p) => p.filename && p.body?.attachmentId)
    .map((p) => ({
      attachmentId: p.body!.attachmentId!,
      filename: p.filename!,
      mimeType: p.mimeType ?? "application/octet-stream",
      sizeBytes: p.body?.size ?? 0,
    }));

  return {
    id: json.id,
    subject: header("Subject"),
    from: header("From"),
    date: header("Date"),
    attachments,
  };
}

/** Downloads one attachment's raw bytes, re-encoded from Gmail's base64url to standard base64. */
export async function getAttachment(
  messageId: string,
  attachmentId: string,
): Promise<{ contentBase64: string; sizeBytes: number }> {
  const res = await gmailFetch(
    `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  const json = (await res.json()) as { data: string; size: number };
  // Gmail uses base64url (- _ , no padding); Drive's uploadFile expects standard base64.
  const standard = json.data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  return { contentBase64: padded, sizeBytes: json.size };
}
