"use client";

import { BadgeHelp } from "lucide-react";

import { cn } from "@/lib/utils";

type ExplainabilityPanelProps = {
  title?: string;
  summary?: string | null;
  reasons: string[];
  className?: string;
};

export function ExplainabilityPanel({
  title,
  summary,
  reasons,
  className,
}: ExplainabilityPanelProps) {
  if (reasons.length === 0 && !summary) {
    return null;
  }

  return (
    <details
      className={cn(
        "rounded-[1rem] border border-border/70 bg-background/70 px-3 py-3 text-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground">
        <BadgeHelp className="size-4 text-primary" />
        {title ?? "Why?"}
      </summary>
      <div className="mt-3 space-y-2 text-muted-foreground">
        {summary ? <p>{summary}</p> : null}
        {reasons.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
      </div>
    </details>
  );
}
