/**
 * Acquisition pipeline — board and register.
 *
 * Both views read the derived `v_acquisition_pipeline`. Weighted estimates are
 * computed in the database, never here, and they are labelled as indicative
 * throughout so nobody mistakes them for portfolio value.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney } from "@/lib/format";
import type { AcquisitionOpportunity } from "@/modules/acquisitions/queries";
import { ACQUISITION_STAGES, OPPORTUNITY_TYPES, labelOf } from "@/modules/acquisitions/schemas";
import { StageBadge } from "./status-badge";

export function AcquisitionPipeline({ rows }: { rows: AcquisitionOpportunity[] }) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [type, setType] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showArchived && r.is_archived) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (type !== "all" && r.opportunity_type !== type) return false;
      if (!q) return true;
      return [r.reference, r.title, r.property_name, r.location, r.address, r.source].some((v) =>
        (v ?? "").toLowerCase().includes(q),
      );
    });
  }, [rows, search, stage, type, showArchived]);

  const weighted = visible.reduce((sum, r) => sum + Number(r.weighted_estimate ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acquisition pipeline</CardTitle>
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities…"
            className="h-9 w-56"
            aria-label="Search opportunities"
          />
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-48" aria-label="Filter by stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {ACQUISITION_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-44" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {OPPORTUNITY_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="ao-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
              aria-label="Show archived"
            />
            <Label htmlFor="ao-archived" className="text-sm text-muted-foreground">
              Show archived
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No opportunities yet. Add one to start tracking a deal from lead through to an accepted
            offer.
          </p>
        ) : (
          <Tabs defaultValue="board">
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="pt-4">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {ACQUISITION_STAGES.map((s) => {
                  const column = visible.filter((r) => r.stage === s.value);
                  const total = column.reduce(
                    (sum, r) => sum + Number(r.weighted_estimate ?? 0),
                    0,
                  );
                  return (
                    <div key={s.value} className="w-64 shrink-0">
                      <div className="flex items-center justify-between px-1 pb-2">
                        <p className="text-sm font-medium">{s.label}</p>
                        <Badge variant="secondary">{column.length}</Badge>
                      </div>
                      <p className="px-1 pb-2 text-xs text-muted-foreground">
                        {formatMoney(total)} weighted
                      </p>
                      <div className="space-y-2">
                        {column.map((r) => (
                          <Link
                            key={r.opportunity_id}
                            to="/acquisitions/$opportunityId"
                            params={{ opportunityId: r.opportunity_id }}
                            className="block rounded-md border bg-card p-3 transition-colors hover:bg-accent/40"
                          >
                            <p className="text-xs text-muted-foreground">{r.reference}</p>
                            <p className="text-sm font-medium">{r.title}</p>
                            <p className="pt-1 text-xs text-muted-foreground">
                              {formatMoney(r.asking_price)} asking · {r.probability}%
                            </p>
                          </Link>
                        ))}
                        {column.length === 0 ? (
                          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                            Nothing here
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="register" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Asking</TableHead>
                    <TableHead className="text-right">Weighted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.opportunity_id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/acquisitions/$opportunityId"
                          params={{ opportunityId: r.opportunity_id }}
                          className="hover:underline"
                        >
                          {r.reference}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {r.title}
                        {r.is_archived ? (
                          <Badge variant="outline" className="ml-2">
                            Archived
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={r.stage} />
                      </TableCell>
                      <TableCell>{labelOf(OPPORTUNITY_TYPES, r.opportunity_type)}</TableCell>
                      <TableCell>{formatDate(r.target_acquisition_date)}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.asking_price)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(r.weighted_estimate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-sm text-muted-foreground">
                      Weighted pipeline in view (indicative only)
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(weighted)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
