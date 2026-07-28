import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Landmark, Receipt, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pedra Rioja — Property Portfolio & Bookkeeping" },
      {
        name: "description",
        content:
          "Private workspace for the Pedra Rioja property portfolio: properties, tenancies, financing, construction and operational bookkeeping with Portuguese VAT.",
      },
      { property: "og:title", content: "Pedra Rioja — Property Portfolio & Bookkeeping" },
      {
        property: "og:description",
        content:
          "Private workspace for the Pedra Rioja property portfolio: properties, tenancies, financing and operational bookkeeping.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PILLARS = [
  {
    icon: Building2,
    title: "Property register",
    body: "Properties, units, ownership and documents as the backbone every other module points at.",
  },
  {
    icon: Receipt,
    title: "Operational bookkeeping",
    body: "Documents, VAT lines, payments and classifications — the PSA Hub model, kept company-agnostic.",
  },
  {
    icon: Landmark,
    title: "Financing & tenancies",
    body: "Mortgage schedules, rent rolls, fit-out receivables, all linked back to the right property.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Six roles enforced in the database, with a full audit trail of who changed what.",
  },
];

function Index() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
      else setChecked(true);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-semibold">Pedra Rioja</span>
        <Button asChild size="sm" variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="border-b border-border py-16 md:py-24">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Private workspace
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.1] font-semibold md:text-6xl">
            The portfolio, the paperwork and the money in one register.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Pedra Rioja tracks properties, construction projects, tenancies and financing, and books
            every transaction against them with Portuguese VAT recorded line by line.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">{checked ? "Enter the workspace" : "Enter the workspace"}</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="bg-card p-8">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          Phase 1 (foundation: company, users, roles, settings, audit trail) is live. The property
          register is next.
        </p>
      </main>
    </div>
  );
}
