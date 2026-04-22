"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

type DashboardShellProps = {
  children: React.ReactNode;
  role: "farmer" | "fpo";
  districtLabel?: string;
};



export function DashboardShell({ children, role, districtLabel }: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();

  const { dict } = useI18n();

  const currentTab = searchParams.get("tab");
  const basePath = role === "fpo" ? "/dashboard/fpo" : "/dashboard";
  const hubTitle = role === "fpo" ? dict.fpo.dashboardTitle : dict.farmer.dashboardTitle;

  const FARMER_LINKS = [
    { tab: null,              icon: "dashboard",             label: dict.farmer.dashboardTitle },
    { tab: "heatmap",         icon: "map",                   label: dict.farmer.heatmap.title },
    { tab: "inventory",       icon: "inventory_2",            label: dict.farmer.tabs.listings },
    { tab: "recommendations", icon: "insights",              label: dict.farmer.tabs.whereToSell },
    { tab: "directory",       icon: "groups",                label: dict.farmer.tabs.findFpo },
    { tab: "earnings",        icon: "payments",              label: dict.farmer.tabs.earnings },
    { tab: "alerts",          icon: "notifications_active",  label: dict.farmer.tabs.alerts },
  ];

  const FPO_LINKS = [
    { tab: null,              icon: "map",                   label: dict.fpo.heatmap.title || "Heatmap" },
    { tab: "inventory",       icon: "inventory_2",            label: dict.fpo.tabs.inventory },
    { tab: "recommendations", icon: "insights",              label: dict.fpo.tabs.recommendations },
    { tab: "directory",       icon: "groups",                label: dict.fpo.tabs.directory },
    { tab: "alerts",          icon: "notifications_active",  label: dict.fpo.tabs.alerts },
  ];

  const links = role === "fpo" ? FPO_LINKS : FARMER_LINKS;

  function isActive(tab: string | null) {
    if (tab === null) return pathname === basePath && !currentTab;
    return currentTab === tab;
  }

  function href(tab: string | null) {
    if (tab === null) return basePath;
    return `${basePath}?tab=${tab}`;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa] text-[#191c1d]">

      {/* ── SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col h-full py-4 bg-slate-50 w-64 sticky top-0 shrink-0 overflow-y-auto">
        {/* Hub title */}
        <div className="px-6 mb-8">
          <h1 className="text-lg font-bold text-emerald-900 font-headline">{hubTitle}</h1>
          <p className="text-xs text-slate-500">
            {districtLabel ? `District: ${districtLabel}` : "AgriFlow Platform"}
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-2">
          {links.map((link) => {
            const active = isActive(link.tab);
            return (
              <Link
                key={link.label}
                href={href(link.tab)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ease-in-out",
                  active
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-slate-600 hover:text-emerald-700 hover:bg-slate-100",
                )}
              >
                <span className="material-symbols-outlined text-[20px]" data-icon={link.icon}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-4 mt-6 space-y-0.5 border-t border-slate-200 pt-4">
          <Link
            href={`${basePath}?tab=settings`}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              currentTab === "settings"
                ? "bg-emerald-100 text-emerald-800"
                : "text-slate-600 hover:text-emerald-700 hover:bg-slate-100",
            )}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="settings">settings</span>
            {dict.common.settings || "Settings"}
          </Link>
          <a
            href="mailto:support@agriflow.in"
            className="flex items-center gap-3 text-slate-600 px-4 py-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="help">help</span>
            {dict.common.support || "Support"}
          </a>
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Glass header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center w-full px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-black text-emerald-800 font-headline hover:opacity-80 transition-opacity">
              AgriFlow
            </Link>
            <nav className="hidden md:flex gap-6 font-headline font-semibold text-sm">
              <Link
                href={basePath}
                className={cn(
                  "py-1 transition-colors",
                  !currentTab || currentTab === "overview"
                    ? "text-emerald-700 border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-emerald-600 px-2 rounded hover:bg-emerald-50"
                )}
              >
                Market Insights
              </Link>
              <Link
                href={`${basePath}?tab=recommendations`}
                className={cn(
                  "py-1 transition-colors",
                  currentTab === "recommendations"
                    ? "text-emerald-700 border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-emerald-600 px-2 rounded hover:bg-emerald-50"
                )}
              >
                Logistics
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}?tab=alerts`}
              className="p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors relative"
              aria-label="Alerts"
            >
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </Link>
            <div className="h-9 w-9 rounded-full overflow-hidden border border-emerald-200 flex items-center justify-center bg-emerald-50">
              {isLoaded && isSignedIn ? (
                <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
              ) : (
                <SignInButton mode="redirect">
                  <button className="text-xs font-semibold text-primary px-2">Sign in</button>
                </SignInButton>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
