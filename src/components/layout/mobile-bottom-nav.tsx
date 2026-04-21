"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const FARMER_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/dashboard?tab=markets", label: "Markets", icon: "bar_chart" },
  {
    isAction: true,
    href: "https://wa.me/14155238886?text=Hi",
    icon: "add",
    label: "",
  },
  { href: "/dashboard?tab=crops", label: "Crops", icon: "inventory" },
  { href: "/register/farmer", label: "Account", icon: "person" },
] as const;

const FPO_NAV_ITEMS = [
  { href: "/dashboard/fpo", label: "Heatmap", icon: "map" },
  { href: "/dashboard/fpo?tab=inventory", label: "Inventory", icon: "inventory_2" },
  { href: "/dashboard/fpo?tab=directory", label: "Directory", icon: "groups" },
  { href: "/dashboard/fpo?tab=alerts", label: "Alerts", icon: "notifications_active" },
] as const;

type MobileBottomNavProps = {
  variant?: "farmer" | "fpo";
};

export function MobileBottomNav({ variant = "farmer" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const items = variant === "fpo" ? FPO_NAV_ITEMS : FARMER_NAV_ITEMS;

  return (
    <nav
      className="md:hidden glass-effect border-t-0 fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_-10px_20px_rgba(0,0,0,0.05)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-4 py-3">
        {items.map((item, idx) => {
          const isActive = pathname === item.href;

          if ("isAction" in item && item.isAction) {
            return (
               <a
                key={`action-${idx}`}
                href={item.href}
                className="bg-primary text-white -mt-12 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/40 border-4 border-background hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined text-3xl" data-icon={item.icon}>{item.icon}</span>
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
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
              <span className={cn("text-[10px] mt-1", isActive ? "font-bold" : "")}>
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
