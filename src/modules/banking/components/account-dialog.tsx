import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import { ACCOUNT_STATUSES, ACCOUNT_TYPES } from "@/modules/banking/schemas";
import { createBankAccount, updateBankAccount } from "@/modules/banking/banking.functions";

type Existing = {
  id: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  account_identifier: string | null;
  bic: string | null;
  currency: string;
  account_type: string;
  opening_balance: number | string;
  opening_balance_date: string;
  drive_folder_url: string | null;
  status: string | null;
  notes: string | null;
};

export function BankAccountDialog({
  companyId,
  currency,
  existing,
  trigger,
}: {
  companyId: string;
  currency: string;
  existing?: Existing;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    bankName: existing?.bank_name ?? "",
    iban: existing?.iban ?? "",
    accountIdentifier: existing?.account_identifier ?? "",
    bic: existing?.bic ?? "",
    currency: existing?.currency ?? currency,
    accountType: existing?.account_type ?? "current",
    openingBalance: String(existing?.opening_balance ?? "0"),
    openingBalanceDate: existing?.opening_balance_date ?? today,
    driveFolderUrl: existing?.drive_folder_url ?? "",
    status: (existing?.status as "active" | "archived") ?? "active",
    notes: existing?.notes ?? "",
  });

  const create = useServerFn(createBankAccount);
  const update = useServerFn(updateBankAccount);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        companyId,
        openingBalance: Number(form.openingBalance) || 0,
      };
      return existing
        ? update({ data: { ...payload, bankAccountId: existing.id } })
        : create({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-account-balances"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-list"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-accounts"] });
      toast.success(existing ? "Account updated" : "Bank account added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add bank account
        </Button>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit bank account" : "New bank account"}</DialogTitle>
          <DialogDescription>
            Opening balance and its date anchor every projected and reconciled balance for this
            account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1 sm:col-span-2">
            <Label>Account name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label>Bank</Label>
            <Input
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>Account type</Label>
            <Select
              value={form.accountType}
              onValueChange={(v) => setForm({ ...form, accountType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>IBAN</Label>
            <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label>Masked identifier</Label>
            <Input
              placeholder="•••• 4321"
              value={form.accountIdentifier}
              onChange={(e) => setForm({ ...form, accountIdentifier: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>BIC</Label>
            <Input value={form.bic} onChange={(e) => setForm({ ...form, bic: e.target.value })} />
          </div>
          <div className="grid gap-1">
            <Label>Currency</Label>
            <Input
              maxLength={3}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="grid gap-1">
            <Label>Opening balance</Label>
            <Input
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>Opening-balance date</Label>
            <Input
              type="date"
              value={form.openingBalanceDate}
              onChange={(e) => setForm({ ...form, openingBalanceDate: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as "active" | "archived" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label>Drive folder link</Label>
            <Input
              value={form.driveFolderUrl}
              onChange={(e) => setForm({ ...form, driveFolderUrl: e.target.value })}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            {existing ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
