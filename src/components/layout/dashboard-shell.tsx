"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

type DashboardShellProps = {
  children: React.ReactNode;
  role: "farmer" | "fpo";
  districtLabel?: string;
};

export function DashboardShell({ children, role, districtLabel }: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const currentTab = searchParams.get("tab");

  const fpoLinks = [
    { href: "/dashboard/fpo", tab: null, icon: "map", label: "Heatmap" },
    { href: "/dashboard/fpo?tab=inventory", tab: "inventory", icon: "inventory_2", label: "Inventory" },
    { href: "/dashboard/fpo?tab=recommendations", tab: "recommendations", icon: "insights", label: "Recommendations" },
    { href: "/dashboard/fpo?tab=directory", tab: "directory", icon: "groups", label: "Directory" },
    { href: "/dashboard/fpo?tab=alerts", tab: "alerts", icon: "notifications_active", label: "Alerts" },
  ];

  const farmerLinks = [
    { href: "/dashboard", tab: null, icon: "dashboard", label: "Dashboard" },
    { href: "/dashboard?tab=heatmap", tab: "heatmap", icon: "map", label: "Heatmap" },
    { href: "/dashboard?tab=inventory", tab: "inventory", icon: "inventory_2", label: "Inventory" },
    { href: "/dashboard?tab=recommendations", tab: "recommendations", icon: "insights", label: "Recommendations" },
    { href: "/dashboard?tab=directory", tab: "directory", icon: "groups", label: "Directory" },
  ];

  const links = role === "fpo" ? fpoLinks : farmerLinks;

  function isActive(link: { href: string; tab: string | null }) {
    if (role === "fpo") {
      if (link.tab === null) return pathname === "/dashboard/fpo" && !currentTab;
      return currentTab === link.tab;
    } else {
      if (link.tab === null) return pathname === "/dashboard" && !currentTab;
      return currentTab === link.tab;
    }
  }

  const hubTitle = role === "fpo" ? "FPO Hub" : "Farmer Hub";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col h-full py-4 bg-slate-50 w-64 sticky top-0 shrink-0">
        {/* Hub title */}
        <div className="px-6 mb-8">
          <h1 className="text-lg font-bold text-emerald-900 font-headline">{hubTitle}</h1>
          <p className="text-xs text-slate-500">
            {districtLabel ? `District: ${districtLabel}` : "AgriFlow Platform"}
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2">
          {links.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ease-in-out ${
                  active
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-slate-600 hover:text-emerald-600 hover:bg-slate-200/50"
                }`}
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
        <div className="px-4 mt-auto space-y-1 border-t border-slate-200 pt-4">
          <Link
            href={`/register/${role}`}
            className="flex items-center gap-3 text-slate-600 px-4 py-2 hover:bg-slate-200/50 rounded-lg text-sm"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="settings">settings</span>
            Settings
          </Link>
          <a
            href="#"
            className="flex items-center gap-3 text-slate-600 px-4 py-2 hover:bg-slate-200/50 rounded-lg text-sm"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="help">help</span>
            Support
          </a>
        </div>
      </aside>

      {/* ── Main canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Glass header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center w-full px-6 py-3 shadow-sm shrink-0">
          <div className="flex items-center gap-8">
            <span className="text-xl font-black text-emerald-800 font-headline">AgriFlow</span>
            <nav className="hidden md:flex gap-6 font-headline font-semibold text-sm">
              <a className="text-emerald-700 border-b-2 border-emerald-600 py-1" href="#">Market Insights</a>
              <a className="text-slate-500 hover:bg-emerald-50 transition-colors py-1 px-2 rounded" href="#">Logistics</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-emerald-50 rounded-full transition-colors">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
            <div className="h-9 w-9 rounded-full overflow-hidden border border-emerald-200 flex items-center justify-center bg-emerald-50">
              {isLoaded && isSignedIn ? (
                <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
              ) : (
                <SignInButton mode="redirect">
                  <button className="text-xs font-semibold text-primary">Sign in</button>
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
