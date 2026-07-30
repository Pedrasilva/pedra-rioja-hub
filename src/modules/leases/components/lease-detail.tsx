/**
 * Lease workspace — the operational record of one lease.
 *
 * Versions, demise, tenants, charge schedule, reviews, breaks, notices,
 * guarantors, documents and history. No panel here creates a commitment,
 * a bookkeeping document, a payment or a cash-flow entry.
 */

import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatArea, formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import type { LeaseCapabilities } from "@/modules/leases/capabilities";
import {
  useLeaseBreaks,
  useLeaseCharges,
  useLeaseDocuments,
  useLeaseGuarantors,
  useLeaseNotices,
  useLeaseReviews,
  useLeaseTenants,
  useLeaseUnits,
  useLeaseVersions,
  useTenants,
  type LeaseSummary,
} from "@/modules/leases/queries";
import {
  BREAK_TYPES,
  CHARGE_TYPES,
  NOTICE_TYPES,
  PAYMENT_FREQUENCIES,
  REVIEW_TYPES,
} from "@/modules/leases/schemas";
import type { LeaseActions } from "@/modules/leases/server";
import { usePropertyUnits } from "@/modules/realestate/queries";
import { LeaseStatusBadge } from "./lease-list";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
type Row = Record<string, unknown>;
const str = (row: Row, key: string) => (row[key] == null ? null : String(row[key]));
const nbr = (row: Row, key: string) => (row[key] == null ? null : Number(row[key]));

export function LeaseDetail({
  lease,
  actions,
  capabilities,
}: {
  lease: LeaseSummary;
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const { data: versions = [] } = useLeaseVersions(lease.lease_id);
  const draft = versions.find((v) => str(v, "status") === "draft") ?? null;
  const currentId = lease.version_id ?? undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Status" value={<LeaseStatusBadge status={lease.status} />} />
        <Kpi
          label="Periodic charge"
          value={formatMoneyPrecise(lease.total_periodic_charge, lease.currency ?? "EUR")}
          hint={titleCase(lease.payment_frequency)}
        />
        <Kpi
          label="Term"
          value={`${formatDate(lease.start_date)} → ${
            lease.is_open_ended ? "open-ended" : formatDate(lease.end_date)
          }`}
          hint={
            lease.days_to_expiry == null ? undefined : `${lease.days_to_expiry} days to expiry`
          }
        />
        <Kpi label="Demise" value={formatArea(lease.total_area_m2)} hint={`${lease.unit_count ?? 0} unit(s)`} />
      </div>

      <Tabs defaultValue="terms">
        <TabsList className="flex-wrap">
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="demise">Demise &amp; tenants</TabsTrigger>
          <TabsTrigger value="charges">Charges</TabsTrigger>
          <TabsTrigger value="reviews">Rent reviews</TabsTrigger>
          <TabsTrigger value="breaks">Breaks &amp; notices</TabsTrigger>
          <TabsTrigger value="guarantees">Guarantees</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="mt-4">
          <TermsPanel lease={lease} draft={draft} actions={actions} capabilities={capabilities} />
        </TabsContent>
        <TabsContent value="versions" className="mt-4">
          <VersionsPanel
            lease={lease}
            versions={versions}
            actions={actions}
            capabilities={capabilities}
          />
        </TabsContent>
        <TabsContent value="demise" className="mt-4">
          <DemisePanel
            lease={lease}
            versionId={(draft ? str(draft, "id") : currentId) ?? undefined}
            editable={Boolean(draft) && capabilities.canRecord}
            actions={actions}
          />
        </TabsContent>
        <TabsContent value="charges" className="mt-4">
          <ChargesPanel
            versionId={(draft ? str(draft, "id") : currentId) ?? undefined}
            currency={lease.currency ?? "EUR"}
            editable={Boolean(draft) && capabilities.canRecord}
            actions={actions}
          />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsPanel lease={lease} actions={actions} capabilities={capabilities} />
        </TabsContent>
        <TabsContent value="breaks" className="mt-4">
          <BreaksPanel lease={lease} actions={actions} capabilities={capabilities} />
        </TabsContent>
        <TabsContent value="guarantees" className="mt-4">
          <GuaranteesPanel lease={lease} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel lease={lease} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <div className="mt-1 font-display text-lg font-semibold">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- terms */

function TermsPanel({
  lease,
  draft,
  actions,
  capabilities,
}: {
  lease: LeaseSummary;
  draft: Row | null;
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const [rent, setRent] = useState("");
  const [service, setService] = useState("");
  const [end, setEnd] = useState("");

  const draftId = draft ? str(draft, "id") : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Contractual terms</CardTitle>
          <CardDescription>
            Read from the active version. Activated versions are immutable — changes create a new
            version.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Line label="Property" value={lease.property_name} />
          <Line label="Tenant" value={lease.tenant_name} />
          <Line label="Base rent" value={formatMoneyPrecise(lease.base_rent, lease.currency ?? "EUR")} />
          <Line
            label="Service charge"
            value={formatMoneyPrecise(lease.service_charge, lease.currency ?? "EUR")}
          />
          <Line label="Frequency" value={titleCase(lease.payment_frequency)} />
          <Line label="Indexation" value={titleCase(lease.indexation_type)} />
          <Line
            label="Review cycle"
            value={lease.review_cycle_months ? `${lease.review_cycle_months} months` : "—"}
          />
          <Line
            label="Notice period"
            value={lease.notice_period_days ? `${lease.notice_period_days} days` : "—"}
          />
          <Line
            label="Deposit"
            value={formatMoneyPrecise(lease.deposit_amount, lease.currency ?? "EUR")}
          />
          <Line label="Deposit expiry" value={formatDate(lease.deposit_expiry_date)} />
          <Line
            label="Annualised charge"
            value={formatMoneyPrecise(lease.annual_charge, lease.currency ?? "EUR")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">
            {draftId ? "Edit draft version" : "Lifecycle"}
          </CardTitle>
          <CardDescription>
            {draftId
              ? "Only draft versions can be edited. Activate the version to make it contractual."
              : "Create a new version to renew or vary the lease; close it when it ends."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {draftId ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5 block text-sm">Base rent</Label>
                <Input value={rent} onChange={(e) => setRent(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Service charge</Label>
                <Input value={service} onChange={(e) => setService(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">End date</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <div className="sm:col-span-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!capabilities.canRecord || actions.isPending}
                  onClick={() =>
                    actions.run("updateVersion", {
                      versionId: draftId,
                      baseRent: num(rent),
                      serviceCharge: num(service),
                      endDate: end || undefined,
                    })
                  }
                >
                  Save draft
                </Button>
                <Button
                  size="sm"
                  disabled={!capabilities.canManage || actions.isPending}
                  onClick={() => actions.run("activateVersion", { versionId: draftId })}
                >
                  Activate version
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!capabilities.canRecord || Boolean(draftId) || actions.isPending}
              onClick={() => actions.run("createVersion", { leaseId: lease.lease_id, versionReason: "renewal" })}
            >
              Start renewal
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!capabilities.canRecord || Boolean(draftId) || actions.isPending}
              onClick={() =>
                actions.run("createVersion", { leaseId: lease.lease_id, versionReason: "variation" })
              }
            >
              Start variation
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!capabilities.canManage || actions.isPending}
              onClick={() => actions.run("terminate", { leaseId: lease.lease_id, status: "terminated" })}
            >
              Terminate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!capabilities.canManage || actions.isPending}
              onClick={() => actions.run("terminate", { leaseId: lease.lease_id, status: "expired" })}
            >
              Mark expired
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!capabilities.canManage || actions.isPending}
              onClick={() => actions.run("archiveLease", { leaseId: lease.lease_id })}
            >
              Archive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

/* ------------------------------------------------------------- versions */

function VersionsPanel({
  lease,
  versions,
  actions,
  capabilities,
}: {
  lease: LeaseSummary;
  versions: Row[];
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Version history</CardTitle>
        <CardDescription>
          Renewals, variations and applied reviews each create a version. History is never
          overwritten.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead>Term</TableHead>
              <TableHead className="text-right">Base rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => {
              const id = str(v, "id")!;
              const status = str(v, "status")!;
              return (
                <TableRow key={id}>
                  <TableCell className="font-medium">v{nbr(v, "version_no")}</TableCell>
                  <TableCell>{titleCase(str(v, "version_reason"))}</TableCell>
                  <TableCell>{formatDate(str(v, "effective_from"))}</TableCell>
                  <TableCell>
                    {formatDate(str(v, "start_date"))} → {formatDate(str(v, "end_date"))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(nbr(v, "base_rent"), lease.currency ?? "EUR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "active" ? "default" : "outline"}>
                      {titleCase(status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!capabilities.canManage || actions.isPending}
                        onClick={() => actions.run("activateVersion", { versionId: id })}
                      >
                        Activate
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- demise */

function DemisePanel({
  lease,
  versionId,
  editable,
  actions,
}: {
  lease: LeaseSummary;
  versionId: string | undefined;
  editable: boolean;
  actions: LeaseActions;
}) {
  const { data: units = [] } = useLeaseUnits(versionId);
  const { data: leaseTenants = [] } = useLeaseTenants(versionId);
  const { data: propertyUnits = [] } = usePropertyUnits(lease.property_id);
  const { data: tenants = [] } = useTenants(lease.company_id);
  const [unitId, setUnitId] = useState("");
  const [tenantId, setTenantId] = useState("");

  const addUnit = () => {
    if (!versionId || !unitId) return;
    const next = [
      ...units.map((u) => ({
        unitId: str(u, "unit_id") ?? undefined,
        areaM2: nbr(u, "area_m2") ?? undefined,
        apportionmentPct: nbr(u, "apportionment_pct") ?? undefined,
      })),
      { unitId, apportionmentPct: 100 },
    ];
    actions.run("setUnits", { versionId, units: next });
    setUnitId("");
  };

  const addTenant = () => {
    if (!versionId || !tenantId) return;
    const next = [
      ...leaseTenants.map((t) => ({
        tenantId: str(t, "tenant_id")!,
        isPrimary: Boolean(t.is_primary),
        sharePct: nbr(t, "share_pct") ?? undefined,
      })),
      { tenantId, isPrimary: leaseTenants.length === 0 },
    ];
    actions.run("setTenants", { versionId, tenants: next });
    setTenantId("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Demise</CardTitle>
          <CardDescription>Units let under this version.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead className="text-right">Apportionment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => {
                const unit = u.property_units as { code?: string; name?: string } | null;
                return (
                  <TableRow key={str(u, "id")}>
                    <TableCell>{unit?.code ?? str(u, "demise_label") ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatArea(nbr(u, "area_m2"))}</TableCell>
                    <TableCell className="text-right">
                      {nbr(u, "apportionment_pct") ?? 100}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {editable ? (
            <div className="flex gap-2">
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger aria-label="Add unit">
                  <SelectValue placeholder="Add a unit…" />
                </SelectTrigger>
                <SelectContent>
                  {propertyUnits.map((u) => (
                    <SelectItem key={u.id as string} value={u.id as string}>
                      {(u.code as string) ?? "Unit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addUnit} disabled={!unitId || actions.isPending}>
                Add
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              The demise of an activated version is immutable.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Tenants</CardTitle>
          <CardDescription>Contracting parties on this version.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaseTenants.map((t) => {
                const tenant = t.tenants as { name?: string } | null;
                return (
                  <TableRow key={str(t, "id")}>
                    <TableCell>
                      <Link
                        to="/tenants/$tenantId"
                        params={{ tenantId: str(t, "tenant_id")! }}
                        className="underline-offset-4 hover:underline"
                      >
                        {tenant?.name ?? "Tenant"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {titleCase(str(t, "role"))}
                      {t.is_primary ? " · primary" : ""}
                    </TableCell>
                    <TableCell className="text-right">{nbr(t, "share_pct") ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {editable ? (
            <div className="flex gap-2">
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger aria-label="Add tenant">
                  <SelectValue placeholder="Add a tenant…" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addTenant} disabled={!tenantId || actions.isPending}>
                Add
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tenant assignments of an activated version are immutable.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------- charges */

function ChargesPanel({
  versionId,
  currency,
  editable,
  actions,
}: {
  versionId: string | undefined;
  currency: string;
  editable: boolean;
  actions: LeaseActions;
}) {
  const { data: charges = [] } = useLeaseCharges(versionId);
  const [type, setType] = useState("service_charge");
  const [amount, setAmount] = useState("");

  const add = () => {
    if (!versionId || !amount) return;
    const next = [
      ...charges.map((c) => ({
        chargeType: str(c, "charge_type")!,
        amount: nbr(c, "amount") ?? 0,
        frequency: str(c, "frequency") ?? undefined,
      })),
      { chargeType: type, amount: Number(amount), frequency: "monthly" },
    ];
    actions.run("setCharges", { versionId, charges: next });
    setAmount("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Charge schedule</CardTitle>
        <CardDescription>
          Contract terms only. Invoices and payments stay in bookkeeping and banking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Charge</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  No additional charges recorded.
                </TableCell>
              </TableRow>
            ) : (
              charges.map((c) => (
                <TableRow key={str(c, "id")}>
                  <TableCell>{titleCase(str(c, "charge_type"))}</TableCell>
                  <TableCell>{titleCase(str(c, "frequency"))}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(nbr(c, "amount"), currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-48" aria-label="Charge type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-40"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Charge amount"
            />
            <Button size="sm" onClick={add} disabled={!amount || actions.isPending}>
              Add charge
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            The charge schedule of an activated version is immutable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- reviews */

function ReviewsPanel({
  lease,
  actions,
  capabilities,
}: {
  lease: LeaseSummary;
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const { data: reviews = [] } = useLeaseReviews(lease.lease_id);
  const [form, setForm] = useState({
    reviewType: "scheduled",
    reviewDate: "",
    effectiveDate: "",
    proposedRent: "",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Rent reviews</CardTitle>
        <CardDescription>
          Applying an agreed review creates a new draft lease version. It never changes a
          commitment or a cash-flow entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Review date</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead className="text-right">Proposed</TableHead>
              <TableHead className="text-right">Agreed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((r) => {
              const id = str(r, "id")!;
              const status = str(r, "status")!;
              return (
                <TableRow key={id}>
                  <TableCell>{titleCase(str(r, "review_type"))}</TableCell>
                  <TableCell>{formatDate(str(r, "review_date"))}</TableCell>
                  <TableCell>{formatDate(str(r, "effective_date"))}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(nbr(r, "proposed_rent"), lease.currency ?? "EUR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(nbr(r, "agreed_rent"), lease.currency ?? "EUR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "applied" ? "default" : "outline"}>
                      {titleCase(status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {status !== "applied" && nbr(r, "agreed_rent") != null ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!capabilities.canManage || actions.isPending}
                        onClick={() => actions.run("applyReview", { reviewId: id })}
                      >
                        Apply
                      </Button>
                    ) : status !== "applied" && capabilities.canRecord ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={actions.isPending}
                        onClick={() =>
                          actions.run("upsertReview", {
                            id,
                            leaseId: lease.lease_id,
                            reviewDate: str(r, "review_date")!,
                            effectiveDate: str(r, "effective_date")!,
                            agreedRent: nbr(r, "proposed_rent") ?? undefined,
                            status: "agreed",
                          })
                        }
                      >
                        Agree proposed
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {capabilities.canRecord ? (
          <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-5">
            <Select
              value={form.reviewType}
              onValueChange={(v) => setForm((f) => ({ ...f, reviewType: v }))}
            >
              <SelectTrigger aria-label="Review type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.reviewDate}
              onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
              aria-label="Review date"
            />
            <Input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
              aria-label="Effective date"
            />
            <Input
              placeholder="Proposed rent"
              value={form.proposedRent}
              onChange={(e) => setForm((f) => ({ ...f, proposedRent: e.target.value }))}
              aria-label="Proposed rent"
            />
            <Button
              size="sm"
              disabled={!form.reviewDate || !form.effectiveDate || actions.isPending}
              onClick={() =>
                actions.run("upsertReview", {
                  leaseId: lease.lease_id,
                  reviewType: form.reviewType,
                  reviewDate: form.reviewDate,
                  effectiveDate: form.effectiveDate,
                  proposedRent: num(form.proposedRent),
                  currentRent: lease.base_rent ?? undefined,
                })
              }
            >
              Schedule review
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------ breaks & notices */

function BreaksPanel({
  lease,
  actions,
  capabilities,
}: {
  lease: LeaseSummary;
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const { data: breaks = [] } = useLeaseBreaks(lease.lease_id);
  const { data: notices = [] } = useLeaseNotices(lease.lease_id);
  const [win, setWin] = useState("");
  const [type, setType] = useState("tenant");
  const [days, setDays] = useState("180");
  const [noticeType, setNoticeType] = useState("general");
  const [summary, setSummary] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Break options</CardTitle>
          <CardDescription>
            Notice deadlines are derived from the window and the notice period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Notice by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {breaks.map((b) => {
                const id = str(b, "id")!;
                return (
                  <TableRow key={id}>
                    <TableCell>{titleCase(str(b, "break_type"))}</TableCell>
                    <TableCell>
                      {formatDate(str(b, "window_start"))} → {formatDate(str(b, "window_end"))}
                    </TableCell>
                    <TableCell>{formatDate(str(b, "notice_deadline"))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{titleCase(str(b, "status"))}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {str(b, "status") === "open" && capabilities.canRecord ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actions.isPending}
                          onClick={() =>
                            actions.run("recordNotice", {
                              leaseId: lease.lease_id,
                              noticeType: "break",
                              breakId: id,
                              summary: "Break notice served",
                            })
                          }
                        >
                          Serve notice
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {capabilities.canRecord ? (
            <div className="flex flex-wrap gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-40" aria-label="Break type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BREAK_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="w-44"
                value={win}
                onChange={(e) => setWin(e.target.value)}
                aria-label="Break window start"
              />
              <Input
                className="w-32"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                aria-label="Notice days"
              />
              <Button
                size="sm"
                disabled={!win || actions.isPending}
                onClick={() =>
                  actions.run("upsertBreak", {
                    leaseId: lease.lease_id,
                    breakType: type,
                    windowStart: win,
                    noticeDays: num(days),
                  })
                }
              >
                Add break
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Notices</CardTitle>
          <CardDescription>Every notice served by or to the tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Served</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((n) => (
                <TableRow key={str(n, "id")}>
                  <TableCell>{titleCase(str(n, "notice_type"))}</TableCell>
                  <TableCell>{formatDate(str(n, "served_on"))}</TableCell>
                  <TableCell>{formatDate(str(n, "effective_date"))}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {str(n, "summary") ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {capabilities.canRecord ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={noticeType} onValueChange={setNoticeType}>
                  <SelectTrigger className="w-44" aria-label="Notice type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={actions.isPending}
                  onClick={() =>
                    actions.run("recordNotice", {
                      leaseId: lease.lease_id,
                      noticeType,
                      summary: summary || undefined,
                    })
                  }
                >
                  Record notice
                </Button>
              </div>
              <Textarea
                rows={2}
                placeholder="Summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                aria-label="Notice summary"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------- guarantees */

function GuaranteesPanel({ lease }: { lease: LeaseSummary }) {
  const { data: guarantors = [] } = useLeaseGuarantors(lease.lease_id);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Guarantees &amp; deposit</CardTitle>
        <CardDescription>
          Security held against the lease. The deposit itself is a contract reference — the money
          lives in banking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Line
          label="Deposit"
          value={formatMoneyPrecise(lease.deposit_amount, lease.currency ?? "EUR")}
        />
        <Line label="Deposit expiry" value={formatDate(lease.deposit_expiry_date)} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guarantor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guarantors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No guarantees recorded.
                </TableCell>
              </TableRow>
            ) : (
              guarantors.map((g) => (
                <TableRow key={str(g, "id")}>
                  <TableCell>{str(g, "name")}</TableCell>
                  <TableCell>{titleCase(str(g, "guarantee_type"))}</TableCell>
                  <TableCell className="text-right">
                    {formatMoneyPrecise(nbr(g, "guarantee_amount"), lease.currency ?? "EUR")}
                  </TableCell>
                  <TableCell>{formatDate(str(g, "expiry_date"))}</TableCell>
                  <TableCell>{titleCase(str(g, "status"))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ documents */

function DocumentsPanel({ lease }: { lease: LeaseSummary }) {
  const { data: documents = [] } = useLeaseDocuments(lease.lease_id);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Documents</CardTitle>
        <CardDescription>
          Leases, addenda, guarantees, certificates and correspondence, held in the single
          portfolio document model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents linked to this lease yet. Attach them from the property document
            workspace.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={str(d, "id")}>
                  <TableCell>{str(d, "title")}</TableCell>
                  <TableCell>{titleCase(str(d, "category"))}</TableCell>
                  <TableCell>{formatDate(str(d, "issue_date"))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export const LEASE_PAYMENT_FREQUENCIES = PAYMENT_FREQUENCIES;
