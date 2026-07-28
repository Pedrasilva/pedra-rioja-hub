import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { titleCase } from "@/lib/format";
import { useCreateClassification } from "../mutations";
import type { BookkeepingCapabilities } from "../capabilities";
import { useClassifications} from "../queries";
import type { Classification as ClassificationRow } from "../types";
import { classificationLabel, OptionSelect } from "./selectors";

const NATURES = ["income", "expense", "asset", "liability", "equity", "transfer"] as const;

/** Extractable core — the classification tree is company data, not code. */
export function ClassificationsPanel({
  companyId,
  capabilities,
}: {
  companyId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const { data: classifications } = useClassifications(companyId);
  const create = useCreateClassification();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    code: "",
    nameEn: "",
    namePt: "",
    nature: "expense",
    parentId: null as string | null,
    defaultVatRate: "23",
    cashFlowCategory: "",
    vatRecoverable: true,
  });

  const rows = classifications ?? [];
  const byParent = new Map<string | null, ClassificationRow[]>();
  for (const c of rows) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }

  const ordered: { row: ClassificationRow; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      ordered.push({ row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Shared defaults are read-only; company-specific entries can be added below.
        </p>
        {capabilities.canManageClassifications ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New classification
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>Cash-flow category</TableHead>
                <TableHead>Default VAT</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map(({ row, depth }) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell style={{ paddingLeft: `${12 + depth * 18}px` }}>
                    {row.name_en}
                    {row.name_pt ? (
                      <span className="block text-xs text-muted-foreground">{row.name_pt}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{titleCase(row.nature)}</TableCell>
                  <TableCell>{titleCase(row.cash_flow_category, "—")}</TableCell>
                  <TableCell>
                    {row.default_vat_rate === null ? "—" : `${Number(row.default_vat_rate)}%`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.company_id ? "secondary" : "outline"}>
                      {row.company_id ? "Company" : "Shared"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New classification</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cl-code">Code</Label>
              <Input
                id="cl-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cl-name">Name (EN)</Label>
              <Input
                id="cl-name"
                value={draft.nameEn}
                onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cl-name-pt">Name (PT)</Label>
              <Input
                id="cl-name-pt"
                value={draft.namePt}
                onChange={(e) => setDraft({ ...draft, namePt: e.target.value })}
              />
            </div>
            <div>
              <Label>Nature</Label>
              <OptionSelect
                aria-label="Nature"
                allowNone={false}
                value={draft.nature}
                onChange={(v) => setDraft({ ...draft, nature: v ?? "expense" })}
                options={NATURES.map((n) => ({ value: n, label: titleCase(n) }))}
              />
            </div>
            <div>
              <Label>Parent</Label>
              <OptionSelect
                aria-label="Parent classification"
                value={draft.parentId}
                onChange={(v) => setDraft({ ...draft, parentId: v })}
                noneLabel="Top level"
                options={rows.map((c) => ({ value: c.id, label: classificationLabel(c) }))}
              />
            </div>
            <div>
              <Label htmlFor="cl-vat">Default VAT rate %</Label>
              <Input
                id="cl-vat"
                inputMode="decimal"
                value={draft.defaultVatRate}
                onChange={(e) => setDraft({ ...draft, defaultVatRate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cl-cash">Cash-flow category</Label>
              <Input
                id="cl-cash"
                value={draft.cashFlowCategory}
                onChange={(e) => setDraft({ ...draft, cashFlowCategory: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <Checkbox
                checked={draft.vatRecoverable}
                onCheckedChange={(v) => setDraft({ ...draft, vatRecoverable: v === true })}
              />
              VAT recoverable
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!draft.code.trim() || !draft.nameEn.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    companyId,
                    code: draft.code.trim(),
                    nameEn: draft.nameEn.trim(),
                    namePt: draft.namePt.trim() || null,
                    nature: draft.nature as "expense",
                    parentId: draft.parentId,
                    level: draft.parentId ? 2 : 1,
                    defaultVatRate: Number(draft.defaultVatRate) || 0,
                    vatRecoverable: draft.vatRecoverable,
                    cashFlowCategory: draft.cashFlowCategory.trim() || null,
                    affectsCashFlow: true,
                    affectsProfit: true,
                    counterpartyRequired: false,
                    sortOrder: 100,
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
