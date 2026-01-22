import type { Metadata } from 'next';
import { PublicThemeEnforcer } from '@/components/theme/public-theme-enforcer';

export const metadata: Metadata = {
  title: 'StewardTrack - Modern Church Management System',
  description:
    'Simplify church management with StewardTrack. All-in-one platform for member management, events, giving, and communications. Trusted by 500+ churches.',
  keywords: [
    'church management software',
    'church management system',
    'church database',
    'church member management',
    'church giving software',
    'church event planning',
    'ministry management',
    'church communication',
  ],
  openGraph: {
    title: 'StewardTrack - Modern Church Management System',
    description:
      'Simplify church management with StewardTrack. All-in-one platform for member management, events, giving, and communications.',
    type: 'website',
    siteName: 'StewardTrack',
  },
};

/**
 * Landing Layout
 *
 * Theme is enforced to default light mode for consistent branding.
 * The landing page handles its own header/footer.
 * The "public-theme-fixed" class ensures theme CSS variables are fixed
 * to the default emerald theme from the first render (no flash).
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-theme-fixed">
      <PublicThemeEnforcer />
      {children}
    </div>
  );
}
