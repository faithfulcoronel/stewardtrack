import Link from "next/link";
import { Church, Twitter, Linkedin, Facebook, Mail } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground transition-opacity hover:opacity-80">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Church className="size-5 text-primary" />
            </div>
            <span>StewardTrack</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/#features">
              Features
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/#pricing">
              Pricing
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/#how-it-works">
              How It Works
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/about">
              About
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/contact">
              Contact
            </Link>
            {user ? (
              <>
                <Link
                  className="rounded-lg border border-border/60 px-4 py-2 text-foreground transition-colors hover:border-border hover:bg-muted/40"
                  href="/admin"
                >
                  Dashboard
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-lg border border-border/60 px-4 py-2 text-foreground transition-colors hover:border-border hover:bg-muted/40"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                  href="/signup"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            {user ? (
              <Link
                className="rounded-lg border border-border/60 px-3 py-1.5 text-sm text-foreground"
                href="/admin"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  className="text-sm text-muted-foreground"
                  href="/login"
                >
                  Sign in
                </Link>
                <Link
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  href="/signup"
                >
                  Try Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-4">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Church className="size-5 text-primary" />
                </div>
                <span>StewardTrack</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-6">
                Modern church management system designed to simplify administration and amplify ministry impact.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://twitter.com/stewardtrack"
                  className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Twitter"
                >
                  <Twitter className="size-4" />
                </a>
                <a
                  href="https://facebook.com/stewardtrack"
                  className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Facebook"
                >
                  <Facebook className="size-4" />
                </a>
                <a
                  href="https://linkedin.com/company/stewardtrack"
                  className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-4" />
                </a>
                <a
                  href="mailto:hello@stewardtrack.com"
                  className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Email"
                >
                  <Mail className="size-4" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Product</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="text-muted-foreground transition-colors hover:text-foreground">
                    Request Demo
                  </Link>
                </li>
                <li>
                  <Link href="/changelog" className="text-muted-foreground transition-colors hover:text-foreground">
                    Changelog
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap" className="text-muted-foreground transition-colors hover:text-foreground">
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Resources</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/guides" className="text-muted-foreground transition-colors hover:text-foreground">
                    Guides
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="text-muted-foreground transition-colors hover:text-foreground">
                    Support Center
                  </Link>
                </li>
                <li>
                  <Link href="/api" className="text-muted-foreground transition-colors hover:text-foreground">
                    API Reference
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Company</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-muted-foreground transition-colors hover:text-foreground">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 border-t border-border/60 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                © {year} StewardTrack. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link href="/privacy" className="transition-colors hover:text-foreground">
                  Privacy
                </Link>
                <Link href="/terms" className="transition-colors hover:text-foreground">
                  Terms
                </Link>
                <Link href="/cookies" className="transition-colors hover:text-foreground">
                  Cookies
                </Link>
                <Link href="/security" className="transition-colors hover:text-foreground">
                  Security
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
