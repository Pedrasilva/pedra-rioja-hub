import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, hasAnyRole, useWorkspace, type AppRole } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & roles — Pedra Rioja" },
      {
        name: "description",
        content: "People with access to the Pedra Rioja workspace and the role each one holds.",
      },
      { property: "og:title", content: "Team & roles — Pedra Rioja" },
      {
        property: "og:description",
        content: "People with access to the Pedra Rioja workspace and the role each one holds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

const ROLE_DUTIES: Record<AppRole, string> = {
  owner: "Full control, including company details and role assignment.",
  manager: "Runs the portfolio: properties, tenancies, projects, approvals.",
  bookkeeper: "Records documents, VAT, payments and reconciliations.",
  assistant: "Captures data and uploads documents; no approvals.",
  approver: "Reviews and approves documents and payments only.",
  viewer: "Read-only access to whatever the company shares.",
};

function TeamPage() {
  const { data: workspace } = useWorkspace();
  const canSeeAll = hasAnyRole(workspace?.roles, ["owner", "manager"]);

  const { data: members, isLoading } = useQuery({
    queryKey: ["team", workspace?.company?.id],
    enabled: Boolean(workspace?.company?.id),
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("company_id", workspace!.company!.id);
      if (error) throw error;

      const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      return ids.map((id) => ({
        id,
        profile: profiles?.find((p) => p.id === id) ?? null,
        roles: (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role),
      }));
    },
  });

  return (
    <AppShell
      title="Team & roles"
      description="Roles live in their own table and are enforced by the database, not the interface."
    >
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Workspace members</CardTitle>
          <CardDescription>
            {canSeeAll
              ? "Everyone with access to this company."
              : "You can only see your own access. Ask an owner for the full list."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : members?.length ? (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.profile?.full_name ?? "—"}
                      {m.id === workspace?.userId ? (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.profile?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.roles.map((r) => (
                          <Badge key={r} variant="secondary">
                            {ROLE_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No members visible.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-xl">What each role can do</CardTitle>
          <CardDescription>
            Role changes are owner-only and will get an interface in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {(Object.keys(ROLE_DUTIES) as AppRole[]).map((role) => (
            <div key={role} className="flex flex-wrap items-baseline gap-x-3 py-3 first:pt-0">
              <span className="w-28 text-sm font-semibold">{ROLE_LABELS[role]}</span>
              <span className="text-sm text-muted-foreground">{ROLE_DUTIES[role]}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
