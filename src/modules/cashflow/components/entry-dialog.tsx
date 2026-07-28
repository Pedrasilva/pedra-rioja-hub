import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
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
} from "@/modules/cashflow/schemas";
import { createCashFlowEntry } from "@/modules/cashflow/cashflow.functions";
import { useCashFlowFilterOptions, useScenarios } from "@/modules/cashflow/queries";

const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);

/** Manual, one-off scenario items only — never a place to re-type module data. */
export function NewCashFlowItemDialog() {
  const [open, setOpen] = useState(false);
  const { data: workspace } = useWorkspace();
  const companyId = workspace?.company?.id;
  const { data: options } = useCashFlowFilterOptions(companyId);
  const { data: scenarios } = useScenarios(companyId);
  const queryClient = useQueryClient();
  const create = useServerFn(createCashFlowEntry);

  const [form, setForm] = useState({
    description: "",
    category: "other",
    direction: "outflow",
    state: "forecast",
    propertyId: "",
    projectId: "",
    counterpartyType: "",
    counterpartyName: "",
    amountNet: "",
    vat: "",
    expectedDate: new Date().toISOString().slice(0, 10),
    confidence: "medium",
    scenarioCode: "",
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company in this workspace");
      if (!form.description.trim()) throw new Error("Description is required");
      return create({
        data: {
          companyId,
          description: form.description.trim(),
          category: form.category,
          direction: form.direction as "inflow" | "outflow",
          state: form.state as "committed" | "forecast",
          propertyId: form.propertyId || null,
          projectId: form.projectId || null,
          counterpartyType: form.counterpartyType || undefined,
          counterpartyName: form.counterpartyName || undefined,
          currency: workspace?.company?.base_currency ?? "EUR",
          amountNet: num(form.amountNet),
          vat: num(form.vat),
          expectedDate: form.expectedDate,
          confidence: form.confidence as "confirmed" | "high" | "medium" | "low",
          scenarioCode: form.scenarioCode || null,
          notes: form.notes || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-flow-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-entries"] });
      setOpen(false);
      toast.success("Cash-flow item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gross = num(form.amountNet) + num(form.vat);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Manual item
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New manual cash-flow item</DialogTitle>
            <DialogDescription>
              For one-off future items and scenario assumptions. Financing instalments, leases,
              invoices and project commitments arrive automatically from their own modules.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label className="mb-1.5 block text-sm">Description</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
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
            <Field label="Net amount">
              <Input value={form.amountNet} onChange={(e) => set("amountNet", e.target.value)} />
            </Field>
            <Field label="VAT amount">
              <Input value={form.vat} onChange={(e) => set("vat", e.target.value)} />
            </Field>
            <Field label="Gross amount">
              <Input value={gross ? gross.toFixed(2) : "0.00"} readOnly disabled />
            </Field>
            <Field label="Expected date">
              <Input
                type="date"
                value={form.expectedDate}
                onChange={(e) => set("expectedDate", e.target.value)}
              />
            </Field>
            <Field label="Confidence">
              <Picker
                value={form.confidence}
                onChange={(v) => set("confidence", v)}
                options={CONFIDENCE_LEVELS}
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
              Add item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

export function Picker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
