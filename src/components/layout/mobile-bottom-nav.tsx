"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  UserCircle,
} from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const FARMER_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  {
    isAction: true,
    href: "https://wa.me/14155238886?text=Hi",
    label: "Ask WhatsApp",
    icon: MessageCircle,
  },
  { href: "/register/farmer", label: "Profile", icon: UserCircle },
] as const;

const FPO_NAV_ITEMS = [
  { href: "/dashboard/fpo", label: "Dashboard", icon: Home },
  {
    isAction: true,
    href: "https://wa.me/14155238886?text=Hi",
    label: "Chat Support",
    icon: MessageCircle,
  },
  { href: "/register/fpo", label: "Profile", icon: UserCircle },
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
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/70 bg-background/95 backdrop-blur-xl sm:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if ("isAction" in item && item.isAction) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative -top-5 flex flex-col items-center justify-center gap-1"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
                  <Icon className="size-7" />
                </div>
                <span className="text-[11px] font-semibold text-[#25D366]">
                  {item.label}
                </span>
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-6 transition-all duration-200",
                  isActive ? "scale-110 text-primary" : "",
                )}
              />
              <span>
                {item.label === "Dashboard"
                  ? dict.nav[variant]
                  : item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for phones with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
