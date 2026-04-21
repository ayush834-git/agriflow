"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useState, useTransition } from "react";
import {
  ArrowUpRight,
  BellRing,
  ChevronRight,
  LocateFixed,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

import { AiConfidenceBadge } from "@/components/dashboard/ai-confidence-badge";
import { DistrictHeatmap } from "@/components/dashboard/district-heatmap";
import { ExplainabilityPanel } from "@/components/dashboard/explainability-panel";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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

const BestTimeToSell = dynamic(
  () =>
    import("@/components/dashboard/best-time-to-sell").then(
      (mod) => mod.BestTimeToSell,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="forecast" />,
  },
);

const FpoDirectoryMap = dynamic(
  () =>
    import("@/components/dashboard/fpo-directory-map").then(
      (mod) => mod.FpoDirectoryMap,
    ),
  { loading: () => <DashboardPanelLoading label="FPO directory" /> },
);

const ListingManager = dynamic(
  () =>
    import("@/components/dashboard/listing-manager").then(
      (mod) => mod.ListingManager,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="listings" />,
  },
);

const MarketPriceChart = dynamic(
  () =>
    import("@/components/dashboard/market-price-chart").then(
      (mod) => mod.MarketPriceChart,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="market chart" />,
  },
);

const MyEarnings = dynamic(
  () =>
    import("@/components/dashboard/my-earnings").then((mod) => mod.MyEarnings),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="earnings" />,
  },
);

const FarmerSettingsPanel = dynamic(
  () =>
    import("@/components/settings/farmer-settings-panel").then(
      (mod) => mod.FarmerSettingsPanel,
    ),
  {
    ssr: false,
    loading: () => <DashboardPanelLoading label="profile settings" />,
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

export function FarmerDashboardClient({ data }: FarmerDashboardClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();
  const [selectedTab, setSelectedTab] = useState("routes");
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
  const { dict } = useI18n();

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
  const districtRoutes = activeCrop.routes.filter(
    (route) =>
      route.sourceDistrict === deferredDistrict ||
      route.targetDistrict === deferredDistrict,
  );
  const routeBoard = districtRoutes.length > 0 ? districtRoutes : activeCrop.routes;
  const activeMatch =
    matches.find((match) => match.status === "CONTACTED" || match.status === "OPEN") ??
    null;

  return (
    <DashboardShell role="farmer">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Hero Section */}
        <div className="w-full bg-gradient-to-br from-primary-container/60 to-tertiary-container/30 rounded-3xl p-6 lg:p-10 border border-outline-variant/20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
             <div className="flex flex-wrap items-center gap-2 mb-4">
               <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase">Live in AP & TS</span>
               <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase">
                 Updated {formatGeneratedAt(data.generatedAt)}
               </span>
             </div>
             <h1 className="text-3xl md:text-5xl font-headline font-black text-on-surface mb-3">{dict.farmer.heroHeadline}</h1>
             <p className="text-on-surface-variant max-w-2xl">{dict.farmer.heroSub}</p>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
             <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold px-6 py-6 w-full lg:w-auto"
              >
                <Link href="/register/farmer">
                  Update Profile
                  <ChevronRight className="size-4 ml-2" />
                </Link>
              </Button>
          </div>
        </div>

        {/* Global Alerts */}
        {activeMatch && (
          <div className="bg-tertiary-container/50 border border-tertiary/20 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3">
               <div className="bg-tertiary/10 text-tertiary rounded-full p-2 h-fit">
                 <BellRing className="size-5" />
               </div>
               <div>
                  <h3 className="font-bold text-on-surface">You have a match for {dict.crops?.[activeMatch.cropSlug as keyof typeof dict.crops] ?? activeMatch.cropName}</h3>
                  <p className="text-sm text-on-surface-variant">Buyer interest is live for {activeMatch.quantityKg?.toLocaleString("en-IN") ?? "--"} kg.</p>
               </div>
            </div>
            <Button
              disabled={isActionPending}
              className="bg-tertiary text-on-tertiary whitespace-nowrap shrink-0"
              onClick={() =>
                startActionTransition(async () => {
                  setActionError(null);
                  setAcceptanceMessage(null);
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

                  setMatches((current) => current.map((entry) => entry.id === payload.match.id ? payload.match : entry));
                  setNotifications((current) => [payload.farmerNotification, ...current]);
                  setAcceptanceMessage(payload.farmerMessage);
                })
              }
            >
              {isActionPending ? dict.farmer.accepting : dict.farmer.acceptMatch}
            </Button>
          </div>
        )}

        {data.warnings.length > 0 && (
         <div className="bg-error-container/50 border border-error/20 rounded-2xl p-4 flex gap-3">
             <div className="bg-error/10 text-error rounded-full p-2 h-fit">
               <ShieldAlert className="size-5" />
             </div>
             <div className="space-y-1">
               {data.warnings.map(w => <p key={w} className="text-sm font-medium text-on-surface">{w}</p>)}
             </div>
         </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_380px] gap-6">
          
          {/* Left Column */}
          <div className="flex flex-col gap-6">
             {/* Crop Filter Horizontal Scroll */}
             <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
               {data.crops.map((crop) => {
                 const isActive = crop.slug === deferredCropSlug;
                 return (
                   <button
                     key={crop.slug}
                     onClick={() => startTransition(() => setSelectedCropSlug(crop.slug))}
                     className={cn(
                       "flex items-center gap-3 px-5 py-3 rounded-xl border transition-all shrink-0 font-medium",
                       isActive 
                         ? "bg-primary text-on-primary border-primary shadow-sm"
                         : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
                     )}
                   >
                      {dict.crops?.[crop.slug as keyof typeof dict.crops] ?? crop.name}
                   </button>
                 );
               })}
             </div>

             {/* Tabbed Board */}
             <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl overflow-hidden shadow-sm">
                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <div className="bg-surface-container-low px-6 pt-6 border-b border-outline-variant/20">
                     <h2 className="text-2xl font-headline font-bold text-on-surface mb-6">
                       {dict.farmer.cropDetail} {dict.crops?.[activeCrop.slug as keyof typeof dict.crops] ?? activeCrop.name}
                     </h2>
                     <TabsList className="bg-transparent h-auto p-0 w-full justify-start overflow-x-auto rounded-none border-b-0 space-x-6">
                       <TabsTrigger value="routes" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.whereToSell}</TabsTrigger>
                       <TabsTrigger value="prices" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.marketPrices}</TabsTrigger>
                       <TabsTrigger value="forecast" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.forecast}</TabsTrigger>
                       <TabsTrigger value="listings" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.listings}</TabsTrigger>
                       <TabsTrigger value="earnings" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.earnings}</TabsTrigger>
                       <TabsTrigger value="fpos" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.findFpo}</TabsTrigger>
                       <TabsTrigger value="alerts" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0">{dict.farmer.tabs.alerts}</TabsTrigger>
                     </TabsList>
                  </div>
                  
                  <div className="p-6 overflow-hidden">
                    {/* Routes Tab */}
                    {selectedTab === "routes" && (
                    <TabsContent value="routes" className="m-0 border-none outline-none">
                      <div className="grid gap-4">
                        {routeBoard.slice(0, 6).map((route) => (
                          <div
                            key={`${route.sourceDistrict}:${route.targetDistrict}`}
                            className={cn(
                              "grid gap-4 rounded-[1rem] border px-5 py-5 lg:grid-cols-[1.5fr_1fr_0.8fr]",
                              route.sourceDistrict === deferredDistrict
                                ? "border-primary/20 bg-primary/5"
                                : "border-outline-variant/20 bg-surface-container"
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <p className="font-bold text-on-surface">
                                  {route.sourceDistrict} <span className="material-symbols-outlined align-middle text-[18px] text-on-surface-variant mx-1">arrow_forward</span> {route.targetDistrict}
                                </p>
                                <AiConfidenceBadge confidence={route.opportunityScore / 100} />
                              </div>
                              <p className="text-on-surface-variant text-sm">
                                {route.sourceState} to {route.targetState}
                              </p>
                            </div>
                            <div className="space-y-1 text-sm text-on-surface-variant">
                              <p><span className="font-semibold text-on-surface">{dict.common.source}</span> {formatCurrency(route.sourceModalPrice)}/q</p>
                              <p><span className="font-semibold text-on-surface">{dict.common.target}</span> {formatCurrency(route.targetModalPrice)}/q</p>
                            </div>
                            <div className="space-y-1">
                              <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded text-sm font-bold block w-fit">
                                +{formatCurrency(route.priceGap)}
                              </span>
                            </div>
                            <div className="lg:col-span-3 mt-2">
                              <ExplainabilityPanel
                                title={dict.farmer.routes.whyThisRoute}
                                summary="The route score combines demand strength, transport feasibility, and the local price spread."
                                reasons={[
                                  `Demand strength ${route.demandStrength.toFixed(2)} and transport feasibility ${route.transportFeasibility.toFixed(2)} support this corridor.`,
                                  `${route.targetDistrict} is paying ${formatCurrency(route.targetModalPrice)} vs ${formatCurrency(route.sourceModalPrice)} locally.`,
                                ]}
                              />
                            </div>
                          </div>
                        ))}
                        {routeBoard.length === 0 && (
                          <div className="py-12 text-center text-on-surface-variant">No routes available right now.</div>
                        )}
                      </div>
                    </TabsContent>
                    )}

                    {/* Prices Tab */}
                    {selectedTab === "prices" && (
                    <TabsContent value="prices" className="m-0 border-none outline-none">
                      <MarketPriceChart prices={activeCrop.prices} localDistrict={deferredDistrict} />
                      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {activeCrop.prices.map((price) => {
                          const isLocal = price.district === deferredDistrict;
                          return (
                            <div
                              key={`${price.district}:${price.marketDate}`}
                              className={cn(
                                "rounded-xl border p-5 flex flex-col justify-between",
                                isLocal ? "border-primary/20 bg-primary/5" : "border-outline-variant/20 bg-surface-container"
                              )}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="font-bold text-on-surface">{price.district}</p>
                                  <p className="text-on-surface-variant text-sm">{price.state}</p>
                                </div>
                                <span className="font-black text-xl text-primary">{formatCurrency(price.modalPrice)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-on-surface-variant font-medium">
                                <span>Arrivals: {price.arrivalsTonnes?.toFixed(1) ?? "--"}T</span>
                                <span>{price.marketDate}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                    )}

                    {/* Other Tabs (Forecast, Listings, Earnings, FPOs, Alerts) */}
                    {selectedTab === "forecast" && (
                       <TabsContent value="forecast" className="m-0 border-none outline-none">
                          <BestTimeToSell cropName={activeCrop.name} cropSlug={activeCrop.slug} prices={activeCrop.prices} localDistrict={deferredDistrict} source={data.source} />
                       </TabsContent>
                    )}

                    {selectedTab === "listings" && (
                      <TabsContent value="listings" className="m-0 border-none outline-none">
                         <ListingManager initialListings={data.listings} farmerUserId={data.profile.id} district={data.profile.district ?? deferredDistrict} state={data.profile.state ?? localState} />
                      </TabsContent>
                    )}

                    {selectedTab === "earnings" && (
                      <TabsContent value="earnings" className="m-0 border-none outline-none">
                         <MyEarnings matches={matches} cropName={activeCrop.name} prices={activeCrop.prices} routes={activeCrop.routes} localDistrict={deferredDistrict} />
                      </TabsContent>
                    )}

                    {selectedTab === "fpos" && (
                      <TabsContent value="fpos" className="m-0 border-none outline-none">
                        <FpoDirectoryMap fpos={data.fpos} farmerDistrict={data.profile.district ?? deferredDistrict} />
                      </TabsContent>
                    )}

                    {selectedTab === "alerts" && (
                      <TabsContent value="alerts" className="m-0 border-none outline-none">
                         <AlertsReportsPanel notifications={notifications} matches={matches} title="Alerts and match inbox" description="Daily crop alerts, match interest, and push previews are all visible here." />
                      </TabsContent>
                    )}
                  </div>
                </Tabs>
             </div>
          </div>

          {/* Right Column / Asides */}
          <div className="flex flex-col gap-6">
             {/* Map Module (Top Right Bento) */}
             <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl overflow-hidden shadow-sm flex flex-col items-center justify-center p-0">
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
             </div>

             {/* Decision Board Stats Card */}
             <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-[24px] text-primary">location_on</span>
                    <h3 className="font-headline font-bold text-xl text-on-surface">{deferredDistrict}</h3>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                      <span className="text-on-surface-variant font-medium">Local Quote</span>
                      <span className="font-bold text-xl">{localPrice ? formatCurrency(localPrice.modalPrice) : '--'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                      <span className="text-on-surface-variant font-medium">Highest Quote</span>
                      <span className="font-bold text-xl text-primary">{highestPrice ? formatCurrency(highestPrice.modalPrice) : '--'}</span>
                   </div>
                   <div className="flex justify-between items-center pb-2">
                      <span className="text-on-surface-variant font-medium">Average Spread</span>
                      <span className="font-bold text-xl text-tertiary">+{formatCurrency(averageGap)}</span>
                   </div>
                 </div>
             </div>

             {/* WhatsApp Card */}
             <div className="bg-primary-container text-on-primary-container rounded-3xl p-6 border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Smartphone className="size-32" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-headline font-bold mb-2">WhatsApp Bot</h3>
                  <p className="text-sm opacity-90 mb-4 text-balance">Get live market prices instantly by texting us in {LANGUAGE_OPTIONS.find((option) => option.value === preferredLanguage)?.label ?? preferredLanguage}.</p>
                  <Button asChild className="bg-primary hover:bg-primary/90 text-on-primary w-full">
                    <a href="https://wa.me/14155238886?text=Hi" target="_blank" rel="noreferrer">
                      Open WhatsApp <span className="material-symbols-outlined text-[18px] ml-2">open_in_new</span>
                    </a>
                  </Button>
                </div>
             </div>

             {/* Farmer Settings */}
             <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-3xl p-6 shadow-sm">
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
             </div>
          </div>

        </div>

      </div>
      <MobileBottomNav variant="farmer" />
    </DashboardShell>
  );
}
