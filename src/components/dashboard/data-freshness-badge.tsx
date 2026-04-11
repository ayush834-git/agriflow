"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DataFreshnessBadgeProps = {
  generatedAt: string;
  source: "live" | "mock";
  className?: string;
};



import { useI18n } from "@/lib/i18n/context";

export function DataFreshnessBadge({
  generatedAt,
  source,
  className,
}: DataFreshnessBadgeProps) {
  const { dict } = useI18n();
  const tone =
    source === "live"
      ? "border-emerald-200 bg-emerald-100 text-emerald-900"
      : "border-amber-200 bg-amber-100 text-amber-900";

  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000),
  );

  let freshnessText = "";
  // Check if dict.fpo exists to safely use fpo badges (useful if used in farmer dashboard too)
  const updatedWord = dict.fpo?.badges?.updated ?? "Updated";

  if (diffMinutes < 1) {
    freshnessText = dict.fpo?.badges?.updatedNow?.split(" · ")[0] ?? "Updated just now";
  } else if (diffMinutes < 60) {
    freshnessText = `${updatedWord} ${diffMinutes} min ago`;
  } else {
    const diffHours = Math.round(diffMinutes / 60);
    freshnessText = `${updatedWord} ${diffHours} hr ago`;
  }

  const fallbackText = source === "mock" && dict.fpo?.badges?.updatedNow 
    ? ` · ${dict.fpo.badges.updatedNow.split(" · ")[1] || "cached/demo fallback"}` 
    : (source === "mock" ? " · cached/demo fallback" : "");

  return (
    <Badge className={cn("border", tone, className)}>
      {freshnessText}{fallbackText}
    </Badge>
  );
}
