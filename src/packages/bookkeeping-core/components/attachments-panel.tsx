/**
 * Shared bookkeeping core — evidence panel.
 *
 * Documents are evidence: the panel lists what is attached to a record and
 * lets a recording user link or unlink host-supplied files. The core never
 * knows where the files live.
 */

import { useState } from "react";
import { ExternalLink, Paperclip, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkedFile } from "../adapters";
import { useBookkeepingHost } from "../host";
import { titleCase } from "../format";
import type { SourceType } from "../schemas";
import { OptionSelect } from "./selectors";

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
  const available = documents.useAvailableFiles?.(search) ?? { files: [], isLoading: false };
  const canLink = documents.capabilities.canLink && Boolean(sourceId && documents.linkExisting);

  if (!sourceId) {
    return (
      <p className="text-sm text-muted-foreground">
        Save the draft first — evidence is attached to a stored record.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading evidence…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence attached yet.</p>
        ) : (
          files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Paperclip className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.title}</span>
              <Badge variant="outline" className="text-[10px]">
                {titleCase(f.kind)}
              </Badge>
              {f.url ? (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${f.title}`}
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
              {documents.unlink && documents.capabilities.canLink ? (
                <button
                  type="button"
                  aria-label={`Remove ${f.title}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    void documents.unlink!({ sourceType, sourceId, documentId: f.id })
                  }
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canLink ? (
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
          <div>
            <Label htmlFor="evidence-search">Find a document</Label>
            <Input
              id="evidence-search"
              placeholder="Search by title"
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
              options={[
                { value: "primary", label: "Primary" },
                { value: "supporting", label: "Supporting" },
                { value: "proof_of_payment", label: "Proof of payment" },
              ]}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            {available.isLoading ? (
              <p className="text-sm text-muted-foreground">Searching…</p>
            ) : available.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents match.</p>
            ) : (
              available.files
                .filter((a) => !files.some((f) => f.id === a.id))
                .slice(0, 8)
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void documents.linkExisting!({
                          sourceType,
                          sourceId,
                          documentId: a.id,
                          kind,
                        })
                      }
                    >
                      Attach
                    </Button>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
