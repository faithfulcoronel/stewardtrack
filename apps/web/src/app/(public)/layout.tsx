import { LandingHeader, LandingFooter } from "@/components/landing";

/**
 * Public Layout
 *
 * Provides consistent header and footer for all public pages
 * (login, signup, etc.) using the landing page design.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
