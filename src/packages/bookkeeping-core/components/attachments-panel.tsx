/**
 * Shared bookkeeping core — evidence panel.
 *
 * Documents are evidence: the panel lists what is attached to a record and
 * lets a permitted user link, upload or detach files. The core never knows
 * where the files live — every operation goes through the host documents
 * adapter, so there is no storage or Drive dependency in this package.
 *
 * Evidence is deliberately independent of the accounting lifecycle: a posted
 * document (or one inside a closed period) still accepts evidence, because
 * attaching a file changes no amount, classification or period total.
 */

import { useState } from "react";
import { ExternalLink, FileWarning, Paperclip, Upload, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkedFile } from "../adapters";
import { useBookkeepingHost } from "../host";
import { titleCase } from "../format";
import type { SourceType } from "../schemas";
import { OptionSelect } from "./selectors";

const KINDS: { value: LinkedFile["kind"]; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "supporting", label: "Supporting" },
  { value: "proof_of_payment", label: "Proof of payment" },
];

/** A file the host can no longer resolve — surfaced, never hidden. */
function isUnavailable(file: LinkedFile) {
  return !file.url || file.status === "missing" || file.status === "error";
}

export function AttachmentsPanel({
  sourceType,
  sourceId,
}: {
  sourceType: SourceType;
  sourceId: string | undefined;
}) {
  const { documents } = useBookkeepingHost();
  const { files, isLoading } = documents.useLinkedFiles({ sourceType, sourceId });
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<LinkedFile["kind"]>("supporting");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableSource = documents.useAvailableFiles;
  const available = availableSource
    ? availableSource(search)
    : { files: [] as LinkedFile[], isLoading: false };

  const canLink = documents.capabilities.canLink && Boolean(documents.linkExisting);
  const canUpload = documents.capabilities.canUpload && Boolean(documents.upload);
  const canDetach = documents.capabilities.canLink && Boolean(documents.unlink);
  const adapterAvailable = canLink || canUpload || Boolean(documents.useLinkedFiles);
  const managing = Boolean(sourceId) && (canLink || canUpload);

  const run = async (label: string, fn: () => void | Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The file could not be attached.");
    } finally {
      setBusy(null);
    }
  };

  if (!sourceId) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="attachments-no-source">
        Save the draft first — evidence is attached to a stored document.
      </p>
    );
  }

  if (!adapterAvailable) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="attachments-unavailable">
        Document storage is not configured for this workspace.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="attachments-panel">
      {isLoading ? (
        <p className="text-sm text-muted-foreground" data-testid="attachments-loading">
          Loading evidence…
        </p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="attachments-empty">
          No evidence attached yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.title}</span>
              <Badge variant="outline" className="text-[10px]">
                {titleCase(f.kind)}
              </Badge>
              {isUnavailable(f) ? (
                <span
                  className="flex items-center gap-1 text-xs text-destructive"
                  data-testid={`attachment-unavailable-${f.id}`}
                >
                  <FileWarning className="size-4" /> File unavailable
                </span>
              ) : (
                <a
                  href={f.url!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${f.title}`}
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
              {canDetach ? (
                <button
                  type="button"
                  aria-label={`Remove ${f.title}`}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busy !== null}
                  onClick={() =>
                    void run("detach", () =>
                      documents.unlink!({ sourceType, sourceId, documentId: f.id }),
                    )
                  }
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="text-sm text-destructive" data-testid="attachments-error">
          {error}
        </p>
      ) : null}

      {!managing ? (
        <p className="text-xs text-muted-foreground" data-testid="attachments-readonly">
          You can view evidence but not change it.
        </p>
      ) : (
        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
            <div>
              <Label htmlFor="evidence-search">Find a document</Label>
              <Input
                id="evidence-search"
                placeholder="Search by title"
                disabled={!canLink}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <OptionSelect
                aria-label="Evidence role"
                allowNone={false}
                value={kind}
                onChange={(v) => setKind((v ?? "supporting") as LinkedFile["kind"])}
                options={KINDS}
              />
            </div>
          </div>

          {canUpload ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run("upload", () => documents.upload!({ sourceType, sourceId, kind }))
              }
            >
              <Upload className="size-4" />
              {busy === "upload" ? "Uploading…" : "Upload file"}
            </Button>
          ) : null}

          {canLink ? (
            <div className="space-y-1" data-testid="attachments-picker">
              {available.isLoading ? (
                <p className="text-sm text-muted-foreground">Searching…</p>
              ) : (
                (() => {
                  const candidates = available.files
                    .filter((a) => !files.some((f) => f.id === a.id))
                    .slice(0, 8);
                  if (candidates.length === 0)
                    return <p className="text-sm text-muted-foreground">No documents match.</p>;
                  return candidates.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{a.title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          void run("link", () =>
                            documents.linkExisting!({
                              sourceType,
                              sourceId,
                              documentId: a.id,
                              kind,
                            }),
                          )
                        }
                      >
                        Attach
                      </Button>
                    </div>
                  ));
                })()
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
