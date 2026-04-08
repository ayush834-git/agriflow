"use client";

import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";
import { ArrowUpRight, ChevronRight, ShieldAlert, Waves } from "lucide-react";

import { AlertsReportsPanel } from "@/components/dashboard/alerts-reports-panel";
import { BuyerDirectory } from "@/components/dashboard/buyer-directory";
import { ColdStorageBoard } from "@/components/dashboard/cold-storage-board";
import { FpoHeatmapHero } from "@/components/dashboard/fpo-heatmap-hero";
import { InventoryManager } from "@/components/dashboard/inventory-manager";
import { MovementRecommendationsBoard } from "@/components/dashboard/movement-recommendations-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FpoDashboardData } from "@/lib/dashboard";
import type { InventoryItem } from "@/lib/inventory/types";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

type FpoDashboardClientProps = {
  data: FpoDashboardData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FpoDashboardClient({ data }: FpoDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedCropSlug, setSelectedCropSlug] = useState(data.defaultCropSlug);
  const [selectedDistrict, setSelectedDistrict] = useState(
    data.owner.districtsServed[0] ??
      data.crops[0]?.routes[0]?.sourceDistrict ??
      data.districts[0]?.district ??
      "",
  );
  const [inventory, setInventory] = useState(data.inventory);
  const [recommendations, setRecommendations] = useState(data.recommendations);
  const [notifications, setNotifications] = useState(data.notifications);
  const [matches, setMatches] = useState(data.matches);
  const [directoryFilters, setDirectoryFilters] = useState<{
    inventoryId?: string;
    cropSlug?: string;
    district?: string;
  }>({
    inventoryId: data.inventory[0]?.id,
    cropSlug: data.inventory[0]?.cropSlug,
    district: "",
  });
  const deferredCropSlug = useDeferredValue(selectedCropSlug);
  const deferredDistrict = useDeferredValue(selectedDistrict);
  const activeCrop =
    data.crops.find((crop) => crop.slug === deferredCropSlug) ?? data.crops[0];
  const strongestRoute = activeCrop?.routes[0];
  const derivedMetrics = {
    activeInventoryCount: inventory.filter((item) => item.status === "ACTIVE").length,
    urgentInventoryCount: inventory.filter(
      (item) => item.spoilageLevel === "HIGH" || item.spoilageLevel === "CRITICAL",
    ).length,
    criticalInventoryCount: inventory.filter(
      (item) => item.spoilageLevel === "CRITICAL",
    ).length,
    atRiskQuantityKg: inventory
      .filter((item) => item.spoilageLevel !== "LOW")
      .reduce((sum, item) => sum + item.quantityKg, 0),
    recommendationCount: recommendations.length,
    liveMatchCount: matches.filter(
      (match) => match.status === "CONTACTED" || match.status === "ACCEPTED",
    ).length,
  };

  if (!activeCrop) {
    return null;
  }

  function handleRecommendationsUpdated(
    inventoryId: string,
    nextRecommendations: MovementRecommendation[],
  ) {
    setRecommendations((current) => [
      ...current.filter((recommendation) => recommendation.inventoryId !== inventoryId),
      ...nextRecommendations,
    ]);
  }

  function handleInventoryCreated(nextInventory: InventoryItem) {
    setInventory((current) =>
      [...current, nextInventory].sort((left, right) =>
        left.deadlineDate.localeCompare(right.deadlineDate),
      ),
    );
    setDirectoryFilters((current) => ({
      ...current,
      inventoryId: nextInventory.id,
      cropSlug: nextInventory.cropSlug,
    }));
  }

  function handleMatchCreated(match: MarketMatch, notification: AppNotification) {
    setMatches((current) => [match, ...current]);
    setNotifications((current) => [notification, ...current]);
  }

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-4 py-5 transition-opacity sm:px-6 lg:px-8",
        isPending ? "opacity-95" : "opacity-100",
      )}
      aria-busy={isPending}
    >
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(33,79,56,0.97),rgba(49,106,69,0.95)_42%,rgba(146,44,31,0.88)_120%)] text-white shadow-[0_45px_150px_-78px_rgba(22,47,33,0.92)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/12 bg-white/10 text-white hover:bg-white/10">
                Phase 10 workspace
              </Badge>
              <Badge className="border-white/12 bg-white/8 text-white/82 hover:bg-white/8">
                {data.source === "mock" ? "Demo-safe market stream" : "Live route signal"}
              </Badge>
              {data.owner.isDemo ? (
                <Badge className="border-white/12 bg-white/8 text-white/82 hover:bg-white/8">
                  Demo role gate until Clerk is wired
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/68">
                FPO operations dashboard
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Run movement plans, contact farmers, and keep storage risk under control.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                This workspace now carries the guide’s full operations chain: heatmap
                discovery, route recommendations, buyer matching, daily alerts, and
                cold-storage response loops.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="border-white/10 bg-white text-[rgb(33,79,56)] hover:bg-white/92"
              >
                <Link href="/register/fpo">
                  Register FPO profile
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/18 bg-transparent text-white hover:bg-white/8 hover:text-white"
              >
                <Link href="/dashboard">Farmer view</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Workspace
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {data.owner.organizationName}
              </p>
              <p className="mt-2 text-sm text-white/72">
                Updated {formatGeneratedAt(data.generatedAt)}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Active inventory
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {derivedMetrics.activeInventoryCount}
              </p>
              <p className="mt-2 text-sm text-white/72">
                {derivedMetrics.atRiskQuantityKg.toLocaleString("en-IN")} kg at risk
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Strongest corridor
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {strongestRoute ? formatCurrency(strongestRoute.priceGap) : "No route"}
              </p>
              <p className="mt-2 text-sm text-white/72">
                {strongestRoute
                  ? `${strongestRoute.sourceDistrict} to ${strongestRoute.targetDistrict}`
                  : "Waiting for stronger cross-district spread"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {data.warnings.length > 0 ? (
        <section className="rounded-[1.5rem] border border-amber-300/40 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              {data.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-[1.75rem] border border-border/70 bg-card/80 p-3 shadow-[0_20px_80px_-58px_rgba(26,76,49,0.55)]">
        <div className="flex min-w-max gap-3">
          {data.crops.map((crop) => {
            const isActive = crop.slug === deferredCropSlug;
            const topRoute = crop.routes[0];

            return (
              <button
                key={crop.slug}
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setSelectedCropSlug(crop.slug);
                    setSelectedDistrict(
                      crop.routes[0]?.sourceDistrict ??
                        data.owner.districtsServed[0] ??
                        selectedDistrict,
                    );
                  })
                }
                className={cn(
                  "group min-w-[240px] rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-300",
                  isActive
                    ? "border-primary/35 bg-[linear-gradient(180deg,rgba(247,252,247,0.98),rgba(236,247,239,0.95))] shadow-[0_24px_60px_-44px_rgba(36,92,60,0.75)]"
                    : "border-border/60 bg-background/70 hover:border-primary/22 hover:bg-background/88",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold">{crop.name}</p>
                  <ArrowUpRight
                    className={cn(
                      "size-4 transition-transform duration-300",
                      isActive ? "translate-x-0" : "group-hover:translate-x-0.5",
                    )}
                  />
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <p>Route score {topRoute?.opportunityScore.toFixed(0) ?? "--"}</p>
                  <p>
                    Best gap{" "}
                    <span className="font-medium text-foreground">
                      {topRoute ? formatCurrency(topRoute.priceGap) : "No spread"}
                    </span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <FpoHeatmapHero
        crop={activeCrop}
        districts={data.districts}
        selectedDistrict={deferredDistrict}
        generatedAt={data.generatedAt}
        source={data.source}
        onSelectDistrict={(district) =>
          startTransition(() => {
            setSelectedDistrict(district);
          })
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Waves className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Live signal shape</p>
              <p className="text-sm text-muted-foreground">
                Recommendation margin updates against the same route engine as the farmer view.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Urgent lots
          </p>
          <p className="mt-2 text-3xl font-semibold">{derivedMetrics.urgentInventoryCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            High and critical spoilage lots that should be moved first.
          </p>
        </div>
        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Route plans
          </p>
          <p className="mt-2 text-3xl font-semibold">{derivedMetrics.recommendationCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Stored recommendation cards across the active inventory board.
          </p>
        </div>
        <div className="rounded-[1.7rem] border border-border/70 bg-card/88 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Live matches
          </p>
          <p className="mt-2 text-3xl font-semibold">{derivedMetrics.liveMatchCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Farmers currently in the contact or acceptance loop.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.45)]">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                Operations board
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Execute movement, matching, and alerts
              </h2>
            </div>
            <TabsList
              variant="line"
              className="bg-transparent p-0"
              aria-label="FPO dashboard sections"
            >
              <TabsTrigger value="overview">Inventory</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="directory">Buyer directory</TabsTrigger>
              <TabsTrigger value="alerts">Alerts & reports</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="mt-4 grid gap-6">
              <InventoryManager
                initialInventory={inventory}
                ownerUserId={data.owner.id}
                onInventoryCreated={handleInventoryCreated}
              />
              <ColdStorageBoard
                inventory={inventory}
                onRecommendationsUpdated={handleRecommendationsUpdated}
              />
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <div className="mt-4">
              <MovementRecommendationsBoard
                inventory={inventory}
                recommendations={recommendations}
                onRecommendationsUpdated={handleRecommendationsUpdated}
                onOpenDirectory={(params) => {
                  setDirectoryFilters(params);
                  setSelectedTab("directory");
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="directory">
            <div className="mt-4">
              <BuyerDirectory
                key={`${directoryFilters.inventoryId ?? "inventory"}:${directoryFilters.district ?? "district"}:${directoryFilters.cropSlug ?? "crop"}`}
                inventory={inventory}
                listings={data.directoryListings}
                ownerUserId={data.owner.id}
                initialFilters={directoryFilters}
                onMatchCreated={handleMatchCreated}
              />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="mt-4">
              <AlertsReportsPanel
                notifications={notifications}
                matches={matches}
                title="Alerts, reports, and match loop"
                description="Cron-driven spoilage alerts, email report previews, and live farmer responses all land here."
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
