/**
 * New lease dialog — creates the lease and its first draft version.
 * The version is only a draft: nothing becomes contractual until it is
 * activated from the lease workspace.
 */

import { useState } from "react";
import { Plus } from "lucide-react";

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
import { usePropertyRegister } from "@/modules/realestate/queries";
import { useTenants } from "@/modules/leases/queries";
import {
  INDEXATION_TYPES,
  LEASE_TYPES,
  PAYMENT_FREQUENCIES,
} from "@/modules/leases/schemas";
import type { LeaseActions } from "@/modules/leases/server";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export function LeaseDialog({
  companyId,
  actions,
  disabled,
  onCreated,
}: {
  companyId: string | undefined;
  actions: LeaseActions;
  disabled?: boolean;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: properties = [] } = usePropertyRegister(companyId);
  const { data: tenants = [] } = useTenants(companyId);

  const [form, setForm] = useState({
    propertyId: "",
    primaryTenantId: "",
    code: "",
    title: "",
    leaseType: "commercial",
    startDate: "",
    endDate: "",
    baseRent: "",
    serviceCharge: "",
    paymentFrequency: "monthly",
    indexationType: "none",
    reviewCycleMonths: "",
    noticePeriodDays: "",
    depositAmount: "",
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!companyId || !form.propertyId) return;
    const outcome = await actions.run("createLease", {
      companyId,
      propertyId: form.propertyId,
      primaryTenantId: form.primaryTenantId || undefined,
      code: form.code || undefined,
      title: form.title || undefined,
      leaseType: form.leaseType,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      baseRent: num(form.baseRent),
      serviceCharge: num(form.serviceCharge),
      paymentFrequency: form.paymentFrequency,
      indexationType: form.indexationType,
      reviewCycleMonths: num(form.reviewCycleMonths),
      noticePeriodDays: num(form.noticePeriodDays),
      depositAmount: num(form.depositAmount),
      notes: form.notes || undefined,
    });
    const id = (outcome?.result as { id?: string } | undefined)?.id;
    if (id) {
      setOpen(false);
      onCreated?.(id);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="size-4" /> New lease
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New lease</DialogTitle>
            <DialogDescription>
              Creates the lease and version 1 as a draft. Assign the demise and tenants, then
              activate the version to make it contractual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Property">
              <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
                <SelectTrigger aria-label="Property">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} — ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tenant">
              <Select value={form.primaryTenantId} onValueChange={(v) => set("primaryTenantId", v)}>
                <SelectTrigger aria-label="Tenant">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lease reference">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Lease type">
              <Picker
                value={form.leaseType}
                onChange={(v) => set("leaseType", v)}
                options={LEASE_TYPES}
                label="Lease type"
              />
            </Field>
            <Field label="Payment frequency">
              <Picker
                value={form.paymentFrequency}
                onChange={(v) => set("paymentFrequency", v)}
                options={PAYMENT_FREQUENCIES}
                label="Payment frequency"
              />
            </Field>
            <Field label="Start date">
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
            <Field label="Notice period (days)">
              <Input
                value={form.noticePeriodDays}
                onChange={(e) => set("noticePeriodDays", e.target.value)}
              />
            </Field>
            <Field label="Base rent (per period)">
              <Input value={form.baseRent} onChange={(e) => set("baseRent", e.target.value)} />
            </Field>
            <Field label="Service charge (per period)">
              <Input
                value={form.serviceCharge}
                onChange={(e) => set("serviceCharge", e.target.value)}
              />
            </Field>
            <Field label="Deposit">
              <Input
                value={form.depositAmount}
                onChange={(e) => set("depositAmount", e.target.value)}
              />
            </Field>
            <Field label="Indexation">
              <Picker
                value={form.indexationType}
                onChange={(v) => set("indexationType", v)}
                options={INDEXATION_TYPES}
                label="Indexation"
              />
            </Field>
            <Field label="Review cycle (months)">
              <Input
                value={form.reviewCycleMonths}
                onChange={(e) => set("reviewCycleMonths", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-3">
              <Label className="mb-1.5 block text-sm">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={actions.isPending || !form.propertyId}>
              Create lease
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
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
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
