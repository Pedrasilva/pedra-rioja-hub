/**
 * Google Drive REST helpers (server-only).
 *
 * All calls go through the Lovable connector gateway; the connector is linked
 * at project level, so this always acts as the workspace's Drive account.
 * Never import this file from client code — `.server.ts` is bundle-protected.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

function keys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connectionKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !connectionKey) {
    throw new Error(
      "Google Drive is not connected for this project. Link the Google Drive connector first.",
    );
  }
  return { lovableKey, connectionKey };
}

export function isDriveConfigured() {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.GOOGLE_DRIVE_API_KEY);
}

async function driveFetch(path: string, init: RequestInit = {}) {
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
    console.error(`Drive request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`Google Drive request failed [${res.status}]: ${body}`);
  }
  return res;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  parents?: string[];
  trashed?: boolean;
};

const FILE_FIELDS = "id,name,mimeType,webViewLink,parents,trashed";

export function folderUrl(id: string) {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** Escapes a value for use inside a Drive `q` string literal. */
function q(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function getFile(fileId: string): Promise<DriveFile> {
  const res = await driveFetch(
    `/drive/v3/files/${encodeURIComponent(fileId)}?fields=${FILE_FIELDS}&supportsAllDrives=true`,
  );
  return (await res.json()) as DriveFile;
}

/** Looks for a non-trashed child folder with this exact name. */
export async function findChildFolder(parentId: string, name: string): Promise<DriveFile | null> {
  const query = `name = '${q(name)}' and mimeType = '${FOLDER_MIME}' and '${q(parentId)}' in parents and trashed = false`;
  const res = await driveFetch(
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files?.[0] ?? null;
}

export async function createFolder(parentId: string | null, name: string): Promise<DriveFile> {
  const res = await driveFetch(`/drive/v3/files?fields=${FILE_FIELDS}&supportsAllDrives=true`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  return (await res.json()) as DriveFile;
}

/**
 * Claim-or-create: never creates a second folder with the same name under the
 * same parent, which is the main duplicate-folder risk when syncing twice.
 */
export async function ensureFolder(parentId: string, name: string): Promise<DriveFile> {
  const existing = await findChildFolder(parentId, name);
  if (existing) return existing;
  return createFolder(parentId, name);
}

/** Uploads a file into a folder using Drive's multipart upload. */
export async function uploadFile(opts: {
  parentId: string;
  name: string;
  mimeType: string;
  /** Base64-encoded (no data: prefix) file content. */
  contentBase64: string;
}): Promise<DriveFile & { size?: string }> {
  const boundary = `pedra-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: opts.name, parents: [opts.parentId] });
  const binary = Uint8Array.from(atob(opts.contentBase64), (c) => c.charCodeAt(0));

  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(head.length + binary.length + tail.length);
  body.set(head, 0);
  body.set(binary, head.length);
  body.set(tail, head.length + binary.length);

  const res = await driveFetch(
    `/upload/drive/v3/files?uploadType=multipart&fields=${FILE_FIELDS},size&supportsAllDrives=true`,
    {
      method: "POST",
      headers: { "content-type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return (await res.json()) as DriveFile & { size?: string };
}

/** Extracts a Drive file/folder id from any of the common Drive URL shapes. */
export function parseDriveId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (!value.includes("/") && !value.includes("?")) return value;
  const patterns = [/\/folders\/([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const m = value.match(p);
    if (m) return m[1];
  }
  return null;
}
