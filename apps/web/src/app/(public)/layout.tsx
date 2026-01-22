import { LandingHeader, LandingFooter } from "@/components/landing";
import { PublicThemeEnforcer } from "@/components/theme/public-theme-enforcer";

/**
 * Public Layout
 *
 * Provides consistent header and footer for all public pages
 * (login, signup, donate, etc.) using the landing page design.
 *
 * Theme is enforced to default light mode for consistent branding.
 * The theme selector floater is also hidden on these pages.
 * The "public-theme-fixed" class ensures theme CSS variables are fixed
 * to the default emerald theme from the first render (no flash).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-theme-fixed min-h-screen flex flex-col bg-white">
      <PublicThemeEnforcer />
      <LandingHeader />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
