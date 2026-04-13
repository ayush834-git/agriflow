"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import {
  ArrowUpRight,
  BellRing,
  ChevronRight,
  LocateFixed,
  PackageCheck,
  RadioTower,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { AlertsReportsPanel } from "@/components/dashboard/alerts-reports-panel";
import { BestTimeToSell } from "@/components/dashboard/best-time-to-sell";
import { DistrictHeatmap } from "@/components/dashboard/district-heatmap";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { FpoDirectoryMap } from "@/components/dashboard/fpo-directory-map";
import { ListingManager } from "@/components/dashboard/listing-manager";
import { MarketPriceChart } from "@/components/dashboard/market-price-chart";
import { MyEarnings } from "@/components/dashboard/my-earnings";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { FarmerSettingsPanel } from "@/components/settings/farmer-settings-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  | {
      ok: true;
      match: MarketMatch;
      farmerNotification: AppNotification;
      farmerMessage: string;
    }
  | { ok: false; error?: string };

const LANGUAGE_OPTIONS: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "te", label: "Telugu" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "en", label: "English" },
];

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

export function FarmerDashboardClient({ data }: FarmerDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [selectedCropSlug, setSelectedCropSlug] = useState(data.defaultCropSlug);
  const [selectedDistrict, setSelectedDistrict] = useState(
    data.profile.district ??
      data.districts.find((district) => district.district === "Kurnool")?.district ??
      data.districts[0]?.district ??
      "",
  );
  const [matches, setMatches] = useState(data.matches);
  const [notifications, setNotifications] = useState(data.notifications);
  const [acceptanceMessage, setAcceptanceMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState(
    data.profile.preferredLanguage,
  );
  const { dict, setLang } = useI18n();

  useEffect(() => {
    setLang(data.profile.preferredLanguage);
  }, [data.profile.preferredLanguage, setLang]);

  const deferredCropSlug = useDeferredValue(selectedCropSlug);
  const deferredDistrict = useDeferredValue(selectedDistrict);
  const activeCrop =
    data.crops.find((crop) => crop.slug === deferredCropSlug) ?? data.crops[0];

  if (!activeCrop) {
    return null;
  }

  const localPrice =
    activeCrop.prices.find((price) => price.district === deferredDistrict) ??
    activeCrop.prices[0];
  const bestRoute =
    activeCrop.routes.find((route) => route.sourceDistrict === deferredDistrict) ??
    activeCrop.routes[0];
  const localState =
    data.districts.find((district) => district.district === deferredDistrict)?.state ??
    localPrice?.state ??
    "";
  const highestPrice = activeCrop.prices[0];
  const averageGap =
    activeCrop.routes.length > 0
      ? activeCrop.routes.reduce((sum, route) => sum + route.priceGap, 0) /
        activeCrop.routes.length
      : 0;
  const routeBoard =
    activeCrop.routes.filter(
      (route) =>
        route.sourceDistrict === deferredDistrict ||
        route.targetDistrict === deferredDistrict,
    ).length > 0
      ? activeCrop.routes.filter(
          (route) =>
            route.sourceDistrict === deferredDistrict ||
            route.targetDistrict === deferredDistrict,
        )
      : activeCrop.routes;
  const activeMatch =
    matches.find((match) => match.status === "CONTACTED" || match.status === "OPEN") ??
    null;

  return (
    <PageTransition pageKey="farmer-dashboard">
    <main
      className={cn(
        "mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 pb-20 transition-opacity sm:px-6 sm:pb-5 lg:px-8",
        isPending ? "opacity-95" : "opacity-100",
      )}
      aria-busy={isPending}
    >
      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(33,79,56,0.97),rgba(51,104,70,0.95)_48%,rgba(204,161,57,0.82)_160%)] text-primary-foreground shadow-[0_45px_140px_-70px_rgba(19,52,34,0.8)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.18fr_0.82fr] lg:px-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
                Phase 10 workspace
              </Badge>
              <Badge className="border-white/15 bg-white/8 text-white/86 hover:bg-white/8">
                {data.source === "mock" ? "Demo-safe market stream" : "Live feed"}
              </Badge>
              <Badge className="border-white/15 bg-white/8 text-white/86 hover:bg-white/8">
                Updated {formatGeneratedAt(data.generatedAt)}
              </Badge>
              {data.profile.isDemo ? (
                <Badge className="border-white/15 bg-white/8 text-white/86 hover:bg-white/8">
                  Demo farmer profile
                </Badge>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/72">
                {dict.farmer.dashboardTitle}
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {dict.farmer.heroHeadline}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                {dict.farmer.heroSub}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="border-white/10 bg-white text-[rgb(33,79,56)] hover:bg-white/92"
              >
                <Link href="/register/farmer">
                  Update farmer profile
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/18 bg-transparent text-white hover:bg-white/8 hover:text-white"
              >
                <Link href="/api/health">Check data readiness</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                {dict.farmer.profile}
              </p>
              <p className="mt-3 text-2xl font-semibold">{data.profile.fullName}</p>
              <p className="mt-2 text-sm text-white/70">
                {data.profile.district ?? "District pending"}
              </p>
              <p className="mt-1 text-xs text-white/60">
                WhatsApp language: {LANGUAGE_OPTIONS.find((option) => option.value === preferredLanguage)?.label ?? preferredLanguage}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                {dict.farmer.localQuote}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {localPrice ? formatCurrency(localPrice.modalPrice) : dict.farmer.market.noQuote}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ?? activeCrop.name}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                {dict.farmer.matchInbox}
              </p>
              <p className="mt-3 text-2xl font-semibold">{matches.length}</p>
            </div>
          </div>
        </div>
      </section>

      {activeMatch ? (
        <section className="rounded-[1.5rem] border border-emerald-300/40 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">You have a match for {dict.crops?.[activeMatch.cropSlug as keyof typeof dict.crops] ?? activeMatch.cropName}.</p>
                <p>
                  Buyer interest is live for{" "}
                  {activeMatch.quantityKg?.toLocaleString("en-IN") ?? "--"} kg. You can
                  still confirm via WhatsApp by replying YES, or accept right here.
                </p>
              </div>
            </div>
            <Button
              type="button"
              disabled={isActionPending}
              onClick={() =>
                startActionTransition(async () => {
                  setActionError(null);
                  setAcceptanceMessage(null);
                  const response = await fetch("/api/matches/accept", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      farmerUserId: data.profile.id,
                      matchId: activeMatch.id,
                    }),
                  });
                  const payload = (await response.json()) as MatchAcceptResponse;

                  if (!response.ok || !payload.ok) {
                    setActionError(
                      ("error" in payload ? payload.error : undefined) ??
                        "Could not accept the match.",
                    );
                    return;
                  }

                  setMatches((current) =>
                    current.map((entry) =>
                      entry.id === payload.match.id ? payload.match : entry,
                    ),
                  );
                  setNotifications((current) => [
                    payload.farmerNotification,
                    ...current,
                  ]);
                  setAcceptanceMessage(payload.farmerMessage);
                })
              }
            >
              {isActionPending ? dict.farmer.accepting : dict.farmer.acceptMatch}
            </Button>
          </div>
          {acceptanceMessage ? <p className="mt-3">{acceptanceMessage}</p> : null}
          {actionError ? <p className="mt-3 text-red-700">{actionError}</p> : null}
        </section>
      ) : null}

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
                  })
                }
                className={cn(
                  "group min-w-[220px] rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-300",
                  isActive
                    ? "border-primary/35 bg-[linear-gradient(180deg,rgba(247,252,247,0.98),rgba(236,247,239,0.95))] shadow-[0_24px_60px_-44px_rgba(36,92,60,0.75)]"
                    : "border-border/60 bg-background/70 hover:border-primary/22 hover:bg-background/88",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold">{dict.crops?.[crop.slug as keyof typeof dict.crops] ?? crop.name}</p>
                  <ArrowUpRight
                    className={cn(
                      "size-4 transition-transform duration-300",
                      isActive ? "translate-x-0" : "group-hover:translate-x-0.5",
                    )}
                  />
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <p>{dict.common.average} {formatCurrency(crop.averageModalPrice)}</p>
                  <p>
                    {dict.common.bestCorridor}{" "}
                    <span className="font-medium text-foreground">
                      {topRoute ? formatCurrency(topRoute.priceGap) : dict.farmer.market.noSpread}
                    </span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <DistrictHeatmap
          cropName={activeCrop.name}
          districts={data.districts}
          prices={activeCrop.prices}
          routes={activeCrop.routes}
          selectedDistrict={deferredDistrict}
          generatedAt={data.generatedAt}
          source={data.source}
          onSelectDistrict={(district) =>
            startTransition(() => {
              setSelectedDistrict(district);
            })
          }
        />

        <aside className="flex flex-col gap-4">
          <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.55)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                  {dict.farmer.decisionBoard}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {deferredDistrict}
                </h2>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LocateFixed className="size-5" />
              </div>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="border-b border-border/60 pb-4">
                <p className="text-muted-foreground">{dict.farmer.market.currentQuote}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {localPrice ? formatCurrency(localPrice.modalPrice) : dict.farmer.market.noQuote}
                </p>
              </div>

              <div className="border-b border-border/60 pb-4">
                <p className="text-muted-foreground">{dict.farmer.market.bestDestination}</p>
                <p className="mt-2 text-xl font-semibold">
                  {bestRoute ? bestRoute.targetDistrict : dict.farmer.market.noSpread}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {bestRoute
                    ? `${bestRoute.targetState} at ${formatCurrency(bestRoute.targetModalPrice)}`
                    : null}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.35rem] border border-border/70 bg-background/65 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {dict.farmer.market.highestQuote}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {highestPrice
                      ? `${highestPrice.district} ${formatCurrency(highestPrice.modalPrice)}`
                      : dict.farmer.market.noQuote}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-border/70 bg-background/65 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {dict.farmer.market.averageSpread}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {activeCrop.routes.length > 0
                      ? formatCurrency(averageGap)
                      : "0"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <RadioTower className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Alert-ready shell</p>
                <p className="text-sm text-muted-foreground">
                  Installable PWA shell, match inbox, and alert logging are now connected.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-background/60 px-4 py-3">
                <Smartphone className="size-4 text-primary" />
                Push preview can be enabled from the alerts tab
              </div>
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-border/70 bg-background/60 px-4 py-3">
                <PackageCheck className="size-4 text-primary" />
                Listings are now available to FPO buyer matching
              </div>
            </div>
          </section>

          <FarmerSettingsPanel
            userId={data.profile.id}
            phone={data.profile.phone}
            initialLanguage={data.profile.preferredLanguage}
            initialAddress={data.profile.address}
            initialDistrict={data.profile.district}
            initialState={data.profile.state}
            initialCropSlugs={data.cropPreferences.map((crop) => crop.cropSlug)}
            onLanguageUpdated={(language) => {
              setPreferredLanguage(language);
            }}
          />
        </aside>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_28px_90px_-62px_rgba(30,78,50,0.45)]">
        <Tabs defaultValue="routes" className="gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
                {dict.farmer.decisionBoard}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {dict.farmer.cropDetail} {dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ?? activeCrop.name}
              </h2>
            </div>
            <TabsList
              variant="line"
              className="bg-transparent p-0"
              aria-label="Farmer dashboard sections"
            >
              <TabsTrigger value="routes">{dict.farmer.tabs.whereToSell}</TabsTrigger>
              <TabsTrigger value="prices">{dict.farmer.tabs.marketPrices}</TabsTrigger>
              <TabsTrigger value="forecast">{dict.farmer.tabs.forecast}</TabsTrigger>
              <TabsTrigger value="listings">{dict.farmer.tabs.listings}</TabsTrigger>
              <TabsTrigger value="earnings">{dict.farmer.tabs.earnings}</TabsTrigger>
              <TabsTrigger value="fpos">{dict.farmer.tabs.findFpo}</TabsTrigger>
              <TabsTrigger value="alerts">{dict.farmer.tabs.alerts}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="routes">
            <div className="mt-4 grid gap-3">
              {routeBoard.slice(0, 6).map((route) => (
                <div
                  key={`${route.sourceDistrict}:${route.targetDistrict}`}
                  className={cn(
                    "grid gap-3 rounded-[1.4rem] border px-4 py-4 text-sm lg:grid-cols-[1.5fr_1fr_0.8fr]",
                    route.sourceDistrict === deferredDistrict
                      ? "border-primary/30 bg-[linear-gradient(180deg,rgba(246,252,246,0.98),rgba(238,247,240,0.92))]"
                      : "border-border/70 bg-background/60",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">
                        {route.sourceDistrict}
                        {" -> "}
                        {route.targetDistrict}
                      </p>
                      <AiConfidenceBadge confidence={route.opportunityScore / 100} />
                    </div>
                    <p className="text-muted-foreground">
                      {route.sourceState} to {route.targetState}
                    </p>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <p>{dict.common.source} {formatCurrency(route.sourceModalPrice)}</p>
                    <p>{dict.common.target} {formatCurrency(route.targetModalPrice)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{formatCurrency(route.priceGap)} {dict.farmer.routes.spread}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <ExplainabilityPanel
                      title={dict.farmer.routes.whyThisRoute}
                      summary="The route score combines demand strength, transport feasibility, and the local price spread."
                      reasons={[
                        `Demand strength ${route.demandStrength.toFixed(2)} and transport feasibility ${route.transportFeasibility.toFixed(2)} support this corridor.`,
                        `${route.targetDistrict} is currently paying ${formatCurrency(route.targetModalPrice)} versus ${formatCurrency(route.sourceModalPrice)} in ${route.sourceDistrict}.`,
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prices">
            <MarketPriceChart prices={activeCrop.prices} localDistrict={deferredDistrict} />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {activeCrop.prices.map((price) => {
                const isLocal = price.district === deferredDistrict;

                return (
                  <div
                    key={`${price.district}:${price.marketDate}`}
                    className={cn(
                      "rounded-[1.4rem] border px-4 py-4 text-sm",
                      isLocal
                        ? "border-primary/30 bg-[linear-gradient(180deg,rgba(246,252,246,0.98),rgba(238,247,240,0.92))]"
                        : "border-border/70 bg-background/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{price.district}</p>
                        <p className="text-muted-foreground">{price.state}</p>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(price.modalPrice)}
                      </p>
                    </div>
                    <div className="mt-3 text-muted-foreground">
                      <p>Arrivals {price.arrivalsTonnes?.toFixed(1) ?? "--"} tonnes</p>
                      <p>Date {price.marketDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="forecast">
            <div className="mt-4">
              <BestTimeToSell
                cropName={activeCrop.name}
                cropSlug={activeCrop.slug}
                prices={activeCrop.prices}
                localDistrict={deferredDistrict}
                source={data.source}
              />
            </div>
          </TabsContent>

          <TabsContent value="listings">
            <div className="mt-4">
              <ListingManager
                initialListings={data.listings}
                farmerUserId={data.profile.id}
                district={data.profile.district ?? deferredDistrict}
                state={data.profile.state ?? localState}
              />
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <div className="mt-4">
              <MyEarnings
                matches={matches}
                cropName={activeCrop.name}
                prices={activeCrop.prices}
                routes={activeCrop.routes}
                localDistrict={deferredDistrict}
              />
            </div>
          </TabsContent>

          <TabsContent value="fpos">
            <div className="mt-4">
              <FpoDirectoryMap
                fpos={data.fpos}
                farmerDistrict={data.profile.district ?? deferredDistrict}
              />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="mt-4">
              <AlertsReportsPanel
                notifications={notifications}
                matches={matches}
                title="Alerts and match inbox"
                description="Daily crop alerts, match interest, and push previews are all visible here."
              />
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </main>
    <MobileBottomNav variant="farmer" />
    </PageTransition>
  );
}
