/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeFloater } from "@/components/theme/theme-floater";
import { Toaster } from "@/components/ui/sonner";
import { MobileProvider } from "@/components/mobile";
import { DEFAULT_THEME_ID } from "@/lib/themes";

export const metadata: Metadata = {
  title: "StewardTrack",
  description: "Church Management Made Simple - Manage memberships, donations, events, and communications all in one place.",
  manifest: "/manifest.json",
  applicationName: "StewardTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StewardTrack",
  },
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME_ID}
      data-mode="light"
      className="bg-background text-foreground"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Urbanist:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <MobileProvider
            statusBarStyle="dark"
            statusBarBackgroundColor="#ffffff"
            enableHaptics={true}
            adjustBodyForKeyboard={true}
          >
            <ThemeFloater />
            {children}
            <Toaster richColors closeButton position="top-right" />
          </MobileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
