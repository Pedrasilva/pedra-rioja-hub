/**
 * Tenant register — the searchable list of tenant entities.
 */

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { titleCase } from "@/lib/format";
import type { TenantRow } from "@/modules/leases/queries";

export function TenantList({ rows }: { rows: TenantRow[] }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.code, r.legal_name, r.trading_name, r.tax_number, r.sector]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div>
          <CardTitle className="font-display">Tenant register</CardTitle>
          <CardDescription>
            Legal entities that occupy the portfolio. Tenants are archived, never deleted.
          </CardDescription>
        </div>
        <Input
          placeholder="Search tenants…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search tenants"
        />
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenants match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Trading name</TableHead>
                <TableHead>Tax number</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      to="/tenants/$tenantId"
                      params={{ tenantId: t.id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {t.code ?? titleCase(t.tenant_type)}
                    </div>
                  </TableCell>
                  <TableCell>{t.trading_name ?? "—"}</TableCell>
                  <TableCell>{t.tax_number ?? "—"}</TableCell>
                  <TableCell>{t.sector ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.archived_at ? "outline" : "secondary"}>
                      {t.archived_at ? "Archived" : titleCase(t.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
