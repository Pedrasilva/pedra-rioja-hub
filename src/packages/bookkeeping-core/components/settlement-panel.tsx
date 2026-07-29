import { useState } from "react";
import { RotateCcw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoneyPrecise, titleCase } from "../format";
import { useReversePayment, useSettleDocument } from "../mutations";
import type { BookkeepingCapabilities } from "../capabilities";
import { useFinancialDocument, useEligibleBankTransactions } from "../queries";
import { OptionSelect } from "./selectors";

/**
 * Extractable core — settlement never mutates lines, totals, VAT, withholding
 * or any other source-owned amount. Every change goes through the canonical
 * settle_financial_document / reverse_financial_payment functions.
 */
export function SettlementPanel({
  companyId,
  documentId,
  capabilities,
}: {
  companyId: string;
  documentId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const { data } = useFinancialDocument(documentId);
  const { transactions } = useEligibleBankTransactions(companyId);
  const settle = useSettleDocument();
  const reverse = useReversePayment();

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankTransactionId, setBankTransactionId] = useState<string | null>(null);
  const [method, setMethod] = useState("");
  const [reversalReason, setReversalReason] = useState<Record<string, string>>({});

  const doc = data?.document;
  const payments = data?.payments ?? [];
  if (!doc) return <p className="text-sm text-muted-foreground">Loading settlement…</p>;

  const posted = doc.status === "posted";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Figure label="Document total" value={Number(doc.payable_amount)} />
        <Figure label="Paid" value={Number(doc.paid_amount)} />
        <Figure label="Outstanding" value={Number(doc.outstanding_amount)} />
        <div>
          <p className="text-xs text-muted-foreground">Payment state</p>
          <Badge variant="secondary">{titleCase(doc.payment_state)}</Badge>
        </div>
      </div>

      {capabilities.canRecordPayment && posted ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Record a payment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pay-date">Payment date</Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Bank transaction</Label>
              <OptionSelect
                aria-label="Bank transaction"
                value={bankTransactionId}
                onChange={setBankTransactionId}
                noneLabel="Not linked"
                options={transactions.map((t) => ({
                  value: t.id,
                  label: `${formatDate(t.transaction_date)} · ${formatMoneyPrecise(Number(t.amount))} · ${
                    t.description ?? t.counterparty_name ?? ""
                  }`,
                }))}
              />
            </div>
            <div>
              <Label htmlFor="pay-method">Method</Label>
              <Input
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="transfer"
              />
            </div>
            <div className="sm:col-span-4">
              <Button
                disabled={!amount || settle.isPending}
                onClick={() =>
                  settle.mutate(
                    {
                      documentId,
                      amount: Number(amount),
                      paymentDate,
                      bankTransactionId,
                      method: method || null,
                    },
                    { onSuccess: () => setAmount("") },
                  )
                }
              >
                <ShieldCheck className="size-4" /> Record payment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reconciliation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Reversal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>{formatMoneyPrecise(Number(p.amount))}</TableCell>
                    <TableCell>{p.method ?? "—"}</TableCell>
                    <TableCell>
                      {p.bank_transaction_id ? (
                        <Badge variant="secondary">Bank linked</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "reversed" ? "outline" : "secondary"}>
                        {titleCase(p.status)}
                      </Badge>
                      {p.reversal_reason ? (
                        <p className="mt-1 text-xs text-muted-foreground">{p.reversal_reason}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {capabilities.canReversePayment && p.status !== "reversed" ? (
                        <div className="flex justify-end gap-2">
                          <Input
                            aria-label={`Reversal reason for payment ${p.id}`}
                            className="h-8 w-44"
                            placeholder="Reason (required)"
                            value={reversalReason[p.id] ?? ""}
                            onChange={(e) =>
                              setReversalReason({ ...reversalReason, [p.id]: e.target.value })
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={(reversalReason[p.id] ?? "").trim().length < 3}
                            onClick={() =>
                              reverse.mutate({
                                paymentId: p.id,
                                reason: reversalReason[p.id]!.trim(),
                              })
                            }
                          >
                            <RotateCcw className="size-4" /> Reverse
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Reconciled bank matches are unwound from the Banking workspace — settlement records are
        never deleted here.
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{formatMoneyPrecise(value)}</p>
    </div>
  );
}
