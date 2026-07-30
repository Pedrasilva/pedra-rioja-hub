/**
 * Phase 8D — budget register.
 *
 * Shows one row per budget (its most relevant version) with planned figures
 * and the derived committed / invoiced / paid consumption. Money columns are
 * read-only by construction: they come from the derived view.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatMoneyPrecise, titleCase } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import { usePropertyOptions } from "@/modules/operations/queries";
import type { BudgetVersionSummary } from "@/modules/budgets/queries";
import type { BudgetActions } from "@/modules/budgets/server";

const NONE = "__none__";
const PAGE_SIZE = 25;

/** Keeps the row that best represents a budget: current, else latest. */
export function currentVersions(rows: BudgetVersionSummary[]) {
  const byBudget = new Map<string, BudgetVersionSummary>();
  for (const row of rows) {
    const existing = byBudget.get(row.budget_id);
    if (!existing) {
      byBudget.set(row.budget_id, row);
      continue;
    }
    const better =
      (row.is_current && !existing.is_current) ||
      (row.is_current === existing.is_current && row.version_no > existing.version_no);
    if (better) byBudget.set(row.budget_id, row);
  }
  return [...byBudget.values()];
}

export function BudgetRegister({
  companyId,
  rows,
  capabilities,
  actions,
  isLoading,
}: {
  companyId: string | undefined;
  rows: BudgetVersionSummary[];
  capabilities: CommitmentCapabilities;
  actions: BudgetActions;
  isLoading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const { data: properties = [] } = usePropertyOptions(companyId);

  const [form, setForm] = useState({
    name: "",
    fiscalYear: String(new Date().getFullYear()),
    currency: "EUR",
    code: "",
    propertyId: NONE,
    notes: "",
  });

  const budgets = useMemo(() => currentVersions(rows), [rows]);
  const years = useMemo(
    () => [...new Set(budgets.map((b) => String(b.fiscal_year)))].sort().reverse(),
    [budgets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return budgets.filter((b) => {
      if (year !== "all" && String(b.fiscal_year) !== year) return false;
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      return [b.name, b.code, b.property_name].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [budgets, query, year, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const submit = async () => {
    if (!companyId) return;
    await actions.run("createBudget", {
      companyId,
      name: form.name,
      fiscalYear: form.fiscalYear,
      currency: form.currency || "EUR",
      code: form.code || undefined,
      propertyId: form.propertyId === NONE ? undefined : form.propertyId,
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm({ ...form, name: "", code: "", notes: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Budgets</CardTitle>
          <CardDescription>
            Plans only. Committed, invoiced and paid are derived from commitments — a budget never
            creates an obligation, cash flow or bookkeeping entry.
          </CardDescription>
        </div>
        {capabilities.canRecord ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New budget</DialogTitle>
                <DialogDescription>
                  Creates the budget and its first draft version. Planned values are added as lines.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="budget-name">Name</Label>
                  <Input
                    id="budget-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget-year">Fiscal year</Label>
                  <Input
                    id="budget-year"
                    type="number"
                    value={form.fiscalYear}
                    onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget-currency">Currency</Label>
                  <Input
                    id="budget-currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget-code">Code</Label>
                  <Input
                    id="budget-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Property</Label>
                  <Select
                    value={form.propertyId}
                    onValueChange={(v) => setForm({ ...form, propertyId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Portfolio-wide" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Portfolio-wide</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="budget-notes">Notes</Label>
                  <Textarea
                    id="budget-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={form.name.trim().length < 2 || actions.isPending}>
                  Create budget
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search budgets"
              className="pl-8"
              placeholder="Search by name, code or property"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select
            value={year}
            onValueChange={(v) => {
              setYear(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Fiscal year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Version status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["draft", "pending_approval", "published", "superseded", "archived"].map((s) => (
                <SelectItem key={s} value={s}>
                  {titleCase(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Budget</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Invoiced</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading budgets…</TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No budgets match these filters.</TableCell>
              </TableRow>
            ) : (
              visible.map((b) => (
                <TableRow key={b.budget_id}>
                  <TableCell>
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      to="/budgets/$budgetId"
                      params={{ budgetId: b.budget_id }}
                    >
                      {b.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {b.property_name ?? "Portfolio-wide"}
                    </div>
                  </TableCell>
                  <TableCell>{b.fiscal_year}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "published" ? "default" : "secondary"}>
                      v{b.version_no} · {titleCase(b.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(b.planned_amount, b.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(b.committed_amount, b.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(b.invoiced_amount, b.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(b.paid_amount, b.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(b.variance_amount, b.currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pageCount > 1 ? (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
