"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AiConfidenceBadgeProps = {
  confidence?: number | null;
  className?: string;
};

function normalizeConfidence(confidence?: number | null) {
  if (confidence == null || Number.isNaN(confidence)) {
    return null;
  }

  if (confidence > 1) {
    return Math.min(1, confidence / 100);
  }

  return Math.max(0, Math.min(1, confidence));
}

export function AiConfidenceBadge({
  confidence,
  className,
}: AiConfidenceBadgeProps) {
  const normalized = normalizeConfidence(confidence);

  if (normalized == null) {
    return (
      <Badge
        className={cn(
          "border border-zinc-200 bg-zinc-100 text-zinc-800",
          className,
        )}
      >
        Confidence unavailable
      </Badge>
    );
  }

  const percentage = Math.round(normalized * 100);
  const tone =
    normalized >= 0.76
      ? "border-emerald-200 bg-emerald-100 text-emerald-900"
      : normalized >= 0.56
        ? "border-amber-200 bg-amber-100 text-amber-900"
        : "border-red-200 bg-red-100 text-red-900";
  const label =
    normalized >= 0.76
      ? "High"
      : normalized >= 0.56
        ? "Medium"
        : "Low";

  return (
    <Badge className={cn("border", tone, className)}>
      {label} confidence · {percentage}%
    </Badge>
  );
}
