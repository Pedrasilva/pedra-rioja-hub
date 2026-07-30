/**
 * Add payable documents to a draft payment run.
 *
 * Only posted supplier invoices with something outstanding can be selected.
 * The amount stays on the invoice; the run only records the intent to pay it.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { formatDate, formatMoneyPrecise } from "@/lib/format";
import {
  useCounterpartyNames,
  usePayableDocuments,
  type PaymentInstructionDetail,
} from "@/modules/payments/queries";
import { PAYMENT_METHODS } from "@/modules/payments/schemas";
import type { PaymentActions } from "@/modules/payments/server";

export function InstructionPicker({
  companyId,
  runId,
  actions,
  instructions,
  disabled,
}: {
  companyId: string | undefined;
  runId: string;
  actions: PaymentActions;
  instructions: PaymentInstructionDetail[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("transfer");
  const [selected, setSelected] = useState<string[]>([]);
  const { data: documents = [] } = usePayableDocuments(companyId);
  const { data: counterparties = [] } = useCounterpartyNames(companyId);

  const names = useMemo(
    () => new Map(counterparties.map((c) => [c.id, c.name])),
    [counterparties],
  );
  const alreadyIn = useMemo(
    () => new Set(instructions.filter((i) => i.status !== "cancelled").map((i) => i.document_id)),
    [instructions],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => !alreadyIn.has(d.id))
      .filter((d) => {
        if (!q) return true;
        return [d.document_number, names.get(d.counterparty_id ?? "")].some((v) =>
          (v ?? "").toLowerCase().includes(q),
        );
      });
  }, [documents, alreadyIn, search, names]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    for (const documentId of selected) {
      await actions.run("addInstruction", { runId, documentId, paymentMethod: method });
    }
    setSelected([]);
    setOpen(false);
  };

  const total = visible
    .filter((d) => selected.includes(d.id))
    .reduce((sum, d) => sum + Number(d.outstanding_amount ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="size-4" /> Add invoices
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add payable invoices</DialogTitle>
          <DialogDescription>
            Posted supplier invoices with an outstanding balance. Amounts stay with the invoice —
            the run records only which of them to settle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            className="h-9 w-56"
            aria-label="Search payable invoices"
          />
          <div className="grid gap-1">
            <Label className="text-xs">Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payable invoices are waiting to be scheduled.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(d.id)}
                        onCheckedChange={() => toggle(d.id)}
                        aria-label={`Select invoice ${d.document_number ?? d.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{d.document_number ?? "—"}</TableCell>
                    <TableCell>{names.get(d.counterparty_id ?? "") ?? "—"}</TableCell>
                    <TableCell>{formatDate(d.due_date)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoneyPrecise(d.outstanding_amount, d.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="items-center justify-between gap-4 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.length} selected · {formatMoneyPrecise(total)}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={selected.length === 0 || actions.isPending}>
              Add to run
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
