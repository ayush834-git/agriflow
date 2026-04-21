"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";
import { ShieldAlert } from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import type { FarmerDashboardData } from "@/lib/dashboard";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/whatsapp/types";
import { useI18n } from "@/lib/i18n/context";

type FarmerDashboardClientProps = {
  data: FarmerDashboardData;
};

type MatchAcceptResponse =
  | { ok: true; match: MarketMatch; farmerNotification: AppNotification; farmerMessage: string }
  | { ok: false; error?: string };

const LANGUAGE_OPTIONS: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "te", label: "Telugu" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "en", label: "English" },
];

// Crop emoji/icon map
const CROP_ICONS: Record<string, string> = {
  tomato: "nutrition",
  onion: "radio_button_checked",
  "green-chilli": "local_fire_department",
  maize: "grass",
  potato: "eco",
  default: "eco",
};

const CROP_COLORS: Record<string, string> = {
  tomato: "text-red-500",
  onion: "text-amber-600",
  "green-chilli": "text-red-700",
  maize: "text-yellow-600",
  potato: "text-amber-700",
  default: "text-emerald-600",
};

function DashboardPanelLoading({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant animate-pulse">
      Loading {label}...
    </div>
  );
}

const BestTimeToSell = dynamic(
  () => import("@/components/dashboard/best-time-to-sell").then((mod) => mod.BestTimeToSell),
  { ssr: false, loading: () => <DashboardPanelLoading label="forecast" /> },
);

const FpoDirectoryMap = dynamic(
  () => import("@/components/dashboard/fpo-directory-map").then((mod) => mod.FpoDirectoryMap),
  { loading: () => <DashboardPanelLoading label="FPO directory" /> },
);

const ListingManager = dynamic(
  () => import("@/components/dashboard/listing-manager").then((mod) => mod.ListingManager),
  { ssr: false, loading: () => <DashboardPanelLoading label="listings" /> },
);

const MarketPriceChart = dynamic(
  () => import("@/components/dashboard/market-price-chart").then((mod) => mod.MarketPriceChart),
  { ssr: false, loading: () => <DashboardPanelLoading label="market chart" /> },
);

const MyEarnings = dynamic(
  () => import("@/components/dashboard/my-earnings").then((mod) => mod.MyEarnings),
  { ssr: false, loading: () => <DashboardPanelLoading label="earnings" /> },
);

const AlertsReportsPanel = dynamic(
  () => import("@/components/dashboard/alerts-reports-panel").then((mod) => mod.AlertsReportsPanel),
  { loading: () => <DashboardPanelLoading label="alerts" /> },
);

const FarmerSettingsPanel = dynamic(
  () => import("@/components/settings/farmer-settings-panel").then((mod) => mod.FarmerSettingsPanel),
  { ssr: false, loading: () => <DashboardPanelLoading label="settings" /> },
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FarmerDashboardClient({ data }: FarmerDashboardClientProps) {
  const [, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [selectedCropSlug, setSelectedCropSlug] = useState(data.defaultCropSlug);
  const [selectedDistrict, setSelectedDistrict] = useState(
    data.profile.district ??
      data.districts.find((d) => d.district === "Kurnool")?.district ??
      data.districts[0]?.district ??
      "",
  );
  const [matches, setMatches] = useState(data.matches);
  const [notifications, setNotifications] = useState(data.notifications);
  const [, setAcceptanceMessage] = useState<string | null>(null);
  const [, setActionError] = useState<string | null>(null);
  const [preferredLanguage] = useState(data.profile.preferredLanguage);
  const { dict } = useI18n();

  const deferredCropSlug = useDeferredValue(selectedCropSlug);
  const deferredDistrict = useDeferredValue(selectedDistrict);
  const activeCrop = data.crops.find((c) => c.slug === deferredCropSlug) ?? data.crops[0];

  if (!activeCrop) return null;

  const localPrice =
    activeCrop.prices.find((p) => p.district === deferredDistrict) ?? activeCrop.prices[0];
  const bestRoute =
    activeCrop.routes.find((r) => r.sourceDistrict === deferredDistrict) ?? activeCrop.routes[0];
  const highestPrice = activeCrop.prices[0];
  const localState =
    data.districts.find((d) => d.district === deferredDistrict)?.state ??
    localPrice?.state ??
    "";

  const activeMatch =
    matches.find((m) => m.status === "CONTACTED" || m.status === "OPEN") ?? null;

  const priceGap =
    localPrice && highestPrice
      ? highestPrice.modalPrice - localPrice.modalPrice
      : 0;

  // If a panel is open, show it full-width below hero
  const showPanel = activePanel !== null;

  return (
    <DashboardShell role="farmer" districtLabel={deferredDistrict}>
      {/* ── HERO BANNER ── */}
      <section className="px-6 pt-8 pb-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-8 mb-6">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tight mb-2">
              Namaste {data.profile.fullName.split(" ")[0]}!
            </h2>
            <p className="text-emerald-50 text-lg md:text-xl font-medium opacity-90 max-w-2xl">
              Your local price for{" "}
              <span className="font-bold text-white">
                {dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ?? activeCrop.name}
              </span>{" "}
              in {deferredDistrict} is{" "}
              <span className="bg-white/20 px-2 py-0.5 rounded">
                {localPrice ? formatCurrency(localPrice.modalPrice) : "—"}
              </span>
              .
            </p>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none flex items-center justify-end pr-4">
            <span className="material-symbols-outlined text-[10rem]" data-icon="eco">eco</span>
          </div>
        </div>

        {/* ── OPPORTUNITIES + ALERT 2-col ── */}
        {data.warnings.length > 0 && (
          <div className="flex items-center gap-3 mb-4 bg-error-container/60 rounded-xl p-4">
            <ShieldAlert className="size-5 text-error shrink-0" />
            <p className="text-sm text-on-surface">{data.warnings[0]}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Market Gap Card */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 shadow-sm border-l-[6px] border-primary relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-8xl" data-icon="trending_up">trending_up</span>
            </div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase tracking-wider mb-4">
                Market Gap Found
              </span>
              <h3 className="text-2xl font-bold text-on-surface mb-4 leading-tight">
                {bestRoute
                  ? <>Sell in {bestRoute.targetDistrict} for <span className="text-primary font-black text-3xl">{formatCurrency(bestRoute.targetModalPrice)}</span></>
                  : "No routes available yet"}
              </h3>
              {bestRoute && (
                <p className="text-on-surface-variant text-lg mb-6">
                  That&apos;s{" "}
                  <span className="text-emerald-700 font-bold">{formatCurrency(bestRoute.priceGap)} More Profit</span>{" "}
                  compared to local Mandis.
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setActivePanel("fpos")}
                  className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Unlock Logistics
                </button>
                <button
                  onClick={() => setActivePanel("fpos")}
                  className="bg-surface-container-high text-on-surface px-6 py-3 rounded-lg font-semibold hover:bg-surface-container-highest transition-colors"
                >
                  View {data.fpos.length} Near FPOs
                </button>
              </div>
            </div>
          </div>

          {/* Alert / Match Card */}
          {activeMatch ? (
            <div className="bg-secondary-container text-on-secondary-container rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-4xl mb-4 block" data-icon="priority_high">priority_high</span>
                <h4 className="text-xl font-bold mb-2">Buyer Match!</h4>
                <p className="opacity-90 text-sm">
                  {activeMatch.cropName} — {activeMatch.quantityKg?.toLocaleString("en-IN") ?? "--"} kg interest live.
                </p>
              </div>
              <Button
                disabled={isActionPending}
                className="mt-6 bg-white/20 hover:bg-white/30 text-white font-bold border-0"
                onClick={() =>
                  startActionTransition(async () => {
                    setActionError(null);
                    const response = await fetch("/api/matches/accept", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ farmerUserId: data.profile.id, matchId: activeMatch.id }),
                    });
                    const payload = (await response.json()) as MatchAcceptResponse;
                    if (!response.ok || !payload.ok) {
                      setActionError(("error" in payload ? payload.error : undefined) ?? "Could not accept.");
                      return;
                    }
                    setMatches((cur) => cur.map((e) => (e.id === payload.match.id ? payload.match : e)));
                    setNotifications((cur) => [payload.farmerNotification, ...cur]);
                    setAcceptanceMessage(payload.farmerMessage);
                  })
                }
              >
                {isActionPending ? "Accepting..." : "Accept Match"}
              </Button>
            </div>
          ) : (
            <div className="bg-secondary-container text-on-secondary-container rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-4xl mb-4 block" data-icon="priority_high">priority_high</span>
                <h4 className="text-xl font-bold mb-2">Inventory Alert</h4>
                <p className="opacity-90 text-sm">
                  {priceGap > 0
                    ? `You could earn ${formatCurrency(priceGap)} more per quintal by selling in ${highestPrice?.district ?? "another market"}.`
                    : "Monitor your crops and set price alerts via WhatsApp."}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <span className="font-black text-4xl opacity-40">!</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── MY LIVE CROPS ── */}
      <section className="px-6 mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black font-headline text-emerald-900">My Live Crops</h2>
            <p className="text-slate-500">Real-time local vs. state-wide comparisons</p>
          </div>
          <Link href="/register/farmer" className="text-primary font-bold hover:underline flex items-center gap-1">
            Edit Farm <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {data.crops.map((crop) => {
            const icon = CROP_ICONS[crop.slug] ?? CROP_ICONS.default;
            const iconColor = CROP_COLORS[crop.slug] ?? CROP_COLORS.default;
            const cropLocalPrice = crop.prices.find((p) => p.district === deferredDistrict) ?? crop.prices[0];
            const cropBestPrice = crop.prices[0];
            const gap = cropBestPrice && cropLocalPrice ? cropBestPrice.modalPrice - cropLocalPrice.modalPrice : 0;
            const isScarcity = gap > 0;
            const isActive = crop.slug === selectedCropSlug;

            return (
              <button
                key={crop.slug}
                onClick={() => startTransition(() => setSelectedCropSlug(crop.slug))}
                className={cn(
                  "bg-surface-container-low p-6 rounded-xl transition-all hover:bg-surface-container-high text-left",
                  isActive && "ring-2 ring-primary"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className={cn("material-symbols-outlined text-3xl", iconColor)} data-icon={icon}>
                      {icon}
                    </span>
                  </div>
                  {isScarcity ? (
                    <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold rounded">SCARCITY</span>
                  ) : (
                    <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded">SURPLUS</span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">
                  {dict.crops?.[crop.slug as keyof typeof dict.crops] ?? crop.name}
                </h3>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Local Price</p>
                    <p className="text-xl font-black text-slate-900">
                      {cropLocalPrice ? formatCurrency(cropLocalPrice.modalPrice) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Best State</p>
                    <p className="text-xl font-black text-emerald-700">
                      {cropBestPrice ? formatCurrency(cropBestPrice.modalPrice) : "—"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Add New Crop */}
          <Link
            href="/register/farmer"
            className="border-2 border-dashed border-outline-variant p-6 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl mb-2" data-icon="add_circle">add_circle</span>
            <span className="font-bold">Add New Crop</span>
          </Link>
        </div>
      </section>

      {/* ── FORECAST + QUICK ACTIONS ── */}
      <section className="px-6 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart module */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface">
                {dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ?? activeCrop.name} Forecast
              </h3>
              <p className="text-sm text-slate-500">Predicted daily price trends</p>
            </div>
            {bestRoute && bestRoute.priceGap > 0 ? (
              <div className="flex items-center bg-tertiary-container text-on-tertiary-container px-4 py-2 rounded-full font-bold text-sm">
                <span className="material-symbols-outlined text-xl mr-1" data-icon="trending_up">trending_up</span>
                SELL
              </div>
            ) : (
              <div className="flex items-center bg-secondary-fixed text-on-secondary-fixed px-4 py-2 rounded-full font-bold text-sm">
                <span className="material-symbols-outlined text-xl mr-1" data-icon="front_hand">front_hand</span>
                HOLD
              </div>
            )}
          </div>
          <div className="min-h-[8rem]">
            <BestTimeToSell
              cropName={activeCrop.name}
              cropSlug={activeCrop.slug}
              prices={activeCrop.prices}
              localDistrict={deferredDistrict}
              source={data.source}
            />
          </div>
        </div>

        {/* Quick Actions 2×2 */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Find Buyer", icon: "search", panel: "fpos" },
            { label: "List My Crop", icon: "add_box", panel: "listings" },
            { label: "Find FPO", icon: "hub", panel: "fpos" },
            { label: "Track Sales", icon: "local_shipping", panel: "earnings" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setActivePanel(activePanel === action.panel ? null : action.panel)}
              className={cn(
                "flex flex-col items-center justify-center bg-surface-container-low hover:bg-primary hover:text-white transition-all p-8 rounded-xl group",
                activePanel === action.panel && "bg-primary text-white"
              )}
            >
              <span
                className="material-symbols-outlined text-4xl mb-4 group-hover:scale-110 transition-transform"
                data-icon={action.icon}
              >
                {action.icon}
              </span>
              <span className="font-bold text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── EXPANDABLE PANELS ── */}
      {showPanel && (
        <section className="px-6 mb-10">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low border-b border-outline-variant/10">
              <h3 className="font-headline font-bold text-lg text-on-surface capitalize">{activePanel}</h3>
              <button
                onClick={() => setActivePanel(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined" data-icon="close">close</span>
              </button>
            </div>
            <div className="p-6">
              {activePanel === "prices" && (
                <MarketPriceChart prices={activeCrop.prices} localDistrict={deferredDistrict} />
              )}
              {activePanel === "forecast" && (
                <BestTimeToSell
                  cropName={activeCrop.name}
                  cropSlug={activeCrop.slug}
                  prices={activeCrop.prices}
                  localDistrict={deferredDistrict}
                  source={data.source}
                />
              )}
              {activePanel === "listings" && (
                <ListingManager
                  initialListings={data.listings}
                  farmerUserId={data.profile.id}
                  district={data.profile.district ?? deferredDistrict}
                  state={data.profile.state ?? localState}
                />
              )}
              {activePanel === "earnings" && (
                <MyEarnings
                  matches={matches}
                  cropName={activeCrop.name}
                  prices={activeCrop.prices}
                  routes={activeCrop.routes}
                  localDistrict={deferredDistrict}
                />
              )}
              {activePanel === "fpos" && (
                <FpoDirectoryMap fpos={data.fpos} farmerDistrict={data.profile.district ?? deferredDistrict} />
              )}
              {activePanel === "alerts" && (
                <AlertsReportsPanel
                  notifications={notifications}
                  matches={matches}
                  title="Alerts & Match Inbox"
                  description="Daily crop alerts, match interest, and push previews."
                />
              )}
              {activePanel === "routes" && (
                <div className="grid gap-4">
                  {activeCrop.routes.slice(0, 6).map((route) => (
                    <div
                      key={`${route.sourceDistrict}:${route.targetDistrict}`}
                      className="flex flex-col sm:flex-row gap-4 bg-surface-container-low rounded-xl px-5 py-5"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-on-surface">
                            {route.sourceDistrict}{" "}
                            <span className="material-symbols-outlined align-middle text-[18px] text-on-surface-variant mx-1">arrow_forward</span>{" "}
                            {route.targetDistrict}
                          </p>
                          <AiConfidenceBadge confidence={route.opportunityScore / 100} />
                        </div>
                        <p className="text-on-surface-variant text-sm">{route.sourceState} → {route.targetState}</p>
                      </div>
                      <div>
                        <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded text-sm font-bold">
                          +{formatCurrency(route.priceGap)}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <ExplainabilityPanel
                          title="Why this route?"
                          summary="Score combines demand, feasibility, and price spread."
                          reasons={[
                            `Demand ${route.demandStrength.toFixed(2)} | Feasibility ${route.transportFeasibility.toFixed(2)}`,
                            `${route.targetDistrict} pays ${formatCurrency(route.targetModalPrice)} vs ${formatCurrency(route.sourceModalPrice)} locally.`,
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                  {activeCrop.routes.length === 0 && (
                    <p className="text-center text-on-surface-variant py-8">No routes available.</p>
                  )}
                </div>
              )}
              {activePanel === "settings" && (
                <FarmerSettingsPanel
                  userId={data.profile.id}
                  phone={data.profile.phone}
                  initialLanguage={preferredLanguage}
                  initialAddress={data.profile.address}
                  initialDistrict={data.profile.district}
                  initialState={data.profile.state}
                  initialCropSlugs={data.cropPreferences.map((c) => c.cropSlug)}
                  onLanguageUpdated={() => {}}
                />
              )}
            </div>
          </div>
        </section>
      )}

      <MobileBottomNav variant="farmer" />
    </DashboardShell>
  );
}
