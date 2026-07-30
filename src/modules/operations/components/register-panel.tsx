/**
 * Phase 8B — the shared operational register.
 *
 * The five operational domains (obligations, service contracts, insurance,
 * utilities, tax schedules) differ only in their fields and columns, so they
 * share one table, one editor dialog, one archive flow and one commitment
 * link. That keeps the §5C boundary visible in a single place: this component
 * renders financial figures but never accepts them as input — the only way to
 * put an amount on an operational record is to authorise a commitment.
 */

import { useEffect, useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { formatMoneyPrecise } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import type { CommitmentSummary } from "@/modules/commitments/queries";
import { useSupplierOptions } from "@/modules/commitments/queries";
import { CommitmentLinkDialog } from "./commitment-link-dialog";
import { OperationalBadge } from "./operational-badge";
import type { ObligationSummary } from "@/modules/operations/queries";
import { usePropertyOptions } from "@/modules/operations/queries";
import { operationalLabel, type OperationalEntityType } from "@/modules/operations/schemas";
import type { OperationsActions, OperationsActionName } from "@/modules/operations/server";

export const NONE = "__none__";

export type RegisterRow = Record<string, unknown> & {
  company_id: string;
  title: string;
  status: string;
  archived_at: string | null;
  commitment_id: string | null;
  commitment_currency: string | null;
  committed_amount: number;
  invoiced_amount: number;
  paid_amount: number;
};

export type FieldKind =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select"
  | "checkbox"
  | "counterparty"
  | "property"
  | "obligation";

export type FieldDef = {
  /** camelCase key on the Zod schema. */
  name: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  span?: boolean;
  /** Show only when creating, only when editing, or always (default). */
  mode?: "create" | "edit";
  placeholder?: string;
  help?: string;
};

export type ColumnDef = {
  header: string;
  align?: "right";
  cell: (row: RegisterRow) => React.ReactNode;
};

export type RegisterDef = {
  entityType: OperationalEntityType;
  /** Primary key column on the summary view, e.g. `obligation_id`. */
  idKey: string;
  /** Payload key the update schema expects, e.g. `obligationId`. */
  updateIdKey: string;
  title: string;
  description: string;
  addLabel: string;
  statuses: readonly string[];
  columns: ColumnDef[];
  fields: FieldDef[];
  /** Create defaults keyed by field name. */
  defaults: Record<string, string>;
  createAction: OperationsActionName;
  updateAction: OperationsActionName;
  /** Maps a summary row back into form values. */
  toForm: (row: RegisterRow) => Record<string, string>;
};

function fieldValue(kind: FieldKind, raw: string): unknown {
  if (kind === "checkbox") return raw === "true";
  if (raw === "" || raw === NONE) return null;
  if (kind === "number") return Number(raw);
  return raw;
}

function RegisterDialog({
  register,
  companyId,
  actions,
  obligations,
  row,
  disabled,
}: {
  register: RegisterDef;
  companyId: string | undefined;
  actions: OperationsActions;
  obligations: ObligationSummary[];
  row?: RegisterRow;
  disabled?: boolean;
}) {
  const editing = Boolean(row);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(register.defaults);
  const { data: suppliers = [] } = useSupplierOptions(companyId);
  const { data: properties = [] } = usePropertyOptions(companyId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(row ? { ...register.defaults, ...register.toForm(row) } : register.defaults);
  }, [open, row, register]);

  const visible = register.fields.filter(
    (f) => !f.mode || (f.mode === "edit" ? editing : !editing),
  );

  const set = (name: string, value: string) => setForm((f) => ({ ...f, [name]: value }));

  async function submit() {
    setError(null);
    if (!companyId) {
      setError("No workspace is selected");
      return;
    }
    const payload: Record<string, unknown> = {};
    for (const field of visible) {
      payload[field.name] = fieldValue(field.kind, form[field.name] ?? "");
    }
    if (editing) {
      payload[register.updateIdKey] = row![register.idKey];
      payload.status = form.status;
    } else {
      payload.companyId = companyId;
    }
    const result = await actions.run(
      editing ? register.updateAction : register.createAction,
      payload,
    );
    if (result) setOpen(false);
    else setError("Please check the highlighted details and try again");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={editing ? "ghost" : "default"} disabled={disabled}>
          {editing ? (
            "Edit"
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" /> {register.addLabel}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${register.title.toLowerCase()}` : register.addLabel}
          </DialogTitle>
          <DialogDescription>
            Operational detail only. Any money is authorised on the linked commitment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <div>
              <Label htmlFor={`${register.entityType}-status`}>Status</Label>
              <Select value={form.status ?? ""} onValueChange={(v) => set("status", v)}>
                <SelectTrigger id={`${register.entityType}-status`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {register.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {operationalLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {visible.map((field) => {
            const id = `${register.entityType}-${field.name}`;
            const value = form[field.name] ?? "";
            const options =
              field.kind === "counterparty"
                ? suppliers.map((s) => ({ value: s.id, label: s.name }))
                : field.kind === "property"
                  ? properties.map((p) => ({ value: p.id, label: p.name }))
                  : field.kind === "obligation"
                    ? obligations.map((o) => ({ value: o.obligation_id, label: o.title }))
                    : (field.options ?? []).map((o) => ({ value: o, label: operationalLabel(o) }));

            return (
              <div key={field.name} className={field.span ? "sm:col-span-2" : undefined}>
                <Label htmlFor={id}>{field.label}</Label>
                {field.kind === "textarea" ? (
                  <Textarea
                    id={id}
                    rows={2}
                    value={value}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                ) : field.kind === "checkbox" ? (
                  <div className="flex h-9 items-center">
                    <Checkbox
                      id={id}
                      checked={value === "true"}
                      onCheckedChange={(c) => set(field.name, c ? "true" : "false")}
                    />
                  </div>
                ) : field.kind === "select" ||
                  field.kind === "counterparty" ||
                  field.kind === "property" ||
                  field.kind === "obligation" ? (
                  <Select value={value || NONE} onValueChange={(v) => set(field.name, v)}>
                    <SelectTrigger id={id}>
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not set</SelectItem>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                )}
                {field.help ? (
                  <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            {editing ? "Save changes" : register.addLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  register,
  row,
  actions,
}: {
  register: RegisterDef;
  row: RegisterRow;
  actions: OperationsActions;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 3) {
      setError("An archive reason is required");
      return;
    }
    const result = await actions.run("archive", {
      entityType: register.entityType,
      entityId: row[register.idKey],
      reason: reason.trim(),
    });
    if (result) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive {register.title.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Nothing is deleted. The record is retained with its history, and any pending reminders
            are dismissed.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="archive-reason">Reason</Label>
          <Textarea
            id="archive-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={actions.isPending}>
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RegisterPanel({
  register,
  companyId,
  rows,
  obligations,
  commitments,
  capabilities,
  actions,
  isLoading,
  renderExtraActions,
}: {
  register: RegisterDef;
  companyId: string | undefined;
  rows: RegisterRow[];
  obligations: ObligationSummary[];
  commitments: CommitmentSummary[];
  capabilities: CommitmentCapabilities;
  actions: OperationsActions;
  isLoading?: boolean;
  renderExtraActions?: (row: RegisterRow) => React.ReactNode;
}) {
  const [status, setStatus] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (showArchived ? true : !r.archived_at) && (status === "all" || r.status === status),
      ),
    [rows, status, showArchived],
  );

  const byCommitment = useMemo(
    () => new Map(commitments.map((c) => [c.commitment_id, c])),
    [commitments],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{register.title}</CardTitle>
            <CardDescription>{register.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={showArchived}
                onCheckedChange={(c) => setShowArchived(Boolean(c))}
                aria-label="Show archived"
              />
              Show archived
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {register.statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {operationalLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RegisterDialog
              register={register}
              companyId={companyId}
              actions={actions}
              obligations={obligations}
              disabled={!capabilities.canRecord}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {register.columns.map((c) => (
                  <TableHead key={c.header} className={c.align === "right" ? "text-right" : ""}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead>Commitment</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const commitment = row.commitment_id ? byCommitment.get(row.commitment_id) : null;
                const currency = row.commitment_currency ?? commitment?.currency ?? "EUR";
                const id = String(row[register.idKey]);
                return (
                  <TableRow key={id} data-archived={row.archived_at ? "true" : undefined}>
                    {register.columns.map((c) => (
                      <TableCell
                        key={c.header}
                        className={c.align === "right" ? "text-right tabular-nums" : ""}
                      >
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    <TableCell className="text-muted-foreground">
                      {row.commitment_id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5" />
                          {commitment?.title ?? "Linked"}
                        </span>
                      ) : (
                        "Not linked"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.commitment_id
                        ? formatMoneyPrecise(row.committed_amount, currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.commitment_id ? formatMoneyPrecise(row.invoiced_amount, currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.commitment_id ? formatMoneyPrecise(row.paid_amount, currency) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {renderExtraActions?.(row)}
                        {capabilities.canRecord && !row.archived_at ? (
                          <>
                            <RegisterDialog
                              register={register}
                              companyId={companyId}
                              actions={actions}
                              obligations={obligations}
                              row={row}
                            />
                            <CommitmentLinkDialog
                              entityType={register.entityType}
                              entityId={id}
                              row={row}
                              commitments={commitments}
                              actions={actions}
                            />
                          </>
                        ) : null}
                        {capabilities.canManage && !row.archived_at ? (
                          <ArchiveDialog register={register} row={row} actions={actions} />
                        ) : null}
                        {row.archived_at ? <OperationalBadge status="archived" /> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
