import { useMemo, useState } from "react";
import { Plus, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import { useUpsertBankRule } from "../mutations";
import type { BookkeepingCapabilities } from "../permissions";
import {
  useBankClassificationRules,
  useBookkeepingProperties,
  useClassifications,
  useCounterparties,
  useRulePreviewTransactions,
} from "../queries";
import { classificationLabel, OptionSelect } from "./selectors";

const MATCH_FIELDS = ["description", "counterparty_name", "counterparty_account", "bank_reference"] as const;
const MATCH_TYPES = ["contains", "equals", "starts_with", "regex"] as const;

type Draft = {
  name: string;
  priority: string;
  matchField: (typeof MATCH_FIELDS)[number];
  matchType: (typeof MATCH_TYPES)[number];
  matchValue: string;
  direction: "inflow" | "outflow" | null;
  minAmount: string;
  maxAmount: string;
  classificationId: string | null;
  counterpartyId: string | null;
  propertyId: string | null;
  isInternalTransfer: boolean;
};

const emptyDraft: Draft = {
  name: "",
  priority: "100",
  matchField: "description",
  matchType: "contains",
  matchValue: "",
  direction: null,
  minAmount: "",
  maxAmount: "",
  classificationId: null,
  counterpartyId: null,
  propertyId: null,
  isInternalTransfer: false,
};

function matches(draft: Draft, tx: { description: string | null; counterparty_name: string | null; amount: number }) {
  const field =
    draft.matchField === "counterparty_name" ? (tx.counterparty_name ?? "") : (tx.description ?? "");
  const needle = draft.matchValue.trim();
  if (!needle) return false;
  const hay = field.toLowerCase();
  const n = needle.toLowerCase();
  let ok = false;
  if (draft.matchType === "contains") ok = hay.includes(n);
  else if (draft.matchType === "equals") ok = hay === n;
  else if (draft.matchType === "starts_with") ok = hay.startsWith(n);
  else {
    try {
      ok = new RegExp(needle, "i").test(field);
    } catch {
      ok = false;
    }
  }
  if (!ok) return false;
  if (draft.direction === "inflow" && tx.amount <= 0) return false;
  if (draft.direction === "outflow" && tx.amount >= 0) return false;
  const abs = Math.abs(tx.amount);
  if (draft.minAmount && abs < Number(draft.minAmount)) return false;
  if (draft.maxAmount && abs > Number(draft.maxAmount)) return false;
  return true;
}

/**
 * Rules only ever suggest. Nothing here classifies or reconciles a bank
 * transaction automatically — the preview is a read-only dry run.
 */
export function BankRulesPanel({
  companyId,
  capabilities,
}: {
  companyId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const { data: rules } = useBankClassificationRules(companyId);
  const { data: classifications } = useClassifications(companyId);
  const { data: counterparties } = useCounterparties(companyId);
  const { data: properties } = useBookkeepingProperties(companyId);
  const { data: transactions } = useRulePreviewTransactions(companyId);
  const upsert = useUpsertBankRule();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const preview = useMemo(
    () =>
      (transactions ?? [])
        .map((t) => ({ ...t, amount: Number(t.amount) }))
        .filter((t) => matches(draft, t))
        .slice(0, 10),
    [transactions, draft],
  );

  const clOptions = (classifications ?? []).map((c) => ({
    value: c.id,
    label: classificationLabel(c),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Rules produce suggestions for the Banking workspace. They never classify or reconcile on
          their own.
        </p>
        {capabilities.canManageRules ? (
          <Button
            onClick={() => {
              setDraft(emptyDraft);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> New rule
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Suggests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No classification rules yet.
                  </TableCell>
                </TableRow>
              ) : (
                rules!.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs">
                      {titleCase(r.match_field)} {r.match_type.replace("_", " ")} “{r.match_value}”
                    </TableCell>
                    <TableCell>{r.direction ? titleCase(r.direction) : "Any"}</TableCell>
                    <TableCell>
                      {r.is_internal_transfer ? (
                        <Badge variant="secondary">Internal transfer</Badge>
                      ) : (
                        classificationLabel(
                          (classifications ?? []).find((c) => c.id === r.classification_id) ?? {
                            code: "—",
                            name_en: "Unclassified",
                            company_id: null,
                          },
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New classification rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                inputMode="numeric"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              />
            </div>
            <div>
              <Label>Field</Label>
              <OptionSelect
                aria-label="Match field"
                allowNone={false}
                value={draft.matchField}
                onChange={(v) => setDraft({ ...draft, matchField: v as Draft["matchField"] })}
                options={MATCH_FIELDS.map((f) => ({ value: f, label: titleCase(f) }))}
              />
            </div>
            <div>
              <Label>Match type</Label>
              <OptionSelect
                aria-label="Match type"
                allowNone={false}
                value={draft.matchType}
                onChange={(v) => setDraft({ ...draft, matchType: v as Draft["matchType"] })}
                options={MATCH_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
              />
            </div>
            <div>
              <Label htmlFor="rule-value">Value</Label>
              <Input
                id="rule-value"
                value={draft.matchValue}
                onChange={(e) => setDraft({ ...draft, matchValue: e.target.value })}
              />
            </div>
            <div>
              <Label>Direction</Label>
              <OptionSelect
                aria-label="Rule direction"
                value={draft.direction}
                onChange={(v) => setDraft({ ...draft, direction: v as Draft["direction"] })}
                noneLabel="Any"
                options={[
                  { value: "inflow", label: "Inflow" },
                  { value: "outflow", label: "Outflow" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="rule-min">Min amount</Label>
              <Input
                id="rule-min"
                inputMode="decimal"
                value={draft.minAmount}
                onChange={(e) => setDraft({ ...draft, minAmount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="rule-max">Max amount</Label>
              <Input
                id="rule-max"
                inputMode="decimal"
                value={draft.maxAmount}
                onChange={(e) => setDraft({ ...draft, maxAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Classification</Label>
              <OptionSelect
                aria-label="Rule classification"
                value={draft.classificationId}
                onChange={(v) => setDraft({ ...draft, classificationId: v })}
                options={clOptions}
              />
            </div>
            <div>
              <Label>Counterparty</Label>
              <OptionSelect
                aria-label="Rule counterparty"
                value={draft.counterpartyId}
                onChange={(v) => setDraft({ ...draft, counterpartyId: v })}
                options={(counterparties ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <Label>Property</Label>
              <OptionSelect
                aria-label="Rule property"
                value={draft.propertyId}
                onChange={(v) => setDraft({ ...draft, propertyId: v })}
                options={(properties ?? []).map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <Checkbox
                checked={draft.isInternalTransfer}
                onCheckedChange={(v) => setDraft({ ...draft, isInternalTransfer: v === true })}
              />
              Internal transfer
            </label>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="size-4" /> Dry run — {preview.length} of the last 50 transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No recent transactions match yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    preview.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDate(t.transaction_date)}</TableCell>
                        <TableCell>{t.description ?? t.counterparty_name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(t.amount, t.currency ?? "EUR")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draft.name.trim() || !draft.matchValue.trim() || upsert.isPending}
              onClick={() =>
                upsert.mutate(
                  {
                    companyId,
                    name: draft.name.trim(),
                    priority: Number(draft.priority) || 100,
                    matchField: draft.matchField,
                    matchType: draft.matchType,
                    matchValue: draft.matchValue.trim(),
                    direction: draft.direction,
                    minAmount: draft.minAmount ? Number(draft.minAmount) : null,
                    maxAmount: draft.maxAmount ? Number(draft.maxAmount) : null,
                    classificationId: draft.classificationId,
                    counterpartyId: draft.counterpartyId,
                    propertyId: draft.propertyId,
                    projectId: null,
                    bankAccountId: null,
                    cashFlowCategory: null,
                    isInternalTransfer: draft.isInternalTransfer,
                    notes: null,
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Save rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
