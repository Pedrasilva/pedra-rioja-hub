/**
 * Tenant workspace — the operational profile of one tenant.
 *
 * Contacts, linked leases, linked properties and units, and history.
 * Nothing here owns money; rent figures come from the rent-roll view.
 */

import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoneyPrecise, titleCase } from "@/lib/format";
import type { LeaseCapabilities } from "@/modules/leases/capabilities";
import {
  useRentRoll,
  useTenantContacts,
  useTenantLeases,
  type TenantRow,
} from "@/modules/leases/queries";
import type { LeaseActions } from "@/modules/leases/server";

type Row = Record<string, unknown>;
const str = (row: Row, key: string) => (row[key] == null ? null : String(row[key]));

export function TenantDetail({
  tenant,
  actions,
  capabilities,
}: {
  tenant: TenantRow;
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const { data: contacts = [] } = useTenantContacts(tenant.id);
  const { data: leases = [] } = useTenantLeases(tenant.id);
  const { data: rentRoll = [] } = useRentRoll(tenant.company_id);
  const tenantUnits = rentRoll.filter((r) => r.tenant_id === tenant.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Status" value={tenant.archived_at ? "Archived" : titleCase(tenant.status)} />
        <Metric label="Leases" value={String(leases.length)} />
        <Metric label="Units occupied" value={String(tenantUnits.length)} />
        <Metric
          label="Contracted annual rent"
          value={formatMoneyPrecise(
            tenantUnits.reduce((sum, r) => sum + (r.annual_rent ?? 0), 0),
            tenantUnits[0]?.currency ?? "EUR",
          )}
        />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="units">Properties &amp; units</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Legal entity</CardTitle>
              <CardDescription>Registration and communication details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <Line label="Legal name" value={tenant.legal_name} />
              <Line label="Trading name" value={tenant.trading_name} />
              <Line label="Tax number" value={tenant.tax_number} />
              <Line label="Registration number" value={tenant.registration_number} />
              <Line label="Email" value={tenant.email} />
              <Line label="Phone" value={tenant.phone} />
              <Line label="Website" value={tenant.website} />
              <Line label="Sector" value={tenant.sector} />
              <Line label="Address" value={tenant.address} />
              <Line label="Entity type" value={titleCase(tenant.tenant_type)} />
            </CardContent>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                disabled={!capabilities.canManage || Boolean(tenant.archived_at) || actions.isPending}
                onClick={() => actions.run("archiveTenant", { tenantId: tenant.id })}
              >
                Archive tenant
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ContactsPanel
            tenant={tenant}
            contacts={contacts}
            actions={actions}
            capabilities={capabilities}
          />
        </TabsContent>

        <TabsContent value="leases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Leases</CardTitle>
              <CardDescription>Every lease where this tenant is the primary party.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lease</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No leases yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leases.map((l) => (
                      <TableRow key={l.lease_id}>
                        <TableCell>
                          <Link
                            to="/leases/$leaseId"
                            params={{ leaseId: l.lease_id }}
                            className="underline-offset-4 hover:underline"
                          >
                            {l.code ?? l.title ?? "Lease"}
                          </Link>
                        </TableCell>
                        <TableCell>{l.property_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(l.start_date)} → {formatDate(l.end_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(l.total_periodic_charge, l.currency ?? "EUR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{titleCase(l.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Occupied units</CardTitle>
              <CardDescription>Derived from the live rent roll.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Occupancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUnits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No units currently let to this tenant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenantUnits.map((r) => (
                      <TableRow key={r.rent_roll_id}>
                        <TableCell>
                          <Link
                            to="/properties/$propertyId"
                            params={{ propertyId: r.property_id }}
                            className="underline-offset-4 hover:underline"
                          >
                            {r.property_name ?? "Property"}
                          </Link>
                        </TableCell>
                        <TableCell>{r.unit_code ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatMoneyPrecise(r.rent, r.currency ?? "EUR")}
                        </TableCell>
                        <TableCell>{formatDate(r.end_date)}</TableCell>
                        <TableCell>{titleCase(r.occupancy_status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactsPanel({
  tenant,
  contacts,
  actions,
  capabilities,
}: {
  tenant: TenantRow;
  contacts: Row[];
  actions: LeaseActions;
  capabilities: LeaseCapabilities;
}) {
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Contacts</CardTitle>
        <CardDescription>People to contact at this tenant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No contacts recorded.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((c) => (
                <TableRow key={str(c, "id")}>
                  <TableCell>
                    {str(c, "name")}
                    {c.is_primary ? " · primary" : ""}
                  </TableCell>
                  <TableCell>{str(c, "role") ?? "—"}</TableCell>
                  <TableCell>{str(c, "email") ?? "—"}</TableCell>
                  <TableCell>{str(c, "phone") ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {capabilities.canRecord ? (
          <div className="grid gap-2 sm:grid-cols-5">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              aria-label="Contact name"
            />
            <Input
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              aria-label="Contact role"
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              aria-label="Contact email"
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              aria-label="Contact phone"
            />
            <Button
              size="sm"
              disabled={!form.name.trim() || actions.isPending}
              onClick={() => {
                actions.run("upsertContact", {
                  companyId: tenant.company_id,
                  tenantId: tenant.id,
                  name: form.name.trim(),
                  role: form.role || undefined,
                  email: form.email || undefined,
                  phone: form.phone || undefined,
                  isPrimary: contacts.length === 0,
                });
                setForm({ name: "", role: "", email: "", phone: "" });
              }}
            >
              Add contact
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
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
