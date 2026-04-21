"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";

export function DashboardShell({ children, role }: { children: React.ReactNode; role: "farmer" | "fpo" }) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  
  const fpoLinks = [
    { href: "/dashboard/fpo", icon: "map", label: "Heatmap" },
    { href: "/dashboard/fpo?tab=inventory", icon: "inventory_2", label: "Inventory" },
    { href: "/dashboard/fpo?tab=recommendations", icon: "insights", label: "Recommendations" },
    { href: "/dashboard/fpo?tab=directory", icon: "groups", label: "Directory" },
    { href: "/dashboard/fpo?tab=alerts", icon: "notifications_active", label: "Alerts" },
  ];

  const farmerLinks = [
    { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/dashboard?tab=heatmap", icon: "map", label: "Heatmap" },
    { href: "/dashboard?tab=inventory", icon: "inventory_2", label: "Inventory" },
    { href: "/dashboard?tab=recommendations", icon: "insights", label: "Recommendations" },
    { href: "/dashboard?tab=directory", icon: "groups", label: "Directory" },
  ];

  const links = role === "fpo" ? fpoLinks : farmerLinks;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <aside className="hidden lg:flex flex-col h-full py-4 space-y-2 bg-slate-50 dark:bg-slate-950 w-64 transition-all ease-in-out border-r border-border">
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 font-headline">
            {role === "fpo" ? "FPO Hub" : "Farmer Hub"}
          </h2>
          <p className="text-xs text-slate-500">District: Nashik</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href; // simplifed active check
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 font-medium text-sm transition-all ease-in-out mx-2 rounded-lg 
                  ${isActive 
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-100" 
                    : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
              >
                <span className="material-symbols-outlined" data-icon={link.icon}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="px-4 mt-auto space-y-1 border-t border-slate-200 dark:border-slate-800 pt-4">
          <Link href={`/register/${role}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 px-4 py-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-sm">
            <span className="material-symbols-outlined" data-icon="settings">settings</span> Settings
          </Link>
          <a href="#" className="flex items-center gap-3 text-slate-600 dark:text-slate-400 px-4 py-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-sm">
            <span className="material-symbols-outlined" data-icon="help">help</span> Support
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-surface flex flex-col relative w-full">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 shadow-sm dark:shadow-none bg-emerald-50/30 dark:bg-emerald-950/20">
          <div className="flex justify-between items-center w-full px-6 py-3">
            <div className="flex items-center gap-8">
              <span className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-headline">AgriFlow</span>
              <nav className="hidden md:flex gap-6">
                <a className="font-headline font-semibold text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-800/30 transition-colors px-3 py-1 rounded-lg" href="#">Market Insights</a>
                <a className="font-headline font-semibold text-emerald-700 dark:text-emerald-300 border-b-2 border-emerald-600 px-3 py-1" href="#">Logistics</a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full transition-colors">
                <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              </button>
              <div className="h-8 w-8 rounded-full overflow-hidden border border-emerald-200 flex items-center justify-center">
                {isLoaded && isSignedIn ? (
                  <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
                ) : (
                  <SignInButton mode="redirect">
                    <button className="text-xs font-semibold">Sign in</button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
