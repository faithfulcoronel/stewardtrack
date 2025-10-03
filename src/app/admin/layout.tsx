import { redirect } from "next/navigation";

import { type AdminNavSection } from "@/components/admin/sidebar-nav";
import { AdminLayoutShell } from "@/components/admin/layout-shell";
import { signOut } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "General",
    items: [
      { title: "Overview", href: "/admin", icon: "dashboard" },
      { title: "Announcements", href: "/admin/announcements", icon: "modules" },
      { title: "Support", href: "/admin/support", icon: "support" },
      { title: "Modules", href: "/admin/modules", icon: "projects" },
    ],
  },
  {
    label: "Community",
    items: [{ title: "Members", href: "/admin/members", icon: "customers" }],
  },
  {
    label: "Financial",
    items: [
      { title: "Financial Overview", href: "/admin/financial-overview", icon: "finances" },
      { title: "Expenses", href: "/admin/expenses", icon: "expenses" },
      { title: "Reports", href: "/admin/reports", icon: "reports" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Security", href: "/admin/security", icon: "security" },
      { title: "RBAC Management", href: "/admin/security/rbac", icon: "shield" },
      { title: "Settings", href: "/admin/settings", icon: "settings" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Try to get linked member information
  const { data: memberData } = await supabase
    .from("members")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Determine display name: member name > user metadata > username from email
  let displayName: string;
  if (memberData?.first_name || memberData?.last_name) {
    displayName = [memberData.first_name, memberData.last_name].filter(Boolean).join(" ");
  } else if (user.user_metadata?.full_name) {
    displayName = user.user_metadata.full_name as string;
  } else if (user.email) {
    displayName = user.email.split("@")[0];
  } else {
    displayName = "Admin";
  }

  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const planLabel = (user.user_metadata?.plan as string | undefined) ?? "Pro";

  return (
    <AdminLayoutShell
      sections={NAV_SECTIONS}
      name={displayName}
      email={user.email ?? ""}
      avatarUrl={avatarUrl}
      planLabel={planLabel}
      logoutAction={signOut}
    >
      {children}
    </AdminLayoutShell>
  );
}

