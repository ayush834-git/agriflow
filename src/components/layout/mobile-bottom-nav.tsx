"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  variant?: "farmer" | "fpo";
};

export function MobileBottomNav({
  variant = "farmer",
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { dict } = useI18n();

  const farmerNavItems = [
    { href: "/dashboard", label: dict.farmer.dashboardTitle, icon: "home" },
    {
      href: "/dashboard?tab=markets",
      label: dict.farmer.tabs.marketPrices,
      icon: "bar_chart",
    },
    {
      isAction: true,
      href: "https://wa.me/14155238886?text=Hi",
      icon: "add",
      label: "",
    },
    {
      href: "/dashboard?tab=crops",
      label: dict.farmer.tabs.listings,
      icon: "inventory",
    },
    {
      href: "/register/farmer",
      label: dict.common.settings,
      icon: "person",
    },
  ] as const;

  const fpoNavItems = [
    { href: "/dashboard/fpo", label: dict.fpo.heatmap.monitor, icon: "map" },
    {
      href: "/dashboard/fpo?tab=inventory",
      label: dict.fpo.tabs.inventory,
      icon: "inventory_2",
    },
    {
      href: "/dashboard/fpo?tab=directory",
      label: dict.fpo.tabs.directory,
      icon: "groups",
    },
    {
      href: "/dashboard/fpo?tab=alerts",
      label: dict.fpo.tabs.alerts,
      icon: "notifications_active",
    },
  ] as const;

  const items = variant === "fpo" ? fpoNavItems : farmerNavItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-0 bg-white/90 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] backdrop-blur-md dark:bg-slate-900/90 md:hidden"
      aria-label={dict.common.mobileNavigation}
    >
      <div className="flex items-center justify-around px-4 py-3">
        {items.map((item, idx) => {
          const isActive = pathname === item.href;

          if ("isAction" in item && item.isAction) {
            return (
              <a
                key={`action-${idx}`}
                href={item.href}
                className="flex h-14 w-14 -mt-12 items-center justify-center rounded-full border-4 border-background bg-primary text-white shadow-lg shadow-primary/40 transition-transform hover:scale-105"
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  data-icon={item.icon}
                >
                  {item.icon}
                </span>
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-primary",
              )}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                data-icon={item.icon}
              >
                {item.icon}
              </span>
              <span className={cn("mt-1 text-[10px]", isActive ? "font-bold" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
