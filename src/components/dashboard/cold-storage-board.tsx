"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, LoaderCircle, Siren } from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InventoryItem } from "@/lib/inventory/types";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

type ColdStorageBoardProps = {
  inventory: InventoryItem[];
  onRecommendationsUpdated: (
    inventoryId: string,
    recommendations: MovementRecommendation[],
  ) => void;
};

type RecommendationResponse =
  | { ok: true; recommendations: MovementRecommendation[] }
  | { ok: false; error?: string };

function daysUntil(dateValue: string) {
  const diff = new Date(`${dateValue}T23:59:59.000Z`).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function urgencyClass(item: InventoryItem) {
  const days = daysUntil(item.deadlineDate);

  if (item.spoilageLevel === "CRITICAL" || days <= 1) {
    return "border-red-200 bg-red-50";
  }

  if (item.spoilageLevel === "HIGH" || days <= 3) {
    return "border-amber-200 bg-amber-50";
  }

  return "border-border/70 bg-background/60";
}

export function ColdStorageBoard({
  inventory,
  onRecommendationsUpdated,
}: ColdStorageBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.45)]">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Clock3 className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Cold storage deadline board</p>
          <p className="text-sm text-muted-foreground">
            Sorted by deadline so emergency movement plans can be generated in one
            click.
          </p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {[...inventory]
            .sort((left, right) => left.deadlineDate.localeCompare(right.deadlineDate))
            .map((item) => {
              const daysLeft = daysUntil(item.deadlineDate);
              const spoilage =
                (item.metadata?.spoilage as
                  | { confidence?: number; reasoning?: string[]; summary?: string }
                  | undefined) ?? undefined;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  key={item.id}
                  className={cn("rounded-[1.35rem] border px-4 py-4", urgencyClass(item))}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.cropName}</p>
                        <Badge className="border border-white/0 bg-white/70 text-foreground">
                          {item.quantityKg.toLocaleString("en-IN")} kg
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.storageLocationName ?? item.district} · deadline{" "}
                        {item.deadlineDate}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {daysLeft} day(s) left · risk {item.spoilageScore.toFixed(0)}
                        </div>
                        <AiConfidenceBadge confidence={spoilage?.confidence} />
                      </div>
                      <Button
                        type="button"
                        disabled={isPending && activeInventoryId === item.id}
                        onClick={() =>
                          startTransition(async () => {
                            setActiveInventoryId(item.id);
                            setError(null);
                            const response = await fetch("/api/recommendations/generate", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                inventoryId: item.id,
                                force: true,
                              }),
                            });
                            const payload = (await response.json()) as RecommendationResponse;

                            if (!response.ok || !payload.ok) {
                              setError(
                                ("error" in payload ? payload.error : undefined) ??
                                  "Emergency plan failed.",
                              );
                              return;
                            }

                            onRecommendationsUpdated(item.id, payload.recommendations);
                          })
                        }
                      >
                        {isPending && activeInventoryId === item.id ? (
                          <>
                            <LoaderCircle className="size-4 animate-spin" />
                            Planning
                          </>
                        ) : (
                          <>
                            <Siren className="size-4" />
                            Emergency movement plan
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <ExplainabilityPanel
                    className="mt-4"
                    title="Why this lot is urgent"
                    summary={
                      spoilage?.summary ??
                      "This urgency is based on the spoilage model and deadline pressure."
                    }
                    reasons={spoilage?.reasoning ?? []}
                  />
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>
    </section>
  );
}
