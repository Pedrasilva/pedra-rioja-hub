import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CopyCheck, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

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
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import {
  buildStatementRows,
  parseDelimited,
  type StatementReviewRow,
} from "@/modules/banking/schemas";
import {
  commitStatementImport,
  discardStatementImport,
  setStatementRowInclusion,
  stageStatementImport,
} from "@/modules/banking/banking.functions";
import { useImportRows } from "@/modules/banking/queries";


type Account = { id: string; name: string; currency: string };

/**
 * Review → stage → confirm. Nothing reaches the bank ledger until the
 * reviewer presses "Confirm import"; the commit itself is atomic.
 */
export function StatementImportDialog({
  accounts,
  defaultAccountId,
  disabled,
}: {
  accounts: Account[];
  defaultAccountId?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? "");
  const [source, setSource] = useState<"csv" | "xlsx">("csv");
  const [fileName, setFileName] = useState<string>();
  const [rows, setRows] = useState<StatementReviewRow[]>([]);
  const [staged, setStaged] = useState<{ importId: string; rows: StatementReviewRow[] } | null>(
    null,
  );
  const [meta, setMeta] = useState({ opening: "", closing: "", notes: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const stage = useServerFn(stageStatementImport);
  const commit = useServerFn(commitStatementImport);
  const discard = useServerFn(discardStatementImport);

  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? "EUR";
  // Once staged, the database rows are the truth: inclusion toggles are
  // persisted so the atomic commit imports exactly what the reviewer sees.
  const stagedRows = useImportRows(staged?.importId ?? null);
  const working: (StatementReviewRow & { id?: string })[] = staged
    ? (stagedRows.data ?? []).map((r) => ({
        id: r.id,
        line_no: r.line_no,
        transaction_date: r.transaction_date,
        value_date: r.value_date,
        description: r.description,
        bank_reference: r.bank_reference,
        counterparty_name: r.counterparty_name,
        counterparty_account: r.counterparty_account,
        debit_amount: Number(r.debit_amount ?? 0),
        credit_amount: Number(r.credit_amount ?? 0),
        amount: Number(r.amount ?? 0),
        running_balance: r.running_balance === null ? null : Number(r.running_balance),
        source_row_id: r.source_row_id,
        fingerprint: r.fingerprint ?? "",
        issues: (r.issues as string[] | null) ?? [],
        include: Boolean(r.include),
        is_duplicate: Boolean(r.is_duplicate),
      }))
    : rows;

  const included = working.filter((r) => r.include);

  function reset() {
    setStep("input");
    setRows([]);
    setStaged(null);
    setFileName(undefined);
    setMeta({ opening: "", closing: "", notes: "" });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File) {
    try {
      let table: unknown[][];
      if (/\.csv$|\.txt$/i.test(file.name)) {
        table = parseDelimited(await file.text());
        setSource("csv");
      } else {
        const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
        setSource("xlsx");
      }
      const parsed = buildStatementRows(table);
      if (!parsed.length) throw new Error("No statement lines were recognised in this file");
      setRows(parsed);
      setFileName(file.name);
      setStep("review");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const stageMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Choose a bank account");
      return stage({
        data: {
          bankAccountId: accountId,
          source,
          fileName,
          statementOpeningBalance: meta.opening ? Number(meta.opening) : undefined,
          statementClosingBalance: meta.closing ? Number(meta.closing) : undefined,
          notes: meta.notes || undefined,
          rows: rows.map(({ issues: _i, include: _in, fingerprint: _f, is_duplicate: _d, ...r }) => r),
        },
      });
    },
    onSuccess: (r) => {
      setStaged({ importId: r.importId, rows: r.rows as StatementReviewRow[] });
      toast.success(
        `${r.rowCount} line(s) staged${r.duplicateCount ? `, ${r.duplicateCount} suspected duplicate(s)` : ""}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!staged) throw new Error("Stage the statement first");
      return commit({ data: { importId: staged.importId } });
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["bank-statement-imports"] });
      toast.success(`${r.imported} transaction(s) imported${r.skipped ? `, ${r.skipped} skipped` : ""}`);
      setOpen(false);
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setInclusion = useServerFn(setStatementRowInclusion);

  async function toggle(row: StatementReviewRow & { id?: string }, value: boolean) {
    if (row.id) {
      try {
        await setInclusion({ data: { rowId: row.id, include: value } });
        await stagedRows.refetch();
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    setRows(rows.map((r) => (r.line_no === row.line_no ? { ...r, include: value } : r)));
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          if (staged) discard({ data: { importId: staged.importId } }).catch(() => undefined);
          reset();
        }
      }}
    >
      <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Import statement
      </Button>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import a bank statement</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX export, review every line, then confirm. Duplicates of movements
            already in this account are flagged and excluded unless you re-include them.
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Bank account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Statement opening balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={meta.opening}
                  onChange={(e) => setMeta({ ...meta, opening: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Statement closing balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={meta.closing}
                  onChange={(e) => setMeta({ ...meta, closing: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={meta.notes}
                onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Statement file</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Date, description, reference, counterparty, debit/credit or signed amount and
                running balance columns are detected automatically (English and Portuguese).
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{working.length} lines</Badge>
              <Badge variant="secondary">{included.length} to import</Badge>
              {working.some((r) => r.is_duplicate) && (
                <Badge className="bg-amber-100 text-amber-900">
                  <CopyCheck className="mr-1 h-3 w-3" />
                  {working.filter((r) => r.is_duplicate).length} suspected duplicates
                </Badge>
              )}
              {working.some((r) => r.issues.length) && (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {working.filter((r) => r.issues.length).length} with issues
                </Badge>
              )}
              <span className="ml-auto text-muted-foreground">
                Net {formatMoneyPrecise(included.reduce((s, r) => s + r.amount, 0), currency)}
              </span>
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {working.map((r) => (
                    <TableRow key={r.line_no} className={r.issues.length ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={r.include}
                          disabled={r.issues.length > 0}
                          onCheckedChange={(v) => void toggle(r, Boolean(v))}
                        />
                      </TableCell>
                      <TableCell>{formatDate(r.transaction_date)}</TableCell>
                      <TableCell className="max-w-[22rem] truncate">{r.description ?? "—"}</TableCell>
                      <TableCell className="max-w-[12rem] truncate">
                        {r.counterparty_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoneyPrecise(r.amount, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.running_balance == null
                          ? "—"
                          : formatMoneyPrecise(r.running_balance, currency)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.issues.length
                          ? r.issues.join("; ")
                          : r.is_duplicate
                            ? "Already in this account"
                            : "Ready"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "review" && (
            <Button variant="ghost" onClick={reset}>
              Back
            </Button>
          )}
          {step === "review" && !staged && (
            <Button onClick={() => stageMutation.mutate()} disabled={stageMutation.isPending}>
              Stage for confirmation
            </Button>
          )}
          {staged && (
            <Button
              onClick={() => commitMutation.mutate()}
              disabled={commitMutation.isPending || !included.length}
            >
              Confirm import ({included.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
