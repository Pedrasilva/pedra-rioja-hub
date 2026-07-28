import { Link, useRouter, type LinkProps } from "@tanstack/react-router";
import {
  Building2,
  Landmark,

  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useWorkspace } from "@/hooks/use-workspace";

type NavItem = { to: LinkProps["to"]; label: string; icon: typeof LayoutDashboard; soon?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/cash-flow", label: "Cash flow", icon: Wallet },
  { to: "/banking", label: "Banking", icon: Landmark },
  { to: "/bookkeeping", label: "Bookkeeping", icon: Receipt },

  { to: "/team", label: "Team & roles", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const UPCOMING: { label: string; icon: typeof LayoutDashboard }[] = [];



export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: workspace } = useWorkspace();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const initials = (workspace?.fullName ?? workspace?.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-6 py-6">
          <p className="font-display text-xl leading-none font-semibold text-sidebar-accent-foreground">
            Pedra Rioja
          </p>
          <p className="mt-1 text-xs tracking-wide text-sidebar-foreground/60 uppercase">
            {workspace?.company?.name ?? "Workspace"}
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}

          {UPCOMING.length > 0 ? (
            <p className="px-3 pt-6 pb-2 text-[11px] tracking-widest text-sidebar-foreground/40 uppercase">
              Next phases
            </p>
          ) : null}
          {UPCOMING.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/35"
            >
              <Icon className="size-4" />
              {label}
            </div>
          ))}

        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {workspace?.fullName ?? workspace?.email}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                {workspace?.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role yet"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="mt-1 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-card px-6 py-6 md:px-10">
          <div>
            <h1 className="font-display text-2xl font-semibold">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="outline" size="sm" onClick={signOut} className="md:hidden">
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
