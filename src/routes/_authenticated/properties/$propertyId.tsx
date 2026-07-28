import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArrowLeft, Building2, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { hasAnyRole, useWorkspace } from "@/hooks/use-workspace";
import { formatMoney, formatPercent, titleCase } from "@/lib/format";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "@/modules/realestate/constants";
import { fullAddress, useProperty, usePropertyProjects } from "@/modules/realestate/queries";
import {
  DepreciationTab,
  DetailsTab,
  DocumentsTab,
  FinancingTab,
  InsuranceTab,
  OverviewTab,
  ProjectsTab,
  TenanciesTab,
  TimelineTab,
} from "@/modules/realestate/components/property-tabs";

export const Route = createFileRoute("/_authenticated/properties/$propertyId")({
  head: () => ({
    meta: [
      { title: "Property workspace — Pedra Rioja" },
      {
        name: "description",
        content:
          "One asset in full: valuation, financing, tenancies, projects, insurance, documents and its complete timeline.",
      },
      { property: "og:title", content: "Property workspace — Pedra Rioja" },
      {
        property: "og:description",
        content:
          "One asset in full: valuation, financing, tenancies, projects, insurance, documents and its complete timeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyWorkspace,
});

const TABS = [
  ["overview", "Overview"],
  ["details", "Details"],
  ["financing", "Financing"],
  ["tenancies", "Tenancies"],
  ["projects", "Projects"],
  ["valuations", "Valuations"],
  ["insurance", "Insurance"],
  ["depreciation", "Depreciation"],
  ["documents", "Documents"],
  ["timeline", "Timeline"],
] as const;

function PropertyWorkspace() {
  const { propertyId } = Route.useParams();
  const { data: workspace } = useWorkspace();
  const { data, isLoading } = useProperty(propertyId);
  const projects = usePropertyProjects(propertyId);

  const canEdit = hasAnyRole(workspace?.roles, ["owner", "manager"]);
  const canRecord = hasAnyRole(workspace?.roles, ["owner", "manager", "bookkeeper", "assistant"]);
  const currency = workspace?.company?.base_currency ?? "EUR";

  if (isLoading) {
    return (
      <AppShell title="Property">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!data?.property) {
    return (
      <AppShell title="Property not found" description="This asset is not in your register.">
        <Card>
          <CardContent className="py-12 text-center">
            <Button asChild variant="outline">
              <Link to="/properties">
                <ArrowLeft className="size-4" /> Back to register
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const property = data.property;
  const summary = data.summary as Record<string, unknown> | null;
  const activeProjects = (projects.data ?? []).filter((p) =>
    ["planned", "active", "in_progress"].includes(p.status),
  ).length;

  const ctx = { property, summary, currency, canEdit, canRecord };

  return (
    <AppShell
      title={`${property.code ?? ""} · ${property.name}`}
      description={fullAddress(property) || "No address recorded"}
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to="/properties">
              <ArrowLeft className="size-4" /> Register
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!property.drive_folder_url}
            title={
              property.drive_folder_url
                ? "Open the Drive folder"
                : "Drive folder queued — connects in Phase 2.5"
            }
            onClick={() =>
              property.drive_folder_url && window.open(property.drive_folder_url, "_blank")
            }
          >
            <ExternalLink className="size-4" /> Open in Google Drive
          </Button>
          {canEdit ? <EditPropertyDialog property={property} /> : null}
          {canEdit ? <ArchiveButton property={property} /> : null}
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex size-20 items-center justify-center rounded-md bg-muted">
          <Building2 className="size-8 text-muted-foreground/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-foreground">{property.code ?? "—"}</p>
          <h2 className="font-display text-2xl font-semibold">{property.name}</h2>
          <p className="text-sm text-muted-foreground">{fullAddress(property) || "No address"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{titleCase(property.property_type)}</Badge>
          <Badge>{titleCase(property.status)}</Badge>
          <Badge variant="outline">
            {summary?.occupancy_pct === null || summary?.occupancy_pct === undefined
              ? "No units"
              : `${formatPercent(summary.occupancy_pct as number)} let`}
          </Badge>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <SummaryCard label="Purchase price" value={formatMoney(summary?.purchase_price as number, currency)} />
        <SummaryCard
          label="Total acquisition cost"
          value={formatMoney(summary?.acquisition_total as number, currency)}
        />
        <SummaryCard
          label="Current valuation"
          value={formatMoney(summary?.current_valuation as number, currency, "Not valued")}
        />
        <SummaryCard label="Outstanding debt" value={formatMoney(summary?.outstanding_debt as number, currency)} />
        <SummaryCard label="Estimated equity" value={formatMoney(summary?.estimated_equity as number, currency)} />
        <SummaryCard label="Monthly rent" value={formatMoney(summary?.monthly_rent as number, currency)} />
        <SummaryCard
          label="Cash generated YTD"
          value="Not available yet"
          note="Needs the bookkeeping module"
          muted
        />
        <SummaryCard
          label="Occupancy"
          value={
            summary?.occupancy_pct === null || summary?.occupancy_pct === undefined
              ? "No units recorded"
              : formatPercent(summary.occupancy_pct as number)
          }
        />
        <SummaryCard label="Active projects" value={String(activeProjects)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5 flex h-auto flex-wrap justify-start">
          {TABS.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab {...ctx} />
        </TabsContent>
        <TabsContent value="details">
          <DetailsTab {...ctx} />
        </TabsContent>
        <TabsContent value="financing">
          <FinancingTab {...ctx} />
        </TabsContent>
        <TabsContent value="tenancies">
          <TenanciesTab {...ctx} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsTab {...ctx} />
        </TabsContent>
        <TabsContent value="valuations">
          <ValuationsTabWrapper {...ctx} />
        </TabsContent>
        <TabsContent value="insurance">
          <InsuranceTab {...ctx} />
        </TabsContent>
        <TabsContent value="depreciation">
          <DepreciationTab {...ctx} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab {...ctx} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab {...ctx} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  note,
  muted,
}: {
  label: string;
  value: string;
  note?: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
        <p
          className={`mt-1 font-display text-xl font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}
        >
          {value}
        </p>
        {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

/* Re-exported here so the valuations tab keeps the same props contract. */
function ValuationsTabWrapper(props: Parameters<typeof DetailsTab>[0]) {
  const { ValuationsTab } = require("@/modules/realestate/components/property-tabs");
  return <ValuationsTab {...props} />;
}

function EditPropertyDialog({ property }: { property: ReturnType<typeof useProperty>["data"] extends infer T ? NonNullable<T extends { property: infer P } ? P : never> : never }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: property.name,
    property_type: property.property_type,
    status: property.status,
    address_line1: property.address_line1 ?? "",
    city: property.city ?? "",
    postal_code: property.postal_code ?? "",
    district: property.district ?? "",
    gross_area_m2: property.gross_area_m2 ? String(property.gross_area_m2) : "",
    area_m2: property.area_m2 ? String(property.area_m2) : "",
    acquisition_date: property.acquisition_date ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({
          name: form.name.trim(),
          property_type: form.property_type,
          status: form.status,
          address_line1: form.address_line1 || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          district: form.district || null,
          gross_area_m2: form.gross_area_m2 ? Number(form.gross_area_m2) : null,
          area_m2: form.area_m2 ? Number(form.area_m2) : null,
          acquisition_date: form.acquisition_date || null,
        })
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", property.id] });
      queryClient.invalidateQueries({ queryKey: ["property-register"] });
      setOpen(false);
      toast.success("Property updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit property</DialogTitle>
            <DialogDescription>
              The property code {property.code} is generated and cannot be renamed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm">Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Type</Label>
              <Select
                value={form.property_type}
                onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {[
              ["address_line1", "Address"],
              ["city", "City"],
              ["postal_code", "Postal code"],
              ["district", "District"],
              ["gross_area_m2", "Gross area (m²)"],
              ["area_m2", "Usable area (m²)"],
            ].map(([key, label]) => (
              <div key={key}>
                <Label className="mb-1.5 block text-sm">{label}</Label>
                <Input
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <Label className="mb-1.5 block text-sm">Acquisition date</Label>
              <Input
                type="date"
                value={form.acquisition_date}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ArchiveButton({ property }: { property: { id: string; status: string; code: string | null } }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const archived = property.status === "archived";

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({ status: archived ? "owned" : "archived" })
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", property.id] });
      queryClient.invalidateQueries({ queryKey: ["property-register"] });
      toast.success(archived ? "Property restored" : `${property.code} archived`);
      if (!archived) navigate({ to: "/properties" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Button variant="outline" size="sm" onClick={() => archive.mutate()} disabled={archive.isPending}>
      <Archive className="size-4" /> {archived ? "Restore" : "Archive"}
    </Button>
  );
}
