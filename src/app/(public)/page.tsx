import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:py-24">
      <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            Supabase SSR ready
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Launch your next product with authentication baked in.
          </h1>
          <p className="text-lg text-muted-foreground">
            StewardTrack pairs a polished marketing site with Supabase-powered user auth and an admin view. Ship your MVP,
            invite your first users, and manage access in hours-not weeks.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="px-6 py-3 text-sm font-medium">
              <Link href="/login">Enter the app</Link>
            </Button>
            <Button asChild variant="outline" className="border-border/60 px-6 py-3 text-sm font-medium">
              <Link href="/#features">Explore features</Link>
            </Button>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
            Built with Next.js 15 - Tailwind CSS - Supabase
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-background p-8 shadow-lg">
          <div
            className="absolute -left-32 -top-32 size-64 rounded-full bg-[color:var(--context-light-primary-light)] blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -right-14 bottom-8 size-48 rounded-full bg-[color:var(--context-light-info-light)] blur-3xl"
            aria-hidden
          />
          <div className="relative space-y-6">
            <h2 className="text-xl font-semibold">Everything connected</h2>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                Server-side Supabase session handling with <code>@supabase/ssr</code> for seamless redirects.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                Login and admin pages wired with modern Next.js server actions.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                Thoughtful UI scaffolding so you can focus on product logic.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="space-y-12">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold">Why teams choose StewardTrack</h2>
          <p className="text-muted-foreground">
            Get the critical foundations in place on day one.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
            <h3 className="text-lg font-medium">Production-ready auth</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Handle sign-ins, protected routes, and session-aware navigation without chasing boilerplate.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
            <h3 className="text-lg font-medium">Server-first architecture</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Lean on Next.js App Router, React Server Components, and ergonomic server actions to move faster.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
            <h3 className="text-lg font-medium">Composable design system</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Minimal styling, full Tailwind capabilities, and responsive defaults out of the box.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="space-y-6">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold">Simple pricing</h2>
          <p className="text-muted-foreground">
            Start with Supabase free tier and upgrade only when you scale.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
              Starter
            </p>
            <div>
              <span className="text-4xl font-semibold">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Perfect for solo founders validating ideas with Supabase free tier.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>- Landing page + login + admin</li>
              <li>- Email/password auth enabled</li>
              <li>- Ready for Vercel deploy</li>
            </ul>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-primary/40 bg-primary/10 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
              Growth
            </p>
            <div>
              <span className="text-4xl font-semibold">$29</span>
              <span className="text-sm text-primary">/month</span>
            </div>
            <p className="text-sm text-primary/80">
              Add automation, role-based dashboards, and API integrations.
            </p>
            <ul className="space-y-2 text-sm text-primary/80">
              <li>- Extend Supabase policies</li>
              <li>- Hook up webhooks & analytics</li>
              <li>- Priority support SLA</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
