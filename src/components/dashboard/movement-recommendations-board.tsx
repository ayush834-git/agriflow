"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LoaderCircle, Sparkles } from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import type { InventoryItem } from "@/lib/inventory/types";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MovementRecommendationsBoardProps = {
  inventory: InventoryItem[];
  recommendations: MovementRecommendation[];
  onRecommendationsUpdated: (
    inventoryId: string,
    recommendations: MovementRecommendation[],
  ) => void;
  onOpenDirectory: (params: {
    district: string;
    cropSlug: string;
    inventoryId: string;
  }) => void;
};

type RecommendationResponse =
  | { ok: true; recommendations: MovementRecommendation[] }
  | { ok: false; error?: string };

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function urgencyBadgeClass(urgency: MovementRecommendation["urgency"]) {
  switch (urgency) {
    case "CRITICAL":
      return "border-red-200 bg-red-100 text-red-900";
    case "HIGH":
      return "border-amber-200 bg-amber-100 text-amber-900";
    case "MEDIUM":
      return "border-yellow-200 bg-yellow-100 text-yellow-900";
    case "LOW":
    default:
      return "border-emerald-200 bg-emerald-100 text-emerald-900";
  }
}

export function MovementRecommendationsBoard({
  inventory,
  recommendations,
  onRecommendationsUpdated,
  onOpenDirectory,
}: MovementRecommendationsBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(
    inventory[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            Phase 10 explainability layer
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            AI route recommendations for live inventory
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each route combines price spread, storage pressure, transport estimate,
            and a local-engine reasoning block until Gemini wiring is turned on.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || !activeInventoryId}
          onClick={() =>
            startTransition(async () => {
              if (!activeInventoryId) {
                return;
              }

              setError(null);
              const response = await fetch("/api/recommendations/generate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  inventoryId: activeInventoryId,
                  force: true,
                }),
              });
              const payload = (await response.json()) as RecommendationResponse;

              if (!response.ok || !payload.ok) {
                setError(
                  ("error" in payload ? payload.error : undefined) ??
                    "Could not refresh recommendations.",
                );
                return;
              }

              onRecommendationsUpdated(activeInventoryId, payload.recommendations);
            })
          }
        >
          {isPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Recomputing
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Refresh recommendation
            </>
          )}
        </Button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-4">
        {inventory.map((item) => {
          const itemRecommendations = recommendations.filter(
            (recommendation) => recommendation.inventoryId === item.id,
          );

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-[1.5rem] border px-4 py-4",
                activeInventoryId === item.id
                  ? "border-primary/30 bg-[linear-gradient(180deg,rgba(247,252,247,0.98),rgba(236,247,239,0.92))]"
                  : "border-border/70 bg-background/60",
              )}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setActiveInventoryId(item.id)}
                  >
                    <p className="text-lg font-semibold">{item.cropName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.district} · {item.quantityKg.toLocaleString("en-IN")} kg · deadline{" "}
                      {item.deadlineDate}
                    </p>
                  </button>
                </div>
                <Badge className={cn("border", urgencyBadgeClass(item.spoilageLevel))}>
                  {item.spoilageLevel}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {itemRecommendations.map((recommendation) => {
                    const signalArray = Array.isArray(recommendation.signals.reasoningLines)
                      ? recommendation.signals.reasoningLines
                      : [];

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        key={recommendation.id}
                        className="rounded-[1.35rem] border border-border/70 bg-card/90 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {recommendation.targetDistrict}, {recommendation.targetState}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Target price{" "}
                              {formatCurrency(
                                Number(recommendation.signals.targetModalPrice ?? 0),
                              )}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              className={cn("border", urgencyBadgeClass(recommendation.urgency))}
                            >
                              {recommendation.urgency}
                            </Badge>
                            <AiConfidenceBadge confidence={recommendation.confidence} />
                          </div>
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                          <p>Transport {formatCurrency(recommendation.transportCostInr)}</p>
                          <p>
                            Storage per kg{" "}
                            {formatCurrency(
                              Number(recommendation.signals.storageCostPerKgInr ?? 0),
                            )}
                          </p>
                          <p>Net per kg {formatCurrency(recommendation.netProfitPerKgInr)}</p>
                          <p>Total margin {formatCurrency(recommendation.totalNetProfitInr)}</p>
                        </div>

                        <ExplainabilityPanel
                          className="mt-4"
                          title="Why this route"
                          summary={recommendation.reasoning}
                          reasons={signalArray.map((line) => String(line))}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full"
                          onClick={() =>
                            onOpenDirectory({
                              district: recommendation.targetDistrict,
                              cropSlug: item.cropSlug,
                              inventoryId: item.id,
                            })
                          }
                        >
                          Find buyers in {recommendation.targetDistrict}
                          <ChevronRight className="size-4" />
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {itemRecommendations.length === 0 ? (
                  <motion.div
                    layout
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[1.35rem] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground"
                  >
                    No route recommendation generated yet for this inventory.
                  </motion.div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
