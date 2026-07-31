import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, FolderSync, HardDriveUpload, Link2, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import {
  attachDocument,
  connectDriveRoot,
  getDriveStatus,
  listEntityDocuments,
  syncDriveFolders,
} from "@/modules/realestate/drive.functions";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_ENTITY_LABELS,
  type DocumentEntityType,
} from "@/modules/realestate/drive-schemas";
import { DocumentExtractionButton } from "@/modules/realestate/components/document-extraction-panel";

/* ------------------------------------------------------------------- helpers */

export function useDriveStatus(companyId?: string) {
  const fn = useServerFn(getDriveStatus);
  return useQuery({
    queryKey: ["drive-status", companyId],
    enabled: Boolean(companyId),
    queryFn: () => fn({ data: { companyId: companyId! } }),
  });
}

async function fileToBase64(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/* ------------------------------------------------------------ drive settings */

export function DriveSettingsCard({
  companyId,
  canManage,
}: {
  companyId?: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const status = useDriveStatus(companyId);
  const connectFn = useServerFn(connectDriveRoot);
  const syncFn = useServerFn(syncDriveFolders);
  const [rootRef, setRootRef] = useState("");

  const connect = useMutation({
    mutationFn: (useExisting: boolean) =>
      connectFn({
        data: {
          companyId: companyId!,
          ...(useExisting ? { rootFolderRef: rootRef.trim() } : { rootFolderName: "Pedra Rioja" }),
        },
      }),
    onSuccess: () => {
      toast.success("Drive root connected and folder structure created");
      queryClient.invalidateQueries({ queryKey: ["drive-status", companyId] });
      queryClient.invalidateQueries({ queryKey: ["property-drive-folders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: () => syncFn({ data: { companyId: companyId! } }),
    onSuccess: (r) => {
      toast.success(
        r.created ? `${r.created} folder(s) created in Drive` : "Everything is already in sync",
      );
      queryClient.invalidateQueries({ queryKey: ["drive-status", companyId] });
      queryClient.invalidateQueries({ queryKey: ["property-drive-folders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = status.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Google Drive</CardTitle>
        <CardDescription>
          Drive is the file repository; this app stores only metadata, links and the folder map.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:max-w-xl">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={data?.connected ? "default" : "outline"}>
            {data?.connected ? "Connector linked" : "Connector missing"}
          </Badge>
          <Badge variant={data?.rootFolderId ? "default" : "outline"}>
            {data?.rootFolderId ? "Root folder set" : "No root folder"}
          </Badge>
          {data ? (
            <span className="text-muted-foreground">
              {data.syncedFolders} synced · {data.pendingFolders} pending
            </span>
          ) : null}
        </div>

        {data?.rootFolderUrl ? (
          <a
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline underline-offset-4"
            href={data.rootFolderUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open root folder in Drive <ExternalLink className="size-3.5" />
          </a>
        ) : null}

        {canManage ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="drive-root">Existing Drive folder (id or link)</Label>
              <div className="flex gap-2">
                <Input
                  id="drive-root"
                  placeholder="https://drive.google.com/drive/folders/…"
                  value={rootRef}
                  onChange={(e) => setRootRef(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!rootRef.trim() || connect.isPending}
                  onClick={() => connect.mutate(true)}
                >
                  <Link2 className="size-4" /> Use folder
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Or let the app create a fresh “Pedra Rioja” root folder in the connected Drive
                account.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={connect.isPending}
                onClick={() => connect.mutate(false)}
              >
                {connect.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Create root
                folder
              </Button>
              <Button
                variant="outline"
                disabled={!data?.rootFolderId || sync.isPending}
                onClick={() => sync.mutate()}
              >
                {sync.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FolderSync className="size-4" />
                )}
                Sync planned folders
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only owners and managers can change the Drive setup.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- documents */

type DocumentsPanelProps = {
  companyId: string;
  entityType: DocumentEntityType;
  entityId: string;
  /** Property subfolder to upload into, e.g. "legal". */
  folderKind?: string;
  currency: string;
  canEdit: boolean;
};

export function AttachDocumentDialog({
  companyId,
  entityType,
  entityId,
  folderKind,
  currency,
  open,
  onOpenChange,
}: DocumentsPanelProps & { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const attachFn = useServerFn(attachDocument);
  const [file, setFile] = useState<File | null>(null);
  const [driveRef, setDriveRef] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: folderKind ?? "other",
    docType: "",
    issueDate: "",
    expiryDate: "",
    amount: "",
    notes: "",
  });

  const reset = () => {
    setFile(null);
    setDriveRef("");
    setForm({
      title: "",
      category: folderKind ?? "other",
      docType: "",
      issueDate: "",
      expiryDate: "",
      amount: "",
      notes: "",
    });
  };

  const attach = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("A title is required");
      if (!file && !driveRef.trim())
        throw new Error("Choose a file to upload or paste a Drive link");
      if (file && file.size > MAX_UPLOAD_BYTES)
        throw new Error("Files larger than 15 MB must be added in Drive and linked here");

      return attachFn({
        data: {
          companyId,
          entityType,
          entityId,
          folderKind: folderKind ?? form.category,
          title: form.title.trim(),
          category: form.category,
          docType: form.docType.trim() || undefined,
          issueDate: form.issueDate || undefined,
          expiryDate: form.expiryDate || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
          currency: form.amount ? currency : undefined,
          notes: form.notes.trim() || undefined,
          ...(file
            ? {
                file: {
                  name: file.name,
                  mimeType: file.type || "application/octet-stream",
                  contentBase64: await fileToBase64(file),
                },
              }
            : { driveFileRef: driveRef.trim() }),
        },
      });
    },
    onSuccess: () => {
      toast.success("Document attached");
      queryClient.invalidateQueries({ queryKey: ["entity-documents", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["property-documents"] });
      queryClient.invalidateQueries({ queryKey: ["property-drive-folders"] });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            Attach document — {DOCUMENT_ENTITY_LABELS[entityType]}
          </DialogTitle>
          <DialogDescription>
            The file is stored in Google Drive; only its metadata and link are kept here.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="doc-file">Upload a file</Label>
            <Input
              id="doc-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="doc-link">…or link a file already in Drive</Label>
            <Input
              id="doc-link"
              placeholder="https://drive.google.com/file/d/…"
              value={driveRef}
              onChange={(e) => setDriveRef(e.target.value)}
              disabled={Boolean(file)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Deed of purchase"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {titleCase(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-type">Document type</Label>
              <Input
                id="doc-type"
                value={form.docType}
                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                placeholder="Invoice, contract…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-date">Document date</Label>
              <Input
                id="doc-date"
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-expiry">Expiry date</Label>
              <Input
                id="doc-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="doc-amount">Amount ({currency})</Label>
              <Input
                id="doc-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea
              id="doc-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => attach.mutate()} disabled={attach.isPending}>
            {attach.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HardDriveUpload className="size-4" />
            )}
            Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsPanel(props: DocumentsPanelProps) {
  const { companyId, entityType, entityId, canEdit } = props;
  const listFn = useServerFn(listEntityDocuments);
  const status = useDriveStatus(companyId);
  const [open, setOpen] = useState(false);

  const documents = useQuery({
    queryKey: ["entity-documents", entityType, entityId],
    queryFn: () => listFn({ data: { companyId, entityType, entityId } }),
  });

  const ready = Boolean(status.data?.connected && status.data?.rootFolderId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-display text-lg">Documents</CardTitle>
          <CardDescription>
            Files live in Google Drive; type, dates, amount and notes are recorded here.
          </CardDescription>
        </div>
        {canEdit ? (
          <Button
            size="sm"
            variant="outline"
            disabled={!ready}
            title={ready ? undefined : "Connect a Drive root folder in Settings first"}
            onClick={() => setOpen(true)}
          >
            <HardDriveUpload className="size-4" /> Attach document
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {documents.data?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.title}
                    {d.notes ? (
                      <span className="block text-xs text-muted-foreground">{d.notes}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{titleCase(d.category)}</TableCell>
                  <TableCell>{d.doc_type ?? "—"}</TableCell>
                  <TableCell>{formatDate(d.issue_date)}</TableCell>
                  <TableCell>{formatDate(d.expiry_date)}</TableCell>
                  <TableCell className="text-right">
                    {d.amount == null
                      ? "—"
                      : formatMoney(Number(d.amount), d.currency ?? props.currency)}
                  </TableCell>
                  <TableCell>
                    {d.drive_url ? (
                      <a
                        className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
                        href={d.drive_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <Badge variant="outline">{titleCase(d.sync_status)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {props.canEdit ? (
                      <DocumentExtractionButton
                        companyId={props.companyId}
                        documentId={d.id}
                        currency={d.currency ?? props.currency}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-md border border-dashed border-border px-6 py-10 text-center">
            <p className="font-medium">No documents attached</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ready
                ? "Attach a file — it is uploaded straight into the matching Drive folder."
                : "Connect a Drive root folder in Settings to start attaching documents."}
            </p>
          </div>
        )}
      </CardContent>
      {canEdit ? <AttachDocumentDialog {...props} open={open} onOpenChange={setOpen} /> : null}
    </Card>
  );
}
