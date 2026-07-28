import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { titleCase } from "@/lib/format";
import {
  useArchiveCounterparty,
  useCreateCounterparty,
  useUpdateCounterparty,
} from "../mutations";
import type { BookkeepingCapabilities } from "../permissions";
import { useClassifications, useCounterparties, type CounterpartyRow } from "../queries";
import { COUNTERPARTY_TYPES, isValidNif } from "../schemas";
import { classificationLabel, OptionSelect } from "./selectors";

type Draft = {
  id?: string;
  name: string;
  legalName: string;
  tradingName: string;
  counterpartyType: "supplier" | "client" | "both";
  nif: string;
  email: string;
  phone: string;
  contactName: string;
  city: string;
  paymentTermsDays: string;
  iban: string;
  defaultClassificationId: string | null;
  notes: string;
};

const emptyDraft: Draft = {
  name: "",
  legalName: "",
  tradingName: "",
  counterpartyType: "supplier",
  nif: "",
  email: "",
  phone: "",
  contactName: "",
  city: "",
  paymentTermsDays: "",
  iban: "",
  defaultClassificationId: null,
  notes: "",
};

export function CounterpartyDialog({
  open,
  onOpenChange,
  companyId,
  initial,
  capabilities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  initial?: CounterpartyRow | null;
  capabilities: BookkeepingCapabilities;
}) {
  const create = useCreateCounterparty();
  const update = useUpdateCounterparty();
  const { data: classifications } = useClassifications(companyId);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [touched, setTouched] = useState(false);

  // Re-seed the form whenever the dialog is opened for a different record.
  const seedKey = `${open}:${initial?.id ?? "new"}`;
  const [lastSeed, setLastSeed] = useState("");
  if (open && seedKey !== lastSeed) {
    setLastSeed(seedKey);
    setTouched(false);
    setDraft(
      initial
        ? {
            id: initial.id,
            name: initial.name ?? "",
            legalName: initial.legal_name ?? "",
            tradingName: initial.trading_name ?? "",
            counterpartyType: (initial.counterparty_type as Draft["counterpartyType"]) ?? "supplier",
            nif: initial.nif ?? "",
            email: initial.email ?? "",
            phone: initial.phone ?? "",
            contactName: "",
            city: initial.city ?? "",
            paymentTermsDays:
              initial.payment_terms_days === null || initial.payment_terms_days === undefined
                ? ""
                : String(initial.payment_terms_days),
            iban: initial.iban ?? "",
            defaultClassificationId: initial.default_classification_id ?? null,
            notes: "",
          }
        : emptyDraft,
    );
  }

  const nifError =
    draft.nif.trim() && !isValidNif(draft.nif.trim())
      ? "Not a valid Portuguese NIF checksum"
      : null;
  const nameError = draft.name.trim() ? null : "Name is required";
  const invalid = Boolean(nifError || nameError);

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    const payload = {
      companyId,
      name: draft.name.trim(),
      legalName: draft.legalName.trim() || null,
      tradingName: draft.tradingName.trim() || null,
      counterpartyType: draft.counterpartyType,
      nif: draft.nif.trim() || null,
      countryCode: "PT",
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      contactName: draft.contactName.trim() || null,
      city: draft.city.trim() || null,
      paymentTermsDays: draft.paymentTermsDays === "" ? null : Number(draft.paymentTermsDays),
      iban: draft.iban.trim() || null,
      defaultClassificationId: draft.defaultClassificationId,
      currency: "EUR",
      notes: draft.notes.trim() || null,
    };
    const done = () => onOpenChange(false);
    if (draft.id) update.mutate({ ...payload, id: draft.id }, { onSuccess: done });
    else create.mutate(payload, { onSuccess: done });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit counterparty" : "New counterparty"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cp-name">Name</Label>
            <Input
              id="cp-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {touched && nameError ? (
              <p className="mt-1 text-xs text-destructive">{nameError}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="cp-legal">Legal name</Label>
            <Input
              id="cp-legal"
              value={draft.legalName}
              onChange={(e) => setDraft({ ...draft, legalName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cp-trading">Trading name</Label>
            <Input
              id="cp-trading"
              value={draft.tradingName}
              onChange={(e) => setDraft({ ...draft, tradingName: e.target.value })}
            />
          </div>
          <div>
            <Label>Role</Label>
            <OptionSelect
              aria-label="Counterparty role"
              allowNone={false}
              value={draft.counterpartyType}
              onChange={(v) =>
                setDraft({ ...draft, counterpartyType: (v ?? "supplier") as Draft["counterpartyType"] })
              }
              options={COUNTERPARTY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
          <div>
            <Label htmlFor="cp-nif">NIF</Label>
            <Input
              id="cp-nif"
              value={draft.nif}
              onChange={(e) => setDraft({ ...draft, nif: e.target.value })}
            />
            {nifError ? <p className="mt-1 text-xs text-destructive">{nifError}</p> : null}
          </div>
          <div>
            <Label htmlFor="cp-email">Email</Label>
            <Input
              id="cp-email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cp-phone">Phone</Label>
            <Input
              id="cp-phone"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cp-city">City</Label>
            <Input
              id="cp-city"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cp-terms">Payment terms (days)</Label>
            <Input
              id="cp-terms"
              inputMode="numeric"
              value={draft.paymentTermsDays}
              onChange={(e) => setDraft({ ...draft, paymentTermsDays: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cp-iban">IBAN</Label>
            <Input
              id="cp-iban"
              value={draft.iban}
              onChange={(e) => setDraft({ ...draft, iban: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Default classification</Label>
            <OptionSelect
              aria-label="Default classification"
              value={draft.defaultClassificationId}
              onChange={(v) => setDraft({ ...draft, defaultClassificationId: v })}
              options={(classifications ?? []).map((c) => ({
                value: c.id,
                label: classificationLabel(c),
              }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cp-notes">Notes</Label>
            <Textarea
              id="cp-notes"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!capabilities.canRecord || create.isPending || update.isPending}
          >
            {draft.id ? "Save changes" : "Create counterparty"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CounterpartiesPanel({
  companyId,
  capabilities,
}: {
  companyId: string;
  capabilities: BookkeepingCapabilities;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "supplier" | "client">("all");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const [editing, setEditing] = useState<CounterpartyRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useCounterparties(companyId, {
    type: type === "all" ? undefined : type,
    status,
    search,
  });
  const archive = useArchiveCounterparty();

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search counterparties"
            className="pl-9"
            placeholder="Search by name, legal name or NIF"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Label className="text-xs text-muted-foreground">Role</Label>
          <OptionSelect
            aria-label="Filter by role"
            allowNone={false}
            value={type}
            onChange={(v) => setType((v ?? "all") as typeof type)}
            options={[
              { value: "all", label: "All roles" },
              { value: "supplier", label: "Suppliers" },
              { value: "client", label: "Clients" },
            ]}
          />
        </div>
        <div className="w-44">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <OptionSelect
            aria-label="Filter by status"
            allowNone={false}
            value={status}
            onChange={(v) => setStatus((v ?? "active") as typeof status)}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        {capabilities.canRecord ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> New counterparty
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No counterparties match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((cp) => (
                  <TableRow key={cp.id}>
                    <TableCell>
                      <p className="font-medium">{cp.name}</p>
                      {cp.legal_name ? (
                        <p className="text-xs text-muted-foreground">{cp.legal_name}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{titleCase(cp.counterparty_type)}</TableCell>
                    <TableCell>{cp.nif ?? "—"}</TableCell>
                    <TableCell>
                      {cp.payment_terms_days === null ? "—" : `${cp.payment_terms_days} d`}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">{cp.iban ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cp.status === "active" ? "secondary" : "outline"}>
                        {titleCase(cp.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {capabilities.canRecord ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${cp.name}`}
                            onClick={() => {
                              setEditing(cp);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={
                              cp.status === "active" ? `Archive ${cp.name}` : `Restore ${cp.name}`
                            }
                            onClick={() =>
                              archive.mutate({ id: cp.id, archived: cp.status === "active" })
                            }
                          >
                            {cp.status === "active" ? (
                              <Archive className="size-4" />
                            ) : (
                              <ArchiveRestore className="size-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CounterpartyDialog
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        initial={editing}
        capabilities={capabilities}
      />
    </div>
  );
}
