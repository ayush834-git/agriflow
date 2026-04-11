import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { MapProvider } from "@/components/providers/map-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SiteNav } from "@/components/layout/site-nav";
import { I18nProvider } from "@/lib/i18n/context";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col relative overflow-x-hidden">
        <I18nProvider>
          <AuthProvider>
            <MapProvider>
              <QueryProvider>
                <SiteNav />
                <div className="flex-1">{children}</div>
                <WhatsAppWidget />
              </QueryProvider>
            </MapProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
