import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  reviewRow,
  REVISION_REASONS,
  type ReviewRow,
} from "@/modules/realestate/financing-schemas";
import {
  commitScheduleImport,
  stageScheduleImport,
} from "@/modules/realestate/financing.functions";

export type ExtractedInstallment = {
  due_date?: string | null;
  amount?: number | string | null;
  description?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  propertyId?: string;
  currency: string;
  installments: ExtractedInstallment[];
  /** Used only as the import's file name, for audit lineage. */
  sourceLabel: string;
};

type Allocation = "principal" | "interest" | "fees";

function toReviewRows(
  installments: ExtractedInstallment[],
  allocation: Allocation,
): ReviewRow[] {
  return installments.map((inst, i) => {
    const amount = Number(inst.amount ?? 0) || 0;
    return reviewRow({
      line_no: i + 1,
      period_no: i + 1,
      due_date: inst.due_date ? String(inst.due_date).slice(0, 10) : null,
      opening_balance: null,
      interest: allocation === "interest" ? amount : 0,
      principal: allocation === "principal" ? amount : 0,
      vat: 0,
      commissions: 0,
      insurance: 0,
      fees: allocation === "fees" ? amount : 0,
      total_payment: amount,
      closing_balance: null,
    });
  });
}

/**
 * Bridges a `lease_schedule` extraction into the existing financing schedule
 * import mechanism. It reuses stageScheduleImport / commitScheduleImport
 * exactly as the CSV/XLSX flow does — nothing reaches the live schedule until
 * the person stages and then confirms.
 */
export function LeaseScheduleImportDialog({
  open,
  onOpenChange,
  companyId,
  propertyId,
  currency,
  installments,
  sourceLabel,
}: Props) {
  const queryClient = useQueryClient();
  const stage = useServerFn(stageScheduleImport);
  const commit = useServerFn(commitScheduleImport);

  const today = new Date().toISOString().slice(0, 10);
  const [allocation, setAllocation] = useState<Allocation>("principal");
  const [agreementId, setAgreementId] = useState<string>("");
  const [importId, setImportId] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    effectiveFrom: today,
    reason: "origination",
    notes: `Imported from document extraction: ${sourceLabel}`,
  });
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    toReviewRows(installments, "principal"),
  );

  const agreements = useQuery({
    queryKey: ["financing-agreements-picker", companyId, propertyId ?? "all"],
    enabled: open && Boolean(companyId),
    queryFn: async () => {
      let q = supabase
        .from("financing_agreements")
        .select("id, code, lender, reference, currency, property_id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (propertyId) q = q.eq("property_id", propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  function changeAllocation(next: Allocation) {
    setAllocation(next);
    setRows(toReviewRows(installments, next));
  }

  const included = rows.filter((r) => r.include);
  const blocking = included.filter((r) => r.issues.length > 0).length;
  const total = useMemo(
    () => included.reduce((acc, r) => acc + (r.total_payment ?? 0), 0),
    [included],
  );

  const stageMutation = useMutation({
    mutationFn: async () => {
      if (!agreementId) throw new Error("Choose a financing agreement first");
      return (await stage({
        data: {
          agreementId,
          source: "manual" as const,
          fileName: sourceLabel,
          effectiveFrom: meta.effectiveFrom,
          reason: meta.reason,
          notes: meta.notes || undefined,
          rows: included.map(({ issues: _i, include: _inc, ...r }) => r),
        },
      })) as { importId: string };
    },
    onSuccess: (res) => {
      setImportId(res.importId);
      toast.success("Import staged for confirmation");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!importId) throw new Error("Stage the import first");
      return commit({ data: { importId } });
    },
    onSuccess: () => {
      for (const key of [
        "financing-schedule",
        "financing-versions",
        "financing-imports",
        "financing-cash-flow",
        "financing-agreement",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key, agreementId] });
      }
      toast.success("Schedule version committed");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import instalments to financing schedule</DialogTitle>
          <DialogDescription>
            These rows came from the extraction and are still editable. They only reach the live
            schedule once you stage and confirm; a new version replaces only future, unreconciled
            instalments from the effective date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm">Financing agreement</Label>
            <Select value={agreementId} onValueChange={setAgreementId} disabled={Boolean(importId)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agreement" />
              </SelectTrigger>
              <SelectContent>
                {(agreements.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {[a.code, a.lender, a.reference].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agreements.data && agreements.data.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                No financing agreements found for this company.
              </p>
            ) : null}
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Amounts count as</Label>
            <Select
              value={allocation}
              onValueChange={(v) => changeAllocation(v as Allocation)}
              disabled={Boolean(importId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">Principal / capital</SelectItem>
                <SelectItem value="interest">Interest</SelectItem>
                <SelectItem value="fees">Fees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Effective from</Label>
            <Input
              type="date"
              value={meta.effectiveFrom}
              onChange={(e) => setMeta((m) => ({ ...m, effectiveFrom: e.target.value }))}
              disabled={Boolean(importId)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Reason</Label>
            <Select
              value={meta.reason}
              onValueChange={(v) => setMeta((m) => ({ ...m, reason: v }))}
              disabled={Boolean(importId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVISION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-sm">Notes</Label>
            <Textarea
              rows={1}
              value={meta.notes}
              onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
              disabled={Boolean(importId)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <Badge variant="secondary">{included.length} instalments</Badge>
          <span className="font-medium">Total {formatMoneyPrecise(total, currency)}</span>
          {blocking ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="size-4" /> {blocking} row(s) with issues
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="size-4" /> All rows valid
            </span>
          )}
        </div>

        <div className="max-h-[40vh] overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>#</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.line_no} className={r.issues.length ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={r.include}
                      disabled={Boolean(importId)}
                      onCheckedChange={(v) =>
                        setRows((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, include: Boolean(v) } : p)),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{r.period_no}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="h-8 w-40"
                      value={r.due_date ?? ""}
                      disabled={Boolean(importId)}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...reviewRow({ ...p, due_date: e.target.value || null }), include: p.include }
                              : p,
                          ),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-32 text-right"
                      value={r.total_payment ?? 0}
                      disabled={Boolean(importId)}
                      onChange={(e) => {
                        const amount = Number(e.target.value) || 0;
                        setRows((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...reviewRow({
                                    ...p,
                                    principal: allocation === "principal" ? amount : 0,
                                    interest: allocation === "interest" ? amount : 0,
                                    fees: allocation === "fees" ? amount : 0,
                                    total_payment: amount,
                                  }),
                                  include: p.include,
                                }
                              : p,
                          ),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-destructive">{r.issues.join("; ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {importId ? (
            <Button onClick={() => commitMutation.mutate()} disabled={commitMutation.isPending}>
              Confirm and commit
            </Button>
          ) : (
            <Button
              onClick={() => stageMutation.mutate()}
              disabled={
                stageMutation.isPending || blocking > 0 || !included.length || !agreementId
              }
            >
              Stage for confirmation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
