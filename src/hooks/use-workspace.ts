import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type Workspace = {
  userId: string;
  email: string | null;
  fullName: string | null;
  company: { id: string; name: string; base_currency: string } | null;
  roles: AppRole[];
};

async function fetchWorkspace(): Promise<Workspace | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role, company_id").eq("user_id", user.id),
  ]);

  const companyId = roles?.[0]?.company_id ?? null;
  let company: Workspace["company"] = null;
  if (companyId) {
    const { data } = await supabase
      .from("companies")
      .select("id, name, base_currency")
      .eq("id", companyId)
      .maybeSingle();
    company = data ?? null;
  }

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    company,
    roles: (roles ?? []).map((r) => r.role),
  };
}

export function useWorkspace() {
  return useQuery({ queryKey: ["workspace"], queryFn: fetchWorkspace });
}

export function hasAnyRole(roles: AppRole[] | undefined, allowed: AppRole[]) {
  return (roles ?? []).some((r) => allowed.includes(r));
}

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  manager: "Manager",
  bookkeeper: "Bookkeeper",
  assistant: "Assistant",
  approver: "Approver",
  viewer: "Viewer",
};
