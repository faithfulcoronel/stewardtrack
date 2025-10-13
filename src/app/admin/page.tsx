/**
 * Admin Dashboard Page
 *
 * Landing page for authenticated administrators with onboarding resources.
 *
 * SECURITY: Protected by AccessGate requiring authentication.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { Gate } from "@/lib/access-gate";
import { ProtectedPage } from "@/components/access-gate";
import { getCurrentUser } from "@/lib/server/context";

export const metadata: Metadata = {
  title: "Admin | StewardTrack",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const gate = Gate.authenticated({ fallbackPath: "/login" });
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never";
  const appMetadata = JSON.stringify(user.app_metadata ?? {}, null, 2);

  return (
    <ProtectedPage gate={gate} userId={user.id}>
      <div className="space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in with Supabase. Extend this page with metrics, content, or role-based dashboards.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
              <h2 className="text-lg font-medium">Account overview</h2>
              <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <dt>Email</dt>
                  <dd className="font-medium text-foreground">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>User ID</dt>
                  <dd className="truncate font-mono text-xs text-muted-foreground">{user.id}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Status</dt>
                  <dd className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Active</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Last sign-in</dt>
                  <dd className="text-muted-foreground">{lastSignIn}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
              <h2 className="text-lg font-medium">Next steps</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>- Attach Supabase Row Level Security policies for multi-tenant data.</li>
                <li>- Build additional admin routes under <code>/admin</code>.</li>
                <li>- Connect usage analytics or telemetry of your choice.</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
              <h2 className="text-lg font-medium">Session payload</h2>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">{appMetadata}</pre>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
              <h2 className="text-lg font-medium">Resources</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href="https://supabase.com/docs"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Supabase docs
                  </Link>
                </li>
                <li>
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href="https://nextjs.org/docs"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Next.js docs
                  </Link>
                </li>
                <li>
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href="https://tailwindcss.com/docs"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Tailwind docs
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
