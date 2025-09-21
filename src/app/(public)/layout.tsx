import Link from "next/link";

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
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="flex w-full items-center justify-between px-6 py-4 sm:px-10 sm:py-5">
          <Link href="/" className="text-lg font-semibold text-foreground">
            Flowspace
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <Link className="transition hover:text-foreground" href="/#features">
              Features
            </Link>
            <Link className="transition hover:text-foreground" href="/#pricing">
              Pricing
            </Link>
            {user ? (
              <>
                <Link className="transition hover:text-foreground" href="/admin">
                  Admin
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full border border-border/60 px-4 py-1.5 text-foreground transition hover:border-border hover:bg-muted/40"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                className="rounded-full bg-foreground px-4 py-1.5 text-background transition hover:opacity-90"
                href="/login"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/60 bg-background py-8">
        <div className="flex w-full flex-col items-center gap-2 px-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-10">
          <p>Copyright {year} Flowspace. All rights reserved.</p>
          <p className="flex gap-3">
            <Link className="transition hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-foreground" href="/terms">
              Terms
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
