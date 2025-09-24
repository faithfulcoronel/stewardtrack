/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeFloater } from "@/components/theme/theme-floater";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_THEME_ID } from "@/lib/themes";

export const metadata: Metadata = {
  title: "StewardTrack",
  description: "Launch a Supabase-powered SaaS landing and admin experience in minutes.",
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ThemeFloater />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
