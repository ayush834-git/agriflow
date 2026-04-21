"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";
import { ArrowUpRight, ChevronRight, ShieldAlert, Waves } from "lucide-react";

import { FpoHeatmapHero } from "@/components/dashboard/fpo-heatmap-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FpoDashboardData } from "@/lib/dashboard";
import type { InventoryItem } from "@/lib/inventory/types";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";

type FpoDashboardClientProps = {
  data: FpoDashboardData;
};

function DashboardPanelLoading({ label }: { label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/60 p-5 text-sm text-muted-foreground">
      Loading {label}...
    </div>
  );
}

const AlertsReportsPanel = dynamic(
  () =>
    import("@/components/dashboard/alerts-reports-panel").then(
      (mod) => mod.AlertsReportsPanel,
    ),
  { loading: () => <DashboardPanelLoading label="alerts" /> },
);

const BuyerDirectory = dynamic(
  () =>
    import("@/components/dashboard/buyer-directory").then(
      (mod) => mod.BuyerDirectory,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="buyer directory" />,
  },
);

const ColdStorageBoard = dynamic(
  () =>
    import("@/components/dashboard/cold-storage-board").then(
      (mod) => mod.ColdStorageBoard,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="cold storage board" />,
  },
);

const FpoSettingsPanel = dynamic(
  () =>
    import("@/components/settings/fpo-settings-panel").then(
      (mod) => mod.FpoSettingsPanel,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="workspace settings" />,
  },
);

const InventoryManager = dynamic(
  () =>
    import("@/components/dashboard/inventory-manager").then(
      (mod) => mod.InventoryManager,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="inventory" />,
  },
);

const MovementRecommendationsBoard = dynamic(
  () =>
    import("@/components/dashboard/movement-recommendations-board").then(
      (mod) => mod.MovementRecommendationsBoard,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="recommendations" />,
  },
);

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

import { DashboardShell } from "@/components/layout/dashboard-shell";

export function FpoDashboardClient({ data }: FpoDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const { dict } = useI18n();
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
  const inventoryMetrics = inventory.reduce(
    (metrics, item) => {
      if (item.status === "ACTIVE") {
        metrics.activeInventoryCount += 1;
      }
      if (item.spoilageLevel === "HIGH" || item.spoilageLevel === "CRITICAL") {
        metrics.urgentInventoryCount += 1;
      }
      if (item.spoilageLevel === "CRITICAL") {
        metrics.criticalInventoryCount += 1;
      }
      if (item.spoilageLevel !== "LOW") {
        metrics.atRiskQuantityKg += item.quantityKg;
      }
      return metrics;
    },
    {
      activeInventoryCount: 0,
      urgentInventoryCount: 0,
      criticalInventoryCount: 0,
      atRiskQuantityKg: 0,
    },
  );
  const derivedMetrics = {
    ...inventoryMetrics,
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
    <DashboardShell role="fpo">
      <PageTransition pageKey="fpo-dashboard">
        <div
          className={cn(
            "flex flex-col gap-8 transition-opacity p-6 md:p-8",
            isPending ? "opacity-95" : "opacity-100",
          )}
          aria-busy={isPending}
        >
          {/* Header Section with Asymmetric Layout from HTML */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-4">
            <div className="lg:col-span-7">
              <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-on-surface mb-4">
                Inventory &amp; <span className="text-primary">Movement</span>
              </h1>
              <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
                Optimize your FPO supply chain. We analyze real-time market arrivals and spoilage risks to suggest the most profitable trade routes.
              </p>
            </div>
            
            <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 self-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary" data-icon="bolt">bolt</span>
                <h3 className="font-headline font-bold text-on-surface">Top AI Opportunity</h3>
              </div>
              <div className="bg-tertiary-container/10 p-4 rounded-lg mb-4">
                <p className="text-on-tertiary-container font-medium text-sm">
                  Movement of <span className="font-bold">{(derivedMetrics.atRiskQuantityKg / 1000).toFixed(1)}T {activeCrop.name}</span> yields highest margin compared to local sales.
                </p>
              </div>
              <button 
                onClick={() => setSelectedTab("recommendations")}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Execute All Recommendations <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
              </button>
            </div>
          </div>
          {/* Dashboard Bento Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
                <InventoryManager
                  initialInventory={inventory}
                  ownerUserId={data.owner.id}
                  onInventoryCreated={handleInventoryCreated}
                />
              </div>

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
            </div>

            {/* Side Insights Column */}
            <div className="space-y-6">
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
                <div className="p-6 pb-2">
                  <h3 className="font-headline font-bold mb-2">Regional Supply Gap</h3>
                  <p className="text-xs text-on-surface-variant mb-4">Real-time heatmap of arrival deficits</p>
                </div>
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
              </div>

               <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
                <h3 className="font-headline font-bold mb-4">Logistics Ready</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant" data-icon="local_shipping">local_shipping</span>
                      <div>
                        <span className="block text-sm font-bold">14-Wheeler (2)</span>
                        <span className="text-[10px] text-on-surface-variant">AgriTrans Logistics</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-tertiary">AVAILABLE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant" data-icon="local_shipping">local_shipping</span>
                      <div>
                        <span className="block text-sm font-bold">Cold-Chain (1)</span>
                        <span className="text-[10px] text-on-surface-variant">FreshRoute Inc.</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-on-surface-variant">IN TRANSIT</span>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 border-2 border-outline-variant text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-low transition-all">
                  Manage Fleet
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <BuyerDirectory
              key={`${directoryFilters.inventoryId ?? "inventory"}:${directoryFilters.district ?? "district"}:${directoryFilters.cropSlug ?? "crop"}`}
              inventory={inventory}
              listings={data.directoryListings}
              ownerUserId={data.owner.id}
              initialFilters={directoryFilters}
              onMatchCreated={handleMatchCreated}
            />
          </div>
        </div>
      </PageTransition>
      <MobileBottomNav variant="fpo" />
    </DashboardShell>
  );
}
