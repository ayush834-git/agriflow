"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  Map,
  Package,
  Store,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const FARMER_NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard#routes", label: "Routes", icon: Map },
  { href: "/dashboard#listings", label: "Listings", icon: Package },
  { href: "/dashboard#alerts", label: "Alerts", icon: BarChart3 },
] as const;

const FPO_NAV_ITEMS = [
  { href: "/dashboard/fpo", label: "Dashboard", icon: Home },
  { href: "/dashboard/fpo#overview", label: "Inventory", icon: Package },
  { href: "/dashboard/fpo#directory", label: "Directory", icon: Store },
  { href: "/dashboard/fpo#alerts", label: "Alerts", icon: BarChart3 },
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-xl sm:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around py-1.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/dashboard/fpo" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-all duration-200",
                  isActive ? "scale-110 text-primary" : "",
                )}
              />
              <span>
                {variant === "farmer" && item.href.endsWith("#alerts")
                  ? dict.farmer.tabs.alerts
                  : variant === "farmer" && item.href.endsWith("#listings")
                    ? dict.farmer.tabs.listings
                    : variant === "fpo" && item.href.endsWith("#alerts")
                      ? dict.fpo.tabs.alerts
                      : variant === "fpo" && item.href.endsWith("#directory")
                        ? dict.fpo.tabs.directory
                        : variant === "fpo" && item.href.endsWith("#overview")
                          ? dict.fpo.tabs.inventory
                          : item.label}
              </span>
              {isActive ? (
                <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </div>
      {/* Safe area for phones with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
