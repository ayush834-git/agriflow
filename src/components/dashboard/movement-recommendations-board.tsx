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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-headline font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" data-icon="insights">insights</span>
          AI Route Recommendations
        </h2>
        <Button
          type="button"
          className="bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 rounded-lg"
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
              <LoaderCircle className="size-4 animate-spin mr-2" />
              Recomputing...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2 text-primary" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {error ? <p className="text-sm text-error bg-error-container p-3 rounded-lg">{error}</p> : null}

      <div className="grid gap-6">
        {inventory.map((item) => {
          const itemRecommendations = recommendations.filter(
            (recommendation) => recommendation.inventoryId === item.id,
          );
          
          if (activeInventoryId !== item.id && itemRecommendations.length === 0) {
              return null; // hide empty unselected
          }

          return (
            <div key={item.id} className="space-y-4">
               {/* Inventory selector pills could go here if we wanted, but we'll show the top one. */}
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="bg-gradient-to-br from-primary-container to-tertiary-container p-[1px] rounded-xl shadow-sm"
                      >
                         <div className="bg-surface-container-lowest rounded-[10px] p-6 h-full flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded">AI SUGGESTION</span>
                                  <h3 className="text-lg font-headline font-bold text-on-surface mt-2 flex items-center gap-2">
                                    Move {(item.quantityKg / 1000).toFixed(1)}T {item.cropName} <span className="material-symbols-outlined shrink-0 text-on-surface-variant text-[18px]">arrow_forward</span> {recommendation.targetDistrict}
                                  </h3>
                                </div>
                                <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-2 text-center min-w-[80px]">
                                  <span className="block text-[10px] text-on-surface-variant font-bold">EST MARGIN</span>
                                  <span className="block text-lg font-black text-tertiary">{formatCurrency(recommendation.totalNetProfitInr)}</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-on-surface-variant mb-6 hidden sm:block">
                                {recommendation.reasoning}
                              </p>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 text-center">
                                  <span className="block text-[10px] text-on-surface-variant font-bold mb-1">LOCAL PRICE</span>
                                  <span className="font-bold text-sm text-on-surface">{formatCurrency(Number(recommendation.signals.sourceModalPrice ?? 0))}/q</span>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 text-center">
                                  <span className="block text-[10px] text-on-surface-variant font-bold mb-1">TARGET PRICE</span>
                                  <span className="font-bold text-sm text-tertiary underline decoration-tertiary/30 decoration-2 underline-offset-2">{formatCurrency(Number(recommendation.signals.targetModalPrice ?? 0))}/q</span>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 text-center">
                                  <span className="block text-[10px] text-on-surface-variant font-bold mb-1">TRANSPORT</span>
                                  <span className="font-bold text-sm text-error">-{formatCurrency(recommendation.transportCostInr)}</span>
                                </div>
                                <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 text-center">
                                  <span className="block text-[10px] text-on-surface-variant font-bold mb-1">CONFIDENCE</span>
                                  <span className="font-bold text-sm text-primary flex justify-center items-center gap-1">
                                    {((recommendation.confidence ?? 0) * 100).toFixed(0)}% <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-auto">
                              <button 
                                onClick={() =>
                                  onOpenDirectory({
                                    district: recommendation.targetDistrict,
                                    cropSlug: item.cropSlug,
                                    inventoryId: item.id,
                                  })
                                }
                                className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                              >
                                Find Buyers in {recommendation.targetDistrict} <span className="material-symbols-outlined text-[18px]">group_add</span>
                              </button>
                            </div>
                         </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {itemRecommendations.length === 0 && activeInventoryId === item.id ? (
                  <motion.div
                    layout
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-surface-container-lowest rounded-[10px] border border-dashed border-outline-variant/50 p-6 flex items-center justify-center text-center col-span-full h-full min-h-[200px]"
                  >
                   <div>
                     <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">hourglass_empty</span>
                     <p className="text-sm font-medium text-on-surface-variant">Click Refresh to generate routes for {item.cropName}</p>
                   </div>
                  </motion.div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
