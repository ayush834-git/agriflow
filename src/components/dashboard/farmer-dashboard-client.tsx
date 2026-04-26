"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useState, useTransition } from "react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { AiChatWidget } from "@/components/dashboard/ai-chat-widget";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import type { FarmerDashboardData } from "@/lib/dashboard";
import { useI18n } from "@/lib/i18n/context";
import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

type FarmerDashboardClientProps = {
  data: FarmerDashboardData;
};

type MatchAcceptResponse =
  | { ok: true; match: MarketMatch; farmerNotification: AppNotification; farmerMessage: string }
  | { ok: false; error?: string };

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

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-8 text-sm text-on-surface-variant animate-pulse text-center">
      ...
    </div>
  );
}

const BestTimeToSell = dynamic(
  () => import("@/components/dashboard/best-time-to-sell").then((m) => m.BestTimeToSell),
  { ssr: false, loading: () => <PanelLoading label="forecast" /> },
);

const FpoDirectoryMap = dynamic(
  () => import("@/components/dashboard/fpo-directory-map").then((m) => m.FpoDirectoryMap),
  { loading: () => <PanelLoading label="FPO directory" /> },
);

const ListingManager = dynamic(
  () => import("@/components/dashboard/listing-manager").then((m) => m.ListingManager),
  { ssr: false, loading: () => <PanelLoading label="listings" /> },
);

const FpoHeatmapHero = dynamic(
  () => import("@/components/dashboard/fpo-heatmap-hero").then((m) => m.FpoHeatmapHero),
  { ssr: false, loading: () => <PanelLoading label="heatmap" /> },
);

const MyEarnings = dynamic(
  () => import("@/components/dashboard/my-earnings").then((m) => m.MyEarnings),
  { ssr: false, loading: () => <PanelLoading label="earnings" /> },
);

const AlertsReportsPanel = dynamic(
  () => import("@/components/dashboard/alerts-reports-panel").then((m) => m.AlertsReportsPanel),
  { loading: () => <PanelLoading label="alerts" /> },
);

const FarmerSettingsPanel = dynamic(
  () => import("@/components/settings/farmer-settings-panel").then((m) => m.FarmerSettingsPanel),
  { ssr: false, loading: () => <PanelLoading label="settings" /> },
);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────
// Quick-action full-tab views (navigated via URL ?tab=)
// ─────────────────────────────────────────────────────────────────

function TabHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">{title}</h1>
      {subtitle && <p className="text-on-surface-variant mt-1">{subtitle}</p>}
    </div>
  );
}

export function FarmerDashboardClient({ data }: FarmerDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  const [, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [selectedCropSlug, setSelectedCropSlug] = useState(data.defaultCropSlug);
  const [selectedDistrict, setSelectedDistrict] = useState(
    data.profile.district ?? data.districts[0]?.district ?? "",
  );
  const [matches, setMatches] = useState(data.matches);
  const [notifications, setNotifications] = useState(data.notifications);
  const [, setAcceptanceMessage] = useState<string | null>(null);
  const [, setActionError] = useState<string | null>(null);
  const [preferredLanguage] = useState<SupportedLanguage>(data.profile.preferredLanguage);
  const { dict } = useI18n();

  const deferredCropSlug = useDeferredValue(selectedCropSlug);
  const deferredDistrict = useDeferredValue(selectedDistrict);
  const activeCrop = data.crops.find((c) => c.slug === deferredCropSlug) ?? data.crops[0];

  if (!activeCrop) return null;

  const localPrice =
    activeCrop.prices.find((p) => p.district === deferredDistrict) ?? activeCrop.prices[0];
  const bestRoute =
    activeCrop.routes.find((r) => r.sourceDistrict === deferredDistrict) ??
    activeCrop.routes[0];
  const highestPrice = activeCrop.prices[0];
  const localState =
    data.districts.find((d) => d.district === deferredDistrict)?.state ??
    localPrice?.state ??
    "";
  const activeMatch =
    matches.find((m) => m.status === "CONTACTED" || m.status === "OPEN") ?? null;
  const priceGap =
    localPrice && highestPrice ? highestPrice.modalPrice - localPrice.modalPrice : 0;

  function navigate(tab: string) {
    router.push(tab === "overview" ? "/dashboard" : `/dashboard?tab=${tab}`);
  }

  // ── HEATMAP TAB ──────────────────────────────────────────────
  if (activeTab === "heatmap") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.heatmapTitle} subtitle={dict.farmer.pageHeaders.heatmapSub} />
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 mb-6">
            <FpoHeatmapHero
              crop={activeCrop}
              availableCrops={data.crops}
              districts={data.districts}
              selectedDistrict={deferredDistrict}
              generatedAt={data.generatedAt}
              source={data.source}
              onSelectDistrict={(d) => startTransition(() => setSelectedDistrict(d))}
              onSelectCrop={(c) => startTransition(() => setSelectedCropSlug(c))}
            />
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 grid grid-cols-2 gap-4">
              <div className="text-center">
                <span className="block text-xs text-on-surface-variant">{dict.farmer.overview.marketDemand}</span>
                <span className="text-lg font-bold text-tertiary">
                  {activeCrop.topOpportunityScore > 0 ? (activeCrop.topOpportunityScore / 10).toFixed(1) : "—"}/10
                </span>
              </div>
              <div className="text-center border-l border-outline-variant/10">
                <span className="block text-xs text-on-surface-variant">{dict.farmer.overview.priceChanges}</span>
                <span className="text-lg font-bold text-on-surface">
                  {activeCrop.routes.length > 3
                    ? dict.recommendations.urgency.high
                    : dict.recommendations.urgency.low}
                </span>
              </div>
            </div>
          </div>
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── INVENTORY / LISTINGS TAB ─────────────────────────────────
  if (activeTab === "inventory") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.listingsTitle} subtitle={dict.farmer.pageHeaders.listingsSub} />
          <ListingManager
            initialListings={data.listings}
            farmerUserId={data.profile.id}
            district={data.profile.district ?? deferredDistrict}
            state={data.profile.state ?? localState}
          />
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── RECOMMENDATIONS / WHERE-TO-SELL TAB ─────────────────────
  if (activeTab === "recommendations") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.whereToSellTitle} subtitle={dict.farmer.pageHeaders.whereToSellSub} />
          <div className="grid gap-4">
            {activeCrop.routes.slice(0, 8).map((route) => (
              <div
                key={`${route.sourceDistrict}:${route.targetDistrict}`}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10 flex flex-col sm:flex-row gap-6"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <p className="font-bold text-lg text-on-surface">
                      {route.sourceDistrict} → {route.targetDistrict}
                    </p>
                    <AiConfidenceBadge confidence={route.opportunityScore / 100} />
                  </div>
                  <p className="text-on-surface-variant text-sm mb-4">
                    {route.sourceState} → {route.targetState}
                  </p>
                  <ExplainabilityPanel
                    title={dict.recommendations.whyThisRoute}
                    summary={dict.farmer.overview.routeSummary}
                    reasons={[
                      dict.farmer.overview.demandStrength.replace(
                        "{value}",
                        route.demandStrength.toFixed(2),
                      ),
                      dict.farmer.overview.transportFeasibility.replace(
                        "{value}",
                        route.transportFeasibility.toFixed(2),
                      ),
                      dict.farmer.overview.destinationPays
                        .replace("{district}", route.targetDistrict)
                        .replace(
                          "{targetPrice}",
                          formatCurrency(route.targetModalPrice),
                        )
                        .replace(
                          "{sourcePrice}",
                          formatCurrency(route.sourceModalPrice),
                        ),
                    ]}
                  />
                </div>
                <div className="flex flex-col items-end justify-between gap-4 shrink-0">
                  <span className="px-4 py-2 bg-tertiary-container text-on-tertiary-container rounded-full font-bold text-lg">
                    +{formatCurrency(route.priceGap)}
                  </span>
                  <button
                    onClick={() => navigate("directory")}
                    className="bg-gradient-to-r from-primary to-primary-container text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
                  >
                    {dict.farmer.overview.findBuyersHere}
                  </button>
                </div>
              </div>
            ))}
            {activeCrop.routes.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl mb-4 block" data-icon="route">route</span>
                <p className="font-semibold">{dict.farmer.overview.noRoutesTitle}</p>
                <p className="text-sm mt-1">{dict.farmer.overview.noRoutesDesc}</p>
              </div>
            )}
          </div>
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── DIRECTORY / FPOs TAB ─────────────────────────────────────
  if (activeTab === "directory") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold font-headline tracking-tight text-on-surface">{dict.farmer.pageHeaders.findFpoTitle}</h1>
              <p className="text-on-surface-variant mt-1 italic">{dict.farmer.pageHeaders.findFpoSub}</p>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">{dict.farmer.overview.nearYou}</span>
              <span className="text-2xl font-bold font-headline">
                {data.fpos.length} {dict.farmer.overview.fposCount}
              </span>
            </div>
          </div>
          <FpoDirectoryMap fpos={data.fpos} farmerDistrict={data.profile.district ?? deferredDistrict} />
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── EARNINGS TAB ─────────────────────────────────────────────
  if (activeTab === "earnings") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.earningsTitle} subtitle={dict.farmer.pageHeaders.earningsSub} />
          <MyEarnings
            matches={matches}
            cropName={activeCrop.name}
            prices={activeCrop.prices}
            routes={activeCrop.routes}
            localDistrict={deferredDistrict}
          />
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── ALERTS TAB ───────────────────────────────────────────────
  if (activeTab === "alerts") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.alertsTitle} subtitle={dict.farmer.pageHeaders.alertsSub} />
          <AlertsReportsPanel
            notifications={notifications}
            matches={matches}
            title={dict.farmer.overview.alertsPanelTitle}
            description={dict.farmer.overview.alertsPanelDescription}
          />
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── SETTINGS TAB ─────────────────────────────────────────────
  if (activeTab === "settings") {
    return (
      <DashboardShell role="farmer" districtLabel={deferredDistrict}>
        <div className="p-6 md:p-8">
          <TabHeader title={dict.farmer.pageHeaders.settingsTitle} subtitle={dict.farmer.pageHeaders.settingsSub} />
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
        </div>
        <MobileBottomNav variant="farmer" />
      </DashboardShell>
    );
  }

  // ── OVERVIEW (default) ────────────────────────────────────────
  return (
    <DashboardShell role="farmer" districtLabel={deferredDistrict}>
      {/* ── DEMO DATA BANNER ── */}
      {data.source === "mock" && (
        <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-base" data-icon="warning">warning</span>
          <span>
            <strong>{dict.farmer.overview.demoBannerTitle}</strong>{" "}
            {dict.farmer.overview.demoBannerDescription}
          </span>
        </div>
      )}
      {/* ── HERO BANNER ── */}
      <section className="px-6 pt-8 pb-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-700 text-white p-8 mb-6">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tight mb-2">
              {dict.farmer.overview.greeting.replace(
                "{name}",
                data.profile.fullName.split(" ")[0] ?? "",
              )}
            </h2>
            <p className="text-emerald-50 text-lg md:text-xl font-medium opacity-90 max-w-2xl">
              {dict.farmer.overview.heroPriceLine
                .replace(
                  "{cropName}",
                  dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ??
                    activeCrop.name,
                )
                .replace("{district}", deferredDistrict)
                .replace(
                  "{price}",
                  localPrice ? formatCurrency(localPrice.modalPrice) : "—",
                )}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none flex items-center justify-end pr-4">
            <span className="material-symbols-outlined text-[10rem]" data-icon="eco">eco</span>
          </div>
        </div>

        {/* ── MARKET GAP + ALERT CARDS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Market Gap */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 shadow-sm border-l-[6px] border-primary relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-8xl" data-icon="trending_up">trending_up</span>
            </div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-bold uppercase tracking-wider mb-4">
                {dict.farmer.overview.marketGapFound}
              </span>
              <h3 className="text-2xl font-bold text-on-surface mb-4 leading-tight">
                {bestRoute
                  ? <>{dict.farmer.overview.sellInFor.replace("{district}", bestRoute.targetDistrict).replace("{price}", formatCurrency(bestRoute.targetModalPrice))}</>
                  : dict.farmer.overview.analyzingBestRoutes}
              </h3>
              {bestRoute && (
                <p className="text-on-surface-variant text-lg mb-6">
                  <span className="text-emerald-700 font-bold">
                    {dict.farmer.overview.moreProfitCompared.replace(
                      "{price}",
                      formatCurrency(bestRoute.priceGap),
                    )}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate("directory")}
                  className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-primary/20 hover:opacity-90 transition-all"
                >
                  {dict.farmer.overview.unlockLogistics}
                </button>
                <button
                  onClick={() => navigate("directory")}
                  className="bg-surface-container-high text-on-surface px-6 py-3 rounded-lg font-semibold hover:bg-surface-container-highest transition-colors"
                >
                  {dict.farmer.overview.viewNearFpos.replace(
                    "{count}",
                    String(data.fpos.length),
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Alert / Match card */}
          {activeMatch ? (
            <div className="bg-secondary-container text-on-secondary-container rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-4xl mb-4 block" data-icon="priority_high">priority_high</span>
                <h4 className="text-xl font-bold mb-2">{dict.farmer.overview.buyerMatch}</h4>
                <p className="opacity-90 text-sm">
                  {dict.farmer.overview
                    .matchInterestLive
                    .replace("{cropName}", activeMatch.cropName)
                    .replace(
                      "{quantity}",
                      activeMatch.quantityKg?.toLocaleString("en-IN") ?? "--",
                    )}
                </p>
              </div>
              <Button
                disabled={isActionPending}
                className="mt-6 bg-white/20 hover:bg-white/30 text-white font-bold border-0"
                onClick={() =>
                  startActionTransition(async () => {
                    setActionError(null);
                    const res = await fetch("/api/matches/accept", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ farmerUserId: data.profile.id, matchId: activeMatch.id }),
                    });
                    const payload = (await res.json()) as MatchAcceptResponse;
                    if (!res.ok || !payload.ok) {
                       setActionError(
                         ("error" in payload ? payload.error : undefined) ??
                           dict.farmer.overview.couldNotAccept,
                       );
                      return;
                    }
                    setMatches((cur) => cur.map((e) => (e.id === payload.match.id ? payload.match : e)));
                    setNotifications((cur) => [payload.farmerNotification, ...cur]);
                    setAcceptanceMessage(payload.farmerMessage);
                  })
                }
              >
                {isActionPending
                  ? dict.farmer.overview.accepting
                  : dict.farmer.overview.acceptMatch}
              </Button>
            </div>
          ) : (
            <div className="bg-secondary-container text-on-secondary-container rounded-xl p-6 flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-4xl mb-4 block" data-icon="priority_high">priority_high</span>
                <h4 className="text-xl font-bold mb-2">{dict.farmer.overview.priceAlert}</h4>
                <p className="opacity-90 text-sm">
                  {priceGap > 0
                    ? dict.farmer.overview
                        .earnMorePerQuintal
                        .replace("{amount}", formatCurrency(priceGap))
                        .replace(
                          "{district}",
                          highestPrice?.district ?? dict.farmer.overview.topMarket,
                        )
                    : dict.farmer.overview.setPriceAlerts}
                </p>
              </div>
              <button
                onClick={() => navigate("alerts")}
                className="mt-6 bg-white/20 hover:bg-white/30 text-white font-bold border-0 rounded-lg py-2 px-4 text-sm transition-all"
              >
                {dict.farmer.overview.viewAlerts}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── MY LIVE CROPS ── */}
      <section className="px-6 mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black font-headline text-emerald-900">{dict.farmer.overview.myLiveCrops}</h2>
            <p className="text-slate-500">{dict.farmer.overview.liveCropsSub}</p>
          </div>
          <Link href="/register/farmer" className="text-primary font-bold hover:underline flex items-center gap-1 text-sm">
            {dict.farmer.overview.editFarm} <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
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
                  isActive && "ring-2 ring-primary",
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <span className={cn("material-symbols-outlined text-3xl", iconColor)} data-icon={icon}>{icon}</span>
                  </div>
                  {isScarcity ? (
                     <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold rounded">{dict.farmer.overview.scarcity}</span>
                  ) : (
                     <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded">{dict.farmer.overview.surplus}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold mb-1">
                  {dict.crops?.[crop.slug as keyof typeof dict.crops] ?? crop.name}
                </h3>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{dict.farmer.overview.localPrice}</p>
                    <p className="text-xl font-black text-slate-900">{cropLocalPrice ? formatCurrency(cropLocalPrice.modalPrice) : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{dict.farmer.overview.bestState}</p>
                    <p className="text-xl font-black text-emerald-700">{cropBestPrice ? formatCurrency(cropBestPrice.modalPrice) : "—"}</p>
                  </div>
                </div>
              </button>
            );
          })}

          <Link
            href="/register/farmer"
            className="border-2 border-dashed border-outline-variant p-6 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-3xl mb-2" data-icon="add_circle">add_circle</span>
            <span className="font-bold text-sm">{dict.farmer.overview.addNewCrop}</span>
          </Link>
        </div>
      </section>

      {/* ── FORECAST + QUICK ACTIONS ── */}
      <section className="px-6 mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forecast chart */}
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black font-headline text-on-surface">
                {dict.farmer.overview.forecastTitle.replace(
                  "{cropName}",
                  dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ??
                    activeCrop.name,
                )}
              </h3>
              <p className="text-sm text-slate-500">{dict.forecast.predictedDailyPriceTrends}</p>
            </div>
            {bestRoute && bestRoute.priceGap > 0 ? (
              <div className="flex items-center bg-tertiary-container text-on-tertiary-container px-4 py-2 rounded-full font-bold text-sm">
                <span className="material-symbols-outlined text-xl mr-1" data-icon="trending_up">trending_up</span>{dict.forecast.sellNow}
              </div>
            ) : (
              <div className="flex items-center bg-secondary-fixed text-on-secondary-fixed px-4 py-2 rounded-full font-bold text-sm">
                <span className="material-symbols-outlined text-xl mr-1" data-icon="front_hand">front_hand</span>{dict.forecast.hold}
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

        {/* Quick Actions 2×2 — each navigates to the correct tab */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: dict.farmer.overview.findBuyer, icon: "search", tab: "directory" },
            { label: dict.farmer.overview.listMyCrop, icon: "add_box", tab: "inventory" },
            { label: dict.farmer.overview.findFpo, icon: "hub", tab: "directory" },
            { label: dict.farmer.overview.trackSales, icon: "local_shipping", tab: "earnings" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.tab)}
              className="flex flex-col items-center justify-center bg-surface-container-low hover:bg-primary hover:text-white transition-all p-8 rounded-xl group cursor-pointer"
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

      <MobileBottomNav variant="farmer" />
      <AiChatWidget userId={data.profile.id} />
    </DashboardShell>
  );
}
