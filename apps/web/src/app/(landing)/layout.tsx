import type { Metadata } from 'next';

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

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout renders only the children (the landing page handles its own header/footer)
  return <>{children}</>;
}
