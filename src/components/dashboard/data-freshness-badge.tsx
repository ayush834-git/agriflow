"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DataFreshnessBadgeProps = {
  generatedAt: string;
  source: "live" | "mock";
  className?: string;
};

function formatFreshness(generatedAt: string) {
  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000),
  );

  if (diffMinutes < 1) {
    return "Updated just now";
  }

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `Updated ${diffHours} hr ago`;
}

export function DataFreshnessBadge({
  generatedAt,
  source,
  className,
}: DataFreshnessBadgeProps) {
  const tone =
    source === "live"
      ? "border-emerald-200 bg-emerald-100 text-emerald-900"
      : "border-amber-200 bg-amber-100 text-amber-900";

  return (
    <Badge className={cn("border", tone, className)}>
      {formatFreshness(generatedAt)}
      {source === "mock" ? " · cached/demo fallback" : ""}
    </Badge>
  );
}
