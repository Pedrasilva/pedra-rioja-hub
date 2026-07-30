/**
 * Phase 8B — the reminder inbox.
 *
 * Reminders are derived from the dates already held on operational records:
 * renewals, expiries, instalments and obligation due dates. Refreshing
 * regenerates them from those dates rather than storing a second copy of the
 * schedule, so dismissing one never changes the underlying record.
 */

import { useMemo, useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDate } from "@/lib/format";
import type { CommitmentCapabilities } from "@/modules/commitments/capabilities";
import { Countdown, OperationalBadge } from "./operational-badge";
import type { OperationalReminder } from "@/modules/operations/queries";
import { operationalLabel } from "@/modules/operations/schemas";
import type { OperationsActions } from "@/modules/operations/server";

export function RemindersPanel({
  companyId,
  reminders,
  capabilities,
  actions,
  isLoading,
}: {
  companyId: string | undefined;
  reminders: OperationalReminder[];
  capabilities: CommitmentCapabilities;
  actions: OperationsActions;
  isLoading?: boolean;
}) {
  const [status, setStatus] = useState("pending");

  const visible = useMemo(
    () => reminders.filter((r) => status === "all" || r.status === status),
    [reminders, status],
  );

  const overdue = reminders.filter((r) => r.status === "pending" && r.is_overdue).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4" />
              Reminders
            </CardTitle>
            <CardDescription>
              {overdue > 0
                ? `${overdue} overdue across the operational registers.`
                : "Renewals, expiries and instalments ahead of their due dates."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44" aria-label="Filter reminders">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!capabilities.canRecord || !companyId || actions.isPending}
              onClick={() => actions.run("generateReminders", { companyId })}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reminders…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reminder</TableHead>
                <TableHead>Register</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Remind on</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Countdown</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.reminder_id}>
                  <TableCell className="font-medium">{r.title ?? "Reminder"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {operationalLabel(r.entity_type)}
                  </TableCell>
                  <TableCell>{operationalLabel(r.reason)}</TableCell>
                  <TableCell>{formatDate(r.remind_on)}</TableCell>
                  <TableCell>{formatDate(r.due_on)}</TableCell>
                  <TableCell>
                    <Countdown days={r.days_until_due} />
                  </TableCell>
                  <TableCell>
                    <OperationalBadge status={r.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {capabilities.canRecord && r.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actions.isPending}
                          onClick={() =>
                            actions.run("resolveReminder", {
                              reminderId: r.reminder_id,
                              status: "acknowledged",
                            })
                          }
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      {capabilities.canRecord && r.status !== "resolved" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actions.isPending}
                          onClick={() =>
                            actions.run("resolveReminder", {
                              reminderId: r.reminder_id,
                              status: "resolved",
                            })
                          }
                        >
                          Resolve
                        </Button>
                      ) : (
                        <OperationalBadge status={r.status} />
                      )}
                    </div>
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
