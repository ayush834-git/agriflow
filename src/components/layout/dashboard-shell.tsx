"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  role: "farmer" | "fpo";
  districtLabel?: string;
};

export function DashboardShell({
  children,
  role,
  districtLabel,
}: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const { dict, lang, setLang } = useI18n();

  const currentTab = searchParams.get("tab");
  const basePath = role === "fpo" ? "/dashboard/fpo" : "/dashboard";
  const hubTitle =
    role === "fpo" ? dict.fpo.dashboardTitle : dict.farmer.dashboardTitle;

  const farmerLinks = [
    { tab: null, icon: "dashboard", label: dict.farmer.dashboardTitle },
    { tab: "heatmap", icon: "map", label: dict.farmer.heatmap.title },
    { tab: "inventory", icon: "inventory_2", label: dict.farmer.tabs.listings },
    {
      tab: "recommendations",
      icon: "insights",
      label: dict.farmer.tabs.whereToSell,
    },
    { tab: "directory", icon: "groups", label: dict.farmer.tabs.findFpo },
    { tab: "earnings", icon: "payments", label: dict.farmer.tabs.earnings },
    { tab: "alerts", icon: "notifications_active", label: dict.farmer.tabs.alerts },
  ];

  const fpoLinks = [
    { tab: null, icon: "map", label: dict.fpo.heatmap.monitor },
    { tab: "inventory", icon: "inventory_2", label: dict.fpo.tabs.inventory },
    {
      tab: "recommendations",
      icon: "insights",
      label: dict.fpo.tabs.recommendations,
    },
    { tab: "directory", icon: "groups", label: dict.fpo.tabs.directory },
    { tab: "alerts", icon: "notifications_active", label: dict.fpo.tabs.alerts },
  ];

  const links = role === "fpo" ? fpoLinks : farmerLinks;

  function isActive(tab: string | null) {
    if (tab === null) {
      return pathname === basePath && !currentTab;
    }
    return currentTab === tab;
  }

  function href(tab: string | null) {
    if (tab === null) {
      return basePath;
    }
    return `${basePath}?tab=${tab}`;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      <aside className="sticky top-0 hidden h-full w-64 shrink-0 flex-col overflow-y-auto bg-slate-50 py-4 lg:flex">
        <div className="mb-8 px-6">
          <h1 className="font-headline text-lg font-bold text-emerald-900">
            {hubTitle}
          </h1>
          <p className="text-xs text-slate-500">
            {districtLabel
              ? `${dict.directory.district}: ${districtLabel}`
              : dict.common.platformName}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {links.map((link) => {
            const active = isActive(link.tab);
            return (
              <Link
                key={link.label}
                href={href(link.tab)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ease-in-out",
                  active
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700",
                )}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  data-icon={link.icon}
                >
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 space-y-0.5 border-t border-slate-200 px-4 pt-4">
          <Link
            href={`${basePath}?tab=settings`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              currentTab === "settings"
                ? "bg-emerald-100 text-emerald-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700",
            )}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              data-icon="settings"
            >
              settings
            </span>
            {dict.common.settings}
          </Link>
          <a
            href="mailto:support@agriflow.in"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="help">
              help
            </span>
            {dict.common.support}
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-between bg-white/80 px-6 py-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-headline text-xl font-black text-emerald-800 transition-opacity hover:opacity-80"
            >
              {dict.common.brandName}
            </Link>
            <nav className="hidden gap-6 font-headline text-sm font-semibold md:flex">
              <Link
                href={basePath}
                className={cn(
                  "py-1 transition-colors",
                  !currentTab || currentTab === "overview"
                    ? "border-b-2 border-emerald-600 text-emerald-700"
                    : "rounded px-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
                )}
              >
                {role === "fpo"
                  ? dict.fpo.tabs.inventory
                  : dict.farmer.tabs.marketPrices}
              </Link>
              <Link
                href={`${basePath}?tab=recommendations`}
                className={cn(
                  "py-1 transition-colors",
                  currentTab === "recommendations"
                    ? "border-b-2 border-emerald-600 text-emerald-700"
                    : "rounded px-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
                )}
              >
                {role === "fpo"
                  ? dict.fpo.tabs.recommendations
                  : dict.farmer.tabs.whereToSell}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(event) =>
                setLang(event.target.value as "en" | "hi" | "te" | "kn")
              }
              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 outline-none"
              aria-label={dict.common.language}
            >
              <option value="en">{dict.common.languageNames.en}</option>
              <option value="hi">{dict.common.languageNames.hi}</option>
              <option value="te">{dict.common.languageNames.te}</option>
              <option value="kn">{dict.common.languageNames.kn}</option>
            </select>

            <Link
              href={`${basePath}?tab=alerts`}
              className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-emerald-50"
              aria-label={dict.alerts.alertsAndInbox}
            >
              <span className="material-symbols-outlined" data-icon="notifications">
                notifications
              </span>
            </Link>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50">
              {isLoaded && isSignedIn ? (
                <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
              ) : (
                <SignInButton mode="redirect">
                  <button className="px-2 text-xs font-semibold text-primary">
                    {dict.nav.signIn}
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      </div>
    </div>
  );
}
