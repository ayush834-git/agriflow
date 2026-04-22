import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteNav } from "@/components/layout/site-nav";
import { I18nProvider } from "@/lib/i18n/context";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AgriFlow",
    template: "%s | AgriFlow",
  },
  description:
    "AgriFlow is the intelligence layer for agricultural price gaps, farmer alerts, and FPO movement recommendations.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgriFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6b46",
};

import { WhatsAppWidget } from "@/components/ui/whatsapp-widget";
import { PageTransitionLoader } from "@/components/ui/page-transition-loader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{__html: `
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
          }
        `}} />
      </head>
      <body className="flex min-h-dvh flex-col relative overflow-x-hidden font-body bg-background text-on-surface antialiased">
        <I18nProvider>
          <AuthProvider>
            <QueryProvider>
              <PageTransitionLoader />
              <SiteNav />
              <div className="flex-1 min-w-0">{children}</div>
              <WhatsAppWidget />
            </QueryProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
