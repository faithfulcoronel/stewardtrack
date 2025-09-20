import { redirect } from "next/navigation";

import { AdminSidebar, type AdminNavSection } from "@/components/admin/sidebar-nav";
import { ProfileMenu } from "@/components/admin/profile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Bell } from "lucide-react";

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

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.email ? user.email.split("@")[0] : "Admin");
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const planLabel = (user.user_metadata?.plan as string | undefined) ?? "Pro";

  return (
    <div className="flex min-h-screen bg-muted/10">
      <AdminSidebar sections={NAV_SECTIONS} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="w-full md:max-w-md lg:max-w-lg">
              <Input placeholder="Search projects, users..." className="w-full" />
            </div>
            <div className="flex items-center justify-end gap-3 md:gap-5">
              <Button variant="ghost" size="icon" className="rounded-full border border-border/60 text-muted-foreground">
                <Bell className="size-4" />
              </Button>
              <ProfileMenu
                name={name}
                email={user.email ?? ""}
                avatarUrl={avatarUrl}
                planLabel={planLabel}
                logoutAction={signOut}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
