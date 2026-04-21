"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { FpoHeatmapHero } from "@/components/dashboard/fpo-heatmap-hero";
import type { FpoDashboardData } from "@/lib/dashboard";
import type { InventoryItem } from "@/lib/inventory/types";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import { useI18n } from "@/lib/i18n/context";

type FpoDashboardClientProps = {
  data: FpoDashboardData;
};

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant animate-pulse">
      Loading {label}...
    </div>
  );
}

const InventoryManager = dynamic(
  () => import("@/components/dashboard/inventory-manager").then((m) => m.InventoryManager),
  { ssr: false, loading: () => <PanelLoading label="inventory" /> },
);

const MovementRecommendationsBoard = dynamic(
  () => import("@/components/dashboard/movement-recommendations-board").then((m) => m.MovementRecommendationsBoard),
  { ssr: false, loading: () => <PanelLoading label="recommendations" /> },
);

const BuyerDirectory = dynamic(
  () => import("@/components/dashboard/buyer-directory").then((m) => m.BuyerDirectory),
  { ssr: false, loading: () => <PanelLoading label="buyer directory" /> },
);

const AlertsReportsPanel = dynamic(
  () => import("@/components/dashboard/alerts-reports-panel").then((m) => m.AlertsReportsPanel),
  { loading: () => <PanelLoading label="alerts" /> },
);

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function SpoilageChip({ level }: { level: string }) {
  if (level === "CRITICAL")
    return <span className="px-3 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-bold uppercase">Critical</span>;
  if (level === "HIGH")
    return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase">High</span>;
  if (level === "MEDIUM")
    return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase">Medium</span>;
  return <span className="px-3 py-1 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-xs font-bold uppercase">Low</span>;
}

export function FpoDashboardClient({ data }: FpoDashboardClientProps) {
  const [, startTransition] = useTransition();
  const { dict } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Derive active tab directly from URL — reactive to all navigation
  const selectedTab = searchParams.get("tab") ?? "overview";
  function setSelectedTab(tab: string) {
    router.push(tab === "overview" ? "/dashboard/fpo" : `/dashboard/fpo?tab=${tab}`);
  }
  const [selectedCropSlug] = useState(data.defaultCropSlug);
  const [selectedDistrict, setSelectedDistrict] = useState(
    data.owner.districtsServed[0] ?? data.districts[0]?.district ?? "",
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

  const deferredDistrict = useDeferredValue(selectedDistrict);
  const activeCrop = data.crops.find((c) => c.slug === selectedCropSlug) ?? data.crops[0];

  const topRecommendation = recommendations[0];
  const atRiskQt = inventory.filter((i) => i.spoilageLevel !== "LOW").reduce((s, i) => s + i.quantityKg, 0);

  if (!activeCrop) return null;

  function handleRecommendationsUpdated(inventoryId: string, next: MovementRecommendation[]) {
    setRecommendations((cur) => [...cur.filter((r) => r.inventoryId !== inventoryId), ...next]);
  }

  function handleInventoryCreated(item: InventoryItem) {
    setInventory((cur) => [...cur, item].sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate)));
    setDirectoryFilters((cur) => ({ ...cur, inventoryId: item.id, cropSlug: item.cropSlug }));
  }

  function handleMatchCreated(match: MarketMatch, notification: AppNotification) {
    setMatches((cur) => [match, ...cur]);
    setNotifications((cur) => [notification, ...cur]);
  }

  return (
    <DashboardShell role="fpo" districtLabel={data.owner.districtsServed[0]}>
      {/* ── HEATMAP TAB ── */}
      {selectedTab === "overview" && (
        <div className="p-6 md:p-8">
          {/* Asymmetric header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            <div className="lg:col-span-7">
              <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-on-surface mb-4">
                Inventory &amp; <span className="text-primary">Movement</span>
              </h1>
              <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
                Optimize your FPO supply chain. We analyze real-time market arrivals and spoilage risks to suggest the most profitable trade routes.
              </p>
            </div>

            {/* Top AI Opportunity card */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 self-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary" data-icon="bolt">bolt</span>
                <h3 className="font-headline font-bold text-on-surface">Top AI Opportunity</h3>
              </div>
              <div className="bg-tertiary-container/10 p-4 rounded-lg mb-4">
                <p className="text-on-tertiary-container font-medium text-sm">
                  {topRecommendation
                    ? <>Movement of <strong>{(atRiskQt / 1000).toFixed(1)}T {activeCrop.name}</strong> yields highest margin compared to local sales.</>
                    : <>Movement of <strong>{(atRiskQt / 1000).toFixed(1)}T {activeCrop.name}</strong> from {data.owner.districtsServed[0]} yields +18% net margin.</>}
                </p>
              </div>
              <button
                onClick={() => setSelectedTab("recommendations")}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Execute All Recommendations{" "}
                <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Bento grid: 2/3 main | 1/3 sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── LEFT: Inventory table + AI recommendation ── */}
            <div className="xl:col-span-2 space-y-6">
              {/* Active Inventory table */}
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
                <div className="px-6 py-4 flex justify-between items-center bg-surface-container-low">
                  <h2 className="font-headline font-bold text-lg">Active Inventory</h2>
                  <button className="text-primary font-semibold text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" data-icon="filter_list">filter_list</span> Filter
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/10">
                        <th className="px-6 py-4 font-semibold">Crop</th>
                        <th className="px-6 py-4 font-semibold">Quantity</th>
                        <th className="px-6 py-4 font-semibold">Location</th>
                        <th className="px-6 py-4 font-semibold">Deadline</th>
                        <th className="px-6 py-4 font-semibold">Spoilage Risk</th>
                        <th className="px-6 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-outline-variant/10">
                      {inventory.slice(0, 5).map((item) => (
                        <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]" data-icon="eco">eco</span>
                              </div>
                              <span className="font-semibold">
                                {dict.crops?.[item.cropSlug as keyof typeof dict.crops] ?? item.cropName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{(item.quantityKg / 1000).toFixed(1)} Tons</td>
                          <td className="px-6 py-4 text-on-surface-variant">{item.storageType}</td>
                          <td className="px-6 py-4">{item.deadlineDate}</td>
                          <td className="px-6 py-4"><SpoilageChip level={item.spoilageLevel} /></td>
                          <td className="px-6 py-4">
                            <button
                              className="text-primary font-bold hover:underline text-sm"
                              onClick={() => setSelectedTab("recommendations")}
                            >
                              Plan Movement
                            </button>
                          </td>
                        </tr>
                      ))}
                      {inventory.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">
                            No inventory — add stock to start tracking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Recommendation detail card */}
              {topRecommendation && (
                <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold mb-4">
                        <span className="material-symbols-outlined text-sm" data-icon="auto_awesome">auto_awesome</span> AI RECOMMENDED
                      </div>
                      <h3 className="text-2xl font-headline font-bold mb-2">
                        Move {(atRiskQt / 1000).toFixed(0)}T{" "}
                         {activeCrop.name}{" to "}
                         {topRecommendation.targetDistrict}
                      </h3>
                      <p className="text-on-surface-variant mb-6 leading-relaxed">
                        {topRecommendation.reasoning ?? "Optimize stock depletion from high-risk storage. Destination market shows significant supply gap."}
                      </p>
                      <div className="bg-surface-container-low p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]" data-icon="help">help</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-sm mb-1">Why this?</h4>
                            <p className="text-sm text-on-surface-variant leading-relaxed">
                              Demand strength high in {topRecommendation.targetDistrict}. Transport corridors are clear.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial breakdown */}
                    <div className="w-full md:w-80 bg-surface-container-high/50 p-6 rounded-xl">
                      <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface-variant mb-4 text-center">Financial Breakdown</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-on-surface-variant">Gross Profit Est.</span>
                          <span className="font-bold">{topRecommendation.totalNetProfitInr ? formatCurrency(topRecommendation.totalNetProfitInr * 1.12) : "—"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-on-surface-variant">Transport Cost</span>
                          <span className="font-bold text-secondary">(- {topRecommendation.transportCostInr ? formatCurrency(topRecommendation.transportCostInr) : "—"})</span>
                        </div>
                        <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
                          <span className="text-base font-bold">Net Profit</span>
                          <div className="text-right">
                            <span className="block text-2xl font-black text-tertiary">
                              {topRecommendation.totalNetProfitInr ? formatCurrency(topRecommendation.totalNetProfitInr) : "—"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTab("recommendations")}
                          className="w-full bg-on-surface text-white py-3 rounded-lg text-sm font-bold mt-2 hover:bg-slate-800 transition-all"
                        >
                          Approve &amp; Book Logistics
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT sidebar ── */}
            <div className="space-y-6">
              {/* Regional supply gap (heatmap widget) */}
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
                <div className="p-6 pb-2">
                  <h3 className="font-headline font-bold mb-1">Regional Supply Gap</h3>
                  <p className="text-xs text-on-surface-variant mb-4">Real-time heatmap of arrival deficits</p>
                </div>
                <FpoHeatmapHero
                  crop={activeCrop}
                  districts={data.districts}
                  selectedDistrict={deferredDistrict}
                  generatedAt={data.generatedAt}
                  source={data.source}
                  onSelectDistrict={(d) => startTransition(() => setSelectedDistrict(d))}
                />
                <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="block text-xs text-on-surface-variant">Demand Index</span>
                    <span className="text-lg font-bold text-tertiary">
                      {activeCrop.topOpportunityScore > 0 ? (activeCrop.topOpportunityScore / 10).toFixed(1) : "—"}/10
                    </span>
                  </div>
                  <div className="text-center border-l border-outline-variant/10">
                    <span className="block text-xs text-on-surface-variant">Price Volatility</span>
                    <span className="text-lg font-bold text-on-surface">
                      {activeCrop.routes.length > 3 ? "High" : "Low"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logistics Ready */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10">
                <h3 className="font-headline font-bold mb-4">Logistics Ready</h3>
                <div className="space-y-4">
                  {[
                    { label: "14-Wheeler (2)", sub: "AgriTrans Logistics", status: "AVAILABLE", statusColor: "text-tertiary" },
                    { label: "Cold-Chain (1)", sub: "FreshRoute Inc.", status: "IN TRANSIT", statusColor: "text-on-surface-variant" },
                  ].map((v) => (
                    <div key={v.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-on-surface-variant" data-icon="local_shipping">local_shipping</span>
                        <div>
                          <span className="block text-sm font-bold">{v.label}</span>
                          <span className="text-[10px] text-on-surface-variant">{v.sub}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${v.statusColor}`}>{v.status}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2 border-2 border-outline-variant text-on-surface font-bold text-sm rounded-lg hover:bg-surface-container-low transition-all">
                  Manage Fleet
                </button>
              </div>

              {/* Growth sparkline */}
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Projected FPO Growth</h4>
                <div className="flex items-end justify-between gap-1 h-16">
                  {[32, 40, 48, 64, 56, 80, 96].map((h, i) => (
                    <div key={i} className="w-full bg-primary/20 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <p className="text-xs text-primary font-medium mt-3">↑ 14% growth in market reach this month</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {selectedTab === "inventory" && (
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-extrabold font-headline mb-6">Active Inventory</h1>
          <InventoryManager
            initialInventory={inventory}
            ownerUserId={data.owner.id}
            onInventoryCreated={handleInventoryCreated}
          />
        </div>
      )}

      {/* ── RECOMMENDATIONS TAB ── */}
      {selectedTab === "recommendations" && (
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-extrabold font-headline mb-6">AI Movement Recommendations</h1>
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
      )}

      {/* ── DIRECTORY TAB ── */}
      {selectedTab === "directory" && (
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">Directory &amp; Matching</h1>
              <p className="text-on-surface-variant italic mt-1">Bridging the gap between harvest and demand through editorial-grade supply chain intelligence.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col min-w-[140px]">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Active Sellers</span>
                <span className="text-2xl font-bold font-headline">{data.directoryListings.length}</span>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col min-w-[140px]">
                <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Inventory</span>
                <span className="text-2xl font-bold font-headline">{inventory.length} lots</span>
              </div>
            </div>
          </div>
          <BuyerDirectory
            key={`${directoryFilters.inventoryId ?? "inv"}:${directoryFilters.district ?? "dist"}:${directoryFilters.cropSlug ?? "crop"}`}
            inventory={inventory}
            listings={data.directoryListings}
            ownerUserId={data.owner.id}
            initialFilters={directoryFilters}
            onMatchCreated={handleMatchCreated}
          />
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {selectedTab === "alerts" && (
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-extrabold font-headline mb-6">Alerts &amp; Notifications</h1>
          <AlertsReportsPanel
            notifications={notifications}
            matches={matches}
            title="FPO Alerts & Inbox"
            description="Supply alerts, match interest requests, and system notifications."
          />
        </div>
      )}

      {/* Tab nav buttons (overlaid bottom for mobile, and also exposed via hidden state toggles) */}
      <div className="hidden">
        {/* These only exist to allow setSelectedTab calls from the sidebar */}
        {["overview", "inventory", "recommendations", "directory", "alerts"].map((t) => (
          <button key={t} onClick={() => setSelectedTab(t)} />
        ))}
      </div>

      <MobileBottomNav variant="fpo" />
    </DashboardShell>
  );
}




