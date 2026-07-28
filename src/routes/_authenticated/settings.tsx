import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { hasAnyRole, useWorkspace } from "@/hooks/use-workspace";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Pedra Rioja" },
      {
        name: "description",
        content: "Company details and personal profile settings for the Pedra Rioja workspace.",
      },
      { property: "og:title", content: "Settings — Pedra Rioja" },
      {
        property: "og:description",
        content: "Company details and personal profile settings for the Pedra Rioja workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const isOwner = hasAnyRole(workspace?.roles, ["owner"]);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    setFullName(workspace?.fullName ?? "");
    setCompanyName(workspace?.company?.name ?? "");
  }, [workspace?.fullName, workspace?.company?.name]);

  const saveProfile = async () => {
    if (!workspace) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null })
      .eq("id", workspace.userId);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  };

  const saveCompany = async () => {
    if (!workspace?.company) return;
    setSavingCompany(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: companyName.trim() })
      .eq("id", workspace.company.id);
    setSavingCompany(false);
    if (error) return toast.error(error.message);
    toast.success("Company updated");
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  };

  return (
    <AppShell title="Settings" description="Your profile and the company this workspace belongs to.">
      <div className="grid max-w-4xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Your profile</CardTitle>
            <CardDescription>Shown to other members of the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={workspace?.email ?? ""} disabled />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="w-fit">
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">Company</CardTitle>
            <CardDescription>
              {isOwner
                ? "Only owners can change company details."
                : "Read-only — ask an owner to make changes."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={!isOwner}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Base currency</Label>
              <Input id="currency" value={workspace?.company?.base_currency ?? ""} disabled />
            </div>
            {isOwner ? (
              <Button onClick={saveCompany} disabled={savingCompany} className="w-fit">
                {savingCompany ? "Saving…" : "Save company"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
