/**
 * New tenant dialog.
 */

import { cloneElement, isValidElement, useState, type ReactElement } from "react";
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
import type { LeaseActions } from "@/modules/leases/server";

export function TenantDialog({
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
  const [form, setForm] = useState({
    name: "",
    code: "",
    legalName: "",
    tradingName: "",
    taxNumber: "",
    registrationNumber: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    sector: "",
    tenantType: "company",
    notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!companyId || !form.name.trim()) return;
    const outcome = await actions.run("upsertTenant", {
      companyId,
      name: form.name.trim(),
      code: form.code || undefined,
      legalName: form.legalName || undefined,
      tradingName: form.tradingName || undefined,
      taxNumber: form.taxNumber || undefined,
      registrationNumber: form.registrationNumber || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      website: form.website || undefined,
      address: form.address || undefined,
      sector: form.sector || undefined,
      tenantType: form.tenantType as "company" | "individual",
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
        <Plus className="size-4" /> New tenant
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">New tenant</DialogTitle>
            <DialogDescription>
              The tenant register holds the legal entity. Leases link tenants to units.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Reference">
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label="Legal name">
              <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
            </Field>
            <Field label="Trading name">
              <Input
                value={form.tradingName}
                onChange={(e) => set("tradingName", e.target.value)}
              />
            </Field>
            <Field label="Tax number">
              <Input value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} />
            </Field>
            <Field label="Registration number">
              <Input
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
            </Field>
            <Field label="Sector">
              <Input value={form.sector} onChange={(e) => set("sector", e.target.value)} />
            </Field>
            <Field label="Entity type">
              <Select value={form.tenantType} onValueChange={(v) => set("tenantType", v)}>
                <SelectTrigger aria-label="Entity type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!form.name.trim() || actions.isPending}>
              Create tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = `tenant-field-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
