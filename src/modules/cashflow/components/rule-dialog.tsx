import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Repeat, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  CASH_FLOW_CATEGORIES,
  CASH_FLOW_DIRECTIONS,
  CONFIDENCE_LEVELS,
  COUNTERPARTY_TYPES,
  MANUAL_STATES,
  RECURRENCE_FREQUENCIES,
} from "@/modules/cashflow/schemas";
import { createRecurringRule, generateOccurrences } from "@/modules/cashflow/cashflow.functions";
import { useCashFlowFilterOptions, useScenarios } from "@/modules/cashflow/queries";
import { Field, Picker } from "@/modules/cashflow/components/entry-dialog";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);

/** Recurring obligations are rules, not copied rows. */
export function NewRecurringRuleDialog({ horizonThrough }: { horizonThrough: string }) {
  const [open, setOpen] = useState(false);
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const { data: options } = useCashFlowFilterOptions(companyId);
  const { data: scenarios } = useScenarios(companyId);
  const queryClient = useQueryClient();
  const create = useServerFn(createRecurringRule);
  const generate = useServerFn(generateOccurrences);

  const [form, setForm] = useState({
    name: "",
    category: "other",
    direction: "outflow",
    state: "committed",
    frequency: "monthly",
    intervalCount: "1",
    amountNet: "",
    vat: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    maxOccurrences: "",
    confidence: "high",
    scenarioCode: "",
    propertyId: "",
    projectId: "",
    counterpartyType: "",
    counterpartyName: "",
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company in this workspace");
      if (!form.name.trim()) throw new Error("Name is required");
      const rule = await create({
        data: {
          companyId,
          name: form.name.trim(),
          category: form.category,
          direction: form.direction as "inflow" | "outflow",
          state: form.state as "committed" | "forecast",
          frequency: form.frequency as
            | "weekly"
            | "monthly"
            | "quarterly"
            | "semiannual"
            | "annual"
            | "custom",
          intervalCount: Math.max(1, Number(form.intervalCount) || 1),
          currency: workspace?.company?.base_currency ?? "EUR",
          amountNet: num(form.amountNet),
          vat: num(form.vat),
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          maxOccurrences: form.maxOccurrences ? Number(form.maxOccurrences) : undefined,
          confidence: form.confidence as "confirmed" | "high" | "medium" | "low",
          scenarioCode: form.scenarioCode || null,
          propertyId: form.propertyId || null,
          projectId: form.projectId || null,
          counterpartyType: form.counterpartyType || undefined,
          counterpartyName: form.counterpartyName || undefined,
          isActive: true,
          notes: form.notes || undefined,
        },
      });
      await generate({ data: { companyId, ruleId: rule.id, through: horizonThrough } });
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow-rules"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-entries"] });
      setOpen(false);
      toast.success("Recurring rule created and projected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Recurring rule
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Repeat className="size-4" /> New recurring obligation
            </DialogTitle>
            <DialogDescription>
              One reusable rule. Occurrences are generated over the selected horizon and can be
              regenerated at any time without creating duplicates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label className="mb-1.5 block text-sm">Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <Field label="Direction">
              <Picker
                value={form.direction}
                onChange={(v) => set("direction", v)}
                options={CASH_FLOW_DIRECTIONS}
              />
            </Field>
            <Field label="Category">
              <Picker
                value={form.category}
                onChange={(v) => set("category", v)}
                options={CASH_FLOW_CATEGORIES}
              />
            </Field>
            <Field label="Status">
              <Picker value={form.state} onChange={(v) => set("state", v)} options={MANUAL_STATES} />
            </Field>
            <Field label="Frequency">
              <Picker
                value={form.frequency}
                onChange={(v) => set("frequency", v)}
                options={RECURRENCE_FREQUENCIES}
              />
            </Field>
            <Field label="Every N periods">
              <Input
                value={form.intervalCount}
                onChange={(e) => set("intervalCount", e.target.value)}
              />
            </Field>
            <Field label="Max occurrences">
              <Input
                value={form.maxOccurrences}
                onChange={(e) => set("maxOccurrences", e.target.value)}
              />
            </Field>
            <Field label="Net amount">
              <Input value={form.amountNet} onChange={(e) => set("amountNet", e.target.value)} />
            </Field>
            <Field label="VAT amount">
              <Input value={form.vat} onChange={(e) => set("vat", e.target.value)} />
            </Field>
            <Field label="Confidence">
              <Picker
                value={form.confidence}
                onChange={(v) => set("confidence", v)}
                options={CONFIDENCE_LEVELS}
              />
            </Field>
            <Field label="First date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </Field>
            <Field label="Scenario">
              <Select
                value={form.scenarioCode || "__all"}
                onValueChange={(v) => set("scenarioCode", v === "__all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All scenarios</SelectItem>
                  {(scenarios ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.code}>
                      {s.label} only
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Property">
              <Select
                value={form.propertyId || "__none"}
                onValueChange={(v) => set("propertyId", v === "__none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Company level</SelectItem>
                  {(options?.properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.code, p.name].filter(Boolean).join(" — ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Project">
              <Select
                value={form.projectId || "__none"}
                onValueChange={(v) => set("projectId", v === "__none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {(options?.projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Counterparty type">
              <Select
                value={form.counterpartyType || "__none"}
                onValueChange={(v) => set("counterpartyType", v === "__none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unspecified</SelectItem>
                  {COUNTERPARTY_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Counterparty name">
              <Input
                value={form.counterpartyName}
                onChange={(e) => set("counterpartyName", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-3">
              <Label className="mb-1.5 block text-sm">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Create rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
