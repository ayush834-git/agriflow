"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type DataFreshnessBadgeProps = {
  generatedAt: string;
  source: "live" | "mock";
  className?: string;
};

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

  const updatedWord = dict.fpo?.badges?.updated ?? "Updated";
  const formattedGeneratedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(generatedAt));

  const freshnessText = `${updatedWord} ${formattedGeneratedAt}`;
  const fallbackText = source === "mock" ? " - cached/demo fallback" : "";

  return (
    <Badge className={cn("border", tone, className)}>
      {freshnessText}
      {fallbackText}
    </Badge>
  );
}

