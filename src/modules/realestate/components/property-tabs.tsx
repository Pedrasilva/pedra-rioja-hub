import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarPlus,
  FileText,
  FolderTree,
  Info,
  Pencil,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import {
  formatArea,
  formatDate,
  formatMoney,
  formatMoneyPrecise,
  formatPercent,
  titleCase,
} from "@/lib/format";
import { MANUAL_EVENT_TYPES, UNIT_STATUSES } from "@/modules/realestate/constants";
import { PROPERTY_SUBFOLDERS, propertyFolderPath } from "@/modules/realestate/drive-template";
import {
  fullAddress,
  usePropertyDepreciation,
  usePropertyDocuments,
  usePropertyDriveFolders,
  usePropertyFinancing,
  usePropertyInsurance,
  usePropertyProjects,
  usePropertyTenancies,
  usePropertyTimeline,
  usePropertyUnits,
  usePropertyValuations,
  type PropertyRow,
} from "@/modules/realestate/queries";

type Ctx = {
  property: PropertyRow;
  summary: Record<string, unknown> | null;
  currency: string;
  canEdit: boolean;
  canRecord: boolean;
};

/* ---------------------------------------------------------------- shared UI */

export function NotAvailable({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Info className="size-3.5" /> Not available yet — {reason}
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="font-display text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

export function OverviewTab(ctx: Ctx) {
  const { property, currency } = ctx;
  const valuations = usePropertyValuations(property.id);
  const tenancies = usePropertyTenancies(property.id);
  const financing = usePropertyFinancing(property.id);
  const projects = usePropertyProjects(property.id);
  const insurance = usePropertyInsurance(property.id);
  const timeline = usePropertyTimeline(property.id);
  const documents = usePropertyDocuments(property.id);

  const latestValuation = valuations.data?.[0];
  const currentTenancy = tenancies.data?.find((t) => t.status === "active");
  const activeProjects = (projects.data ?? []).filter((p) =>
    ["planned", "active", "in_progress"].includes(p.status),
  );
  const activePolicy = (insurance.data ?? []).find((p) => p.status === "active");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Key information">
        <dl>
          <Row label="Type" value={titleCase(property.property_type)} />
          <Row label="Status" value={titleCase(property.status)} />
          <Row label="Address" value={fullAddress(property) || "—"} />
          <Row label="Acquired" value={formatDate(property.acquisition_date)} />
          <Row label="Gross area" value={formatArea(property.gross_area_m2)} />
          <Row label="Usable area" value={formatArea(property.area_m2)} />
        </dl>
      </Panel>

      <Panel title="Latest valuation">
        {latestValuation ? (
          <dl>
            <Row label="Amount" value={formatMoney(latestValuation.amount, currency)} />
            <Row label="Date" value={formatDate(latestValuation.valuation_date)} />
            <Row label="Method" value={titleCase(latestValuation.method)} />
            <Row label="Valuer" value={latestValuation.valuer ?? "—"} />
          </dl>
        ) : (
          <Empty title="No valuation recorded" hint="Add one in the Valuations tab to drive equity." />
        )}
      </Panel>

      <Panel title="Occupancy & current tenancy">
        <dl>
          <Row
            label="Occupancy"
            value={
              ctx.summary?.occupancy_pct === null || ctx.summary?.occupancy_pct === undefined
                ? "No units recorded"
                : formatPercent(ctx.summary.occupancy_pct as number)
            }
          />
          <Row label="Tenant" value={currentTenancy?.tenants?.name ?? "Vacant"} />
          <Row
            label="Rent"
            value={
              currentTenancy
                ? `${formatMoney(currentTenancy.base_rent, currency)} / ${titleCase(currentTenancy.payment_frequency)}`
                : "—"
            }
          />
          <Row label="Ends" value={currentTenancy ? formatDate(currentTenancy.end_date) : "—"} />
        </dl>
      </Panel>

      <Panel title="Financing summary">
        {financing.data?.length ? (
          <dl>
            {financing.data.map((a) => (
              <Row
                key={a.id}
                label={`${a.lender} · ${titleCase(a.type)}`}
                value={`${formatMoney(a.outstanding, a.currency ?? currency)} outstanding`}
              />
            ))}
          </dl>
        ) : (
          <Empty title="No financing" hint="The asset is unlevered in the register." />
        )}
      </Panel>

      <Panel title="Active projects">
        {activeProjects.length ? (
          <dl>
            {activeProjects.map((p) => (
              <Row
                key={p.id}
                label={p.name}
                value={`${formatMoney(p.actualCost, p.currency ?? currency)} of ${formatMoney(p.budget_amount, p.currency ?? currency)}`}
              />
            ))}
          </dl>
        ) : (
          <Empty title="No active projects" hint="Capex and maintenance projects appear here." />
        )}
      </Panel>

      <Panel title="Insurance status">
        {activePolicy ? (
          <dl>
            <Row label="Insurer" value={activePolicy.insurer} />
            <Row label="Renewal" value={formatDate(activePolicy.renewal_date)} />
            <Row label="Premium" value={formatMoney(activePolicy.premium_amount, currency)} />
          </dl>
        ) : (
          <Empty title="No active policy" hint="Record cover in the Insurance tab." />
        )}
      </Panel>

      <Panel title="Recent events">
        {timeline.data?.length ? (
          <ul className="space-y-3">
            {timeline.data.slice(0, 6).map((e) => (
              <li key={e.id as string} className="flex items-start gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.title as string}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.event_date as string)} · {titleCase(e.event_type as string)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No events yet" hint="Events are generated as records are created." />
        )}
      </Panel>

      <Panel title="Recent documents">
        {documents.data?.length ? (
          <ul className="space-y-3">
            {documents.data.slice(0, 6).map((d) => (
              <li key={d.id} className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {titleCase(d.category)} · {formatDate(d.issue_date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No documents linked"
            hint="Uploading arrives with the Drive integration in Phase 2.5."
          />
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------- details */

export function DetailsTab({ property, canEdit }: Ctx) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(property.notes ?? "");

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({ notes: notes || null })
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", property.id] });
      toast.success("Notes saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Core metadata">
        <dl>
          <Row label="Code" value={<span className="font-mono">{property.code ?? "—"}</span>} />
          <Row label="Name" value={property.name} />
          <Row label="Type" value={titleCase(property.property_type)} />
          <Row label="Status" value={titleCase(property.status)} />
          <Row label="Address" value={fullAddress(property) || "—"} />
          <Row label="Parish" value={property.parish ?? "—"} />
          <Row label="Country" value={property.country_code} />
          <Row label="Matrix article" value={property.matrix_article ?? "—"} />
          <Row label="Land registry" value={property.land_registry_ref ?? "—"} />
          <Row label="Conservatória" value={property.conservatoria ?? "—"} />
        </dl>
      </Panel>

      <Panel title="Areas & acquisition">
        <dl>
          <Row label="Gross area" value={formatArea(property.gross_area_m2)} />
          <Row label="Usable area" value={formatArea(property.area_m2)} />
          <Row label="Year built" value={property.year_built ?? "—"} />
          <Row label="Acquisition date" value={formatDate(property.acquisition_date)} />
          <Row label="Disposal date" value={formatDate(property.disposal_date)} />
        </dl>
      </Panel>

      <div className="lg:col-span-2">
        <UnitsPanel property={property} canEdit={canEdit} />
      </div>

      <Panel title="Notes" description="Free text kept with the asset." >
        <Textarea
          rows={6}
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
        />
        {canEdit ? (
          <Button
            className="mt-3"
            size="sm"
            onClick={() => saveNotes.mutate()}
            disabled={saveNotes.isPending}
          >
            Save notes
          </Button>
        ) : null}
      </Panel>
    </div>
  );
}

/* --------------------------------------------------------------------- units */

export function UnitsPanel({ property, canEdit }: { property: PropertyRow; canEdit: boolean }) {
  const units = usePropertyUnits(property.id);
  const tenancies = usePropertyTenancies(property.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id?: string } & Record<string, string>>({});

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: property.company_id,
        property_id: property.id,
        code: editing.code?.trim() || "",
        name: editing.name || null,
        unit_type: editing.unit_type || null,
        floor: editing.floor || null,
        area_m2: editing.area_m2 ? Number(editing.area_m2) : null,
        bedrooms: editing.bedrooms ? Number(editing.bedrooms) : null,
        status: editing.status || "vacant",
      };
      if (!payload.code) throw new Error("A unit code is required");
      const { error } = editing.id
        ? await supabase.from("property_units").update(payload).eq("id", editing.id)
        : await supabase.from("property_units").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-units", property.id] });
      queryClient.invalidateQueries({ queryKey: ["property", property.id] });
      setOpen(false);
      toast.success("Unit saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDialog = (unit?: Record<string, unknown>) => {
    setEditing(
      unit
        ? {
            id: unit.id as string,
            code: (unit.code as string) ?? "",
            name: (unit.name as string) ?? "",
            unit_type: (unit.unit_type as string) ?? "",
            floor: (unit.floor as string) ?? "",
            area_m2: unit.area_m2 ? String(unit.area_m2) : "",
            bedrooms: unit.bedrooms ? String(unit.bedrooms) : "",
            status: (unit.status as string) ?? "vacant",
          }
        : { code: "", name: "", unit_type: "", floor: "", area_m2: "", bedrooms: "", status: "vacant" },
    );
    setOpen(true);
  };

  return (
    <Panel
      title="Units"
      description="Optional — single-unit assets do not need a unit structure."
      action={
        canEdit ? (
          <Button size="sm" variant="outline" onClick={() => openDialog()}>
            <Plus className="size-4" /> Add unit
          </Button>
        ) : null
      }
    >
      {units.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Use</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead className="text-right">Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tenancy</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.data.map((u) => {
              const tenancy = tenancies.data?.find(
                (t) => t.unit_id === u.id && t.status === "active",
              );
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.code}</TableCell>
                  <TableCell>{u.name ?? "—"}</TableCell>
                  <TableCell>{titleCase(u.unit_type)}</TableCell>
                  <TableCell>{u.floor ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatArea(u.area_m2)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{titleCase(u.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{tenancy?.tenants?.name ?? "Vacant"}</TableCell>
                  <TableCell className="text-right">
                    {canEdit ? (
                      <Button size="sm" variant="ghost" onClick={() => openDialog(u)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Empty
          title="No units recorded"
          hint="Add units only if the asset is let or managed unit by unit."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing.id ? "Edit unit" : "Add unit"}</DialogTitle>
            <DialogDescription>Units drive occupancy in the derived views.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["code", "Unit code"],
              ["name", "Name"],
              ["unit_type", "Use"],
              ["floor", "Floor"],
              ["area_m2", "Area (m²)"],
              ["bedrooms", "Bedrooms"],
            ].map(([key, label]) => (
              <div key={key}>
                <Label className="mb-1.5 block text-sm">{label}</Label>
                <Input
                  value={editing[key] ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <Label className="mb-1.5 block text-sm">Status</Label>
              <Select
                value={editing.status ?? "vacant"}
                onValueChange={(v) => setEditing((s) => ({ ...s, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/* ----------------------------------------------------------------- financing */

export function FinancingTab({ property, currency }: Ctx) {
  const financing = usePropertyFinancing(property.id);
  return (
    <Panel
      title="Financing agreements"
      description="Read-only in Phase 2 — schedule generation and versioning arrive with the financing workflow."
    >
      {financing.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financing.data.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{titleCase(a.type)}</TableCell>
                <TableCell className="font-medium">{a.lender}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(a.principal, a.currency ?? currency)}
                </TableCell>
                <TableCell>
                  {a.rate_type === "fixed"
                    ? formatPercent(a.fixed_rate)
                    : `${a.index_name ?? "Index"} ${a.index_tenor ?? ""} + ${formatPercent(a.spread)}`}
                </TableCell>
                <TableCell>{formatDate(a.end_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(a.outstanding, a.currency ?? currency)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.versionCount ? `v${a.versionCount} current` : "Not generated"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{titleCase(a.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty
          title="No financing recorded"
          hint="Mortgages, leasing and loans will be captured in the financing module."
        />
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------------- tenancies */

export function TenanciesTab({ property, currency }: Ctx) {
  const tenancies = usePropertyTenancies(property.id);
  return (
    <Panel title="Tenancy agreements" description="Current and historical leases for this asset.">
      {tenancies.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Rent</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Fit-out loan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenancies.data.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.tenants?.name ?? "—"}</TableCell>
                <TableCell>{t.property_units?.code ?? "Whole property"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(t.base_rent, t.currency ?? currency)}
                </TableCell>
                <TableCell>{t.vat_applicable ? "Applicable" : "Exempt"}</TableCell>
                <TableCell>{formatDate(t.start_date)}</TableCell>
                <TableCell>{formatDate(t.end_date, "Open")}</TableCell>
                <TableCell className="text-sm">
                  {t.fitoutLoan
                    ? `${t.fitoutLoan.code ?? "Loan"} · ${formatMoney(t.fitoutLoan.principal, currency)}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{titleCase(t.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty title="No tenancies" hint="Leases recorded for this property will be listed here." />
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ projects */

export function ProjectsTab({ property, currency }: Ctx) {
  const projects = usePropertyProjects(property.id);
  return (
    <Panel
      title="Capex & maintenance projects"
      description="Committed and forecast cost arrive with the construction module."
    >
      {projects.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Forecast final</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{titleCase(p.project_type)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(p.budget_amount, p.currency ?? currency)}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  Not available yet
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(p.actualCost, p.currency ?? currency)}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  Not available yet
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{titleCase(p.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty title="No projects" hint="Renovation and capex projects will appear here." />
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- valuations */

export function ValuationsTab({ property, currency }: Ctx) {
  const valuations = usePropertyValuations(property.id);
  return (
    <Panel title="Valuation history" description="The most recent valuation drives estimated equity.">
      {valuations.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Valuer</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {valuations.data.map((v, i) => (
              <TableRow key={v.id}>
                <TableCell>{formatDate(v.valuation_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(v.amount, v.currency ?? currency)}
                </TableCell>
                <TableCell>{titleCase(v.method)}</TableCell>
                <TableCell>{v.valuer ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {i === 0 ? <Badge>Current</Badge> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty title="No valuations" hint="Equity falls back to acquisition cost until one exists." />
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------------- insurance */

export function InsuranceTab({ property, currency }: Ctx) {
  const insurance = usePropertyInsurance(property.id);
  const soon = (date: string | null) => {
    if (!date) return false;
    const days = (new Date(date).getTime() - Date.now()) / 86_400_000;
    return days < 60;
  };
  return (
    <Panel title="Insurance policies" description="Cover, premium and renewal warnings.">
      {insurance.data?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insurer</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Cover</TableHead>
              <TableHead className="text-right">Insured</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Renewal</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insurance.data.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.insurer}</TableCell>
                <TableCell className="font-mono text-xs">{p.policy_number ?? "—"}</TableCell>
                <TableCell>{titleCase(p.cover_type)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(p.insured_amount, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(p.premium_amount, currency)}
                </TableCell>
                <TableCell>{formatDate(p.start_date)}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    {formatDate(p.renewal_date)}
                    {soon(p.renewal_date) ? (
                      <AlertTriangle className="size-3.5 text-warning" aria-label="Renewal due" />
                    ) : null}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{titleCase(p.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty title="No policies" hint="Record buildings and liability cover per property." />
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------- depreciation */

export function DepreciationTab({ property, currency }: Ctx) {
  const { data } = usePropertyDepreciation(property.id);
  return (
    <Panel
      title="Depreciation"
      description="Read-only — records are imported from the accountant once the import workflow exists."
    >
      {data?.assets.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Capitalised</TableHead>
              <TableHead>In service</TableHead>
              <TableHead>Life</TableHead>
              <TableHead className="text-right">Accumulated</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.assets.map((a) => {
              const latest = data.entries.find((e) => e.asset_id === a.id);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.description}</TableCell>
                  <TableCell>{titleCase(a.category)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(a.capitalised_amount, currency)}
                  </TableCell>
                  <TableCell>{formatDate(a.in_service_date)}</TableCell>
                  <TableCell>{a.useful_life_years ? `${a.useful_life_years} yr` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {latest ? formatMoney(latest.accumulated_amount, currency) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{titleCase(a.status)}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <Empty
          title="No depreciation records"
          hint="The accountant import workflow is deferred to a later phase."
        />
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------------- documents */

export function DocumentsTab({ property, currency, canEdit, canRecord }: Ctx) {
  const folders = usePropertyDriveFolders(property.id);
  const queryClient = useQueryClient();
  const syncFn = useServerFn(syncDriveFolders);
  const driveStatus = useDriveStatus(property.company_id);

  const sync = useMutation({
    mutationFn: () => syncFn({ data: { companyId: property.company_id, propertyId: property.id } }),
    onSuccess: (r) => {
      toast.success(r.created ? `${r.created} folder(s) created in Drive` : "Folders already in sync");
      queryClient.invalidateQueries({ queryKey: ["property-drive-folders", property.id] });
      queryClient.invalidateQueries({ queryKey: ["drive-status", property.company_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const driveReady = Boolean(driveStatus.data?.connected && driveStatus.data?.rootFolderId);

  return (
    <div className="grid gap-5">
      <DocumentsPanel
        companyId={property.company_id}
        entityType="properties"
        entityId={property.id}
        currency={currency}
        canEdit={canEdit || canRecord}
      />

      <Panel
        title="Drive structure"
        description="Folder plan for this property, reconciled against Google Drive."
        action={
          canEdit ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!driveReady || sync.isPending}
              title={driveReady ? undefined : "Connect a Drive root folder in Settings first"}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? "Creating…" : "Create folders in Drive"}
            </Button>
          ) : undefined
        }
      >

        <ul className="grid gap-2 sm:grid-cols-2">
          {(folders.data?.length
            ? folders.data.map((f) => ({ path: f.path, status: f.sync_status }))
            : [
                { path: propertyFolderPath(property.code ?? property.id), status: "pending" },
                ...PROPERTY_SUBFOLDERS.map((s) => ({
                  path: `${propertyFolderPath(property.code ?? property.id)}/${s}`,
                  status: "pending",
                })),
              ]
          ).map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 font-mono text-xs">
                <FolderTree className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.path}</span>
              </span>
              <Badge variant="outline">{titleCase(f.status)}</Badge>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ timeline */

export function TimelineTab({ property, currency, canRecord }: Ctx) {
  const timeline = usePropertyTimeline(property.id);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState({
    event_date: new Date().toISOString().slice(0, 10),
    event_type: "note",
    title: "",
    description: "",
    amount: "",
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!event.title.trim()) throw new Error("A title is required");
      const { error } = await supabase.from("property_events").insert({
        company_id: property.company_id,
        property_id: property.id,
        event_date: event.event_date,
        event_type: event.event_type,
        title: event.title.trim(),
        description: event.description || null,
        amount: event.amount ? Number(event.amount) : null,
        currency,
        is_manual: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-timeline", property.id] });
      setOpen(false);
      setEvent((e) => ({ ...e, title: "", description: "", amount: "" }));
      toast.success("Event added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const events = (timeline.data ?? []).filter((e) =>
    filter === "all"
      ? true
      : filter === "manual"
        ? e.is_manual
        : filter === "automatic"
          ? !e.is_manual
          : e.event_type === filter,
  );

  const types = Array.from(new Set((timeline.data ?? []).map((e) => e.event_type as string)));

  return (
    <Panel
      title="Property timeline"
      description="The chronological spine of the asset — generated events plus anything you add."
      action={
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44" aria-label="Filter events">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="automatic">Automatic only</SelectItem>
              <SelectItem value="manual">Manual only</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {titleCase(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canRecord ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <CalendarPlus className="size-4" /> Add event
            </Button>
          ) : null}
        </div>
      }
    >
      {events.length ? (
        <ol className="relative space-y-5 border-l border-border pl-6">
          {events.map((e) => (
            <li key={e.id as string} className="relative">
              <span className="absolute top-1.5 -left-[27px] size-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{e.title as string}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDate(e.event_date as string)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{(e.description as string) ?? ""}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{titleCase(e.event_type as string)}</Badge>
                <Badge variant={e.is_manual ? "secondary" : "outline"}>
                  {e.is_manual ? "Manual" : "Automatic"}
                </Badge>
                {e.amount ? (
                  <span className="text-sm tabular-nums">
                    {formatMoneyPrecise(e.amount as number, currency)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty
          title="Nothing on the timeline"
          hint="Purchases, valuations, tenancies and financing write here automatically."
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add a manual event</DialogTitle>
            <DialogDescription>
              Manual events sit alongside generated ones and stay clearly marked.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm">Date</Label>
                <Input
                  type="date"
                  value={event.event_date}
                  onChange={(e) => setEvent((s) => ({ ...s, event_date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Type</Label>
                <Select
                  value={event.event_type}
                  onValueChange={(v) => setEvent((s) => ({ ...s, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Title</Label>
              <Input
                value={event.title}
                onChange={(e) => setEvent((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Description</Label>
              <Textarea
                rows={3}
                value={event.description}
                onChange={(e) => setEvent((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Amount (optional)</Label>
              <Input
                type="number"
                value={event.amount}
                onChange={(e) => setEvent((s) => ({ ...s, amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>
              Add event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
