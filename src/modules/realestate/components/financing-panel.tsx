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
  AGREEMENT_STATUSES,
  FINANCING_TYPES,
  RATE_TYPES,
  REPAYMENT_TYPES,
} from "@/modules/realestate/financing-schemas";
import { createFinancingAgreement } from "@/modules/realestate/financing.functions";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export function NewAgreementDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const { data: workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const create = useServerFn(createFinancingAgreement);

  const [form, setForm] = useState({
    type: "mortgage",
    lender: "",
    reference: "",
    principal: "",
    startDate: "",
    endDate: "",
    termMonths: "",
    rateType: "euribor_spread",
    fixedRate: "",
    indexName: "Euribor",
    indexTenor: "6M",
    spread: "",
    repaymentType: "annuity",
    graceMonths: "",
    paymentDay: "",
    status: "active",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!workspace?.company?.id) throw new Error("No company in this workspace");
      if (!form.lender.trim()) throw new Error("Lender is required");
      return create({
        data: {
          companyId: workspace.company.id,
          propertyId,
          type: form.type,
          lender: form.lender.trim(),
          reference: form.reference || undefined,
          principal: Number(form.principal) || 0,
          currency: workspace.company.base_currency ?? "EUR",
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          termMonths: num(form.termMonths),
          rateType: form.rateType,
          fixedRate: num(form.fixedRate),
          indexName: form.rateType === "fixed" ? undefined : form.indexName || undefined,
          indexTenor: form.rateType === "fixed" ? undefined : form.indexTenor || undefined,
          spread: num(form.spread),
          repaymentType: form.repaymentType,
          graceMonths: num(form.graceMonths),
          paymentDay: num(form.paymentDay),
          status: form.status,
          notes: form.notes || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-financing", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      setOpen(false);
      toast.success("Financing agreement created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New agreement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New financing agreement</DialogTitle>
            <DialogDescription>
              Contract terms only. The repayment schedule is added afterwards, from the agreement
              workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <Picker value={form.type} onChange={(v) => set("type", v)} options={FINANCING_TYPES} />
            </Field>
            <Field label="Lender">
              <Input value={form.lender} onChange={(e) => set("lender", e.target.value)} />
            </Field>
            <Field label="Contract reference">
              <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} />
            </Field>
            <Field label="Original principal">
              <Input value={form.principal} onChange={(e) => set("principal", e.target.value)} />
            </Field>
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </Field>
            <Field label="Maturity date">
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </Field>
            <Field label="Term (months)">
              <Input value={form.termMonths} onChange={(e) => set("termMonths", e.target.value)} />
            </Field>
            <Field label="Rate type">
              <Picker value={form.rateType} onChange={(v) => set("rateType", v)} options={RATE_TYPES} />
            </Field>
            {form.rateType === "fixed" ? (
              <Field label="Fixed rate %">
                <Input value={form.fixedRate} onChange={(e) => set("fixedRate", e.target.value)} />
              </Field>
            ) : (
              <>
                <Field label="Reference index">
                  <Input value={form.indexName} onChange={(e) => set("indexName", e.target.value)} />
                </Field>
                <Field label="Index tenor">
                  <Input value={form.indexTenor} onChange={(e) => set("indexTenor", e.target.value)} />
                </Field>
                <Field label="Spread %">
                  <Input value={form.spread} onChange={(e) => set("spread", e.target.value)} />
                </Field>
              </>
            )}
            <Field label="Repayment">
              <Picker
                value={form.repaymentType}
                onChange={(v) => set("repaymentType", v)}
                options={REPAYMENT_TYPES}
              />
            </Field>
            <Field label="Grace months">
              <Input value={form.graceMonths} onChange={(e) => set("graceMonths", e.target.value)} />
            </Field>
            <Field label="Payment day">
              <Input value={form.paymentDay} onChange={(e) => set("paymentDay", e.target.value)} />
            </Field>
            <Field label="Status">
              <Picker value={form.status} onChange={(v) => set("status", v)} options={AGREEMENT_STATUSES} />
            </Field>
            <div className="sm:col-span-3">
              <Label className="mb-1.5 block text-sm">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Create agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Picker({
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
