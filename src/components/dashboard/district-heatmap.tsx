"use client";

import { DataFreshnessBadge } from "@/components/dashboard/data-freshness-badge";
import { GoogleHeatmapOverlay } from "@/components/dashboard/district-heatmap-google";
import { useIsMapReady } from "@/components/providers/map-provider";
import { cn } from "@/lib/utils";
import type {
  DashboardDistrict,
  DashboardPricePoint,
  DashboardRoute,
} from "@/lib/dashboard";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";

type DistrictHeatmapProps = {
  cropName: string;
  districts: DashboardDistrict[];
  prices: DashboardPricePoint[];
  routes: DashboardRoute[];
  selectedDistrict: string;
  generatedAt: string;
  source: "live" | "mock";
  onSelectDistrict: (district: string) => void;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function DistrictHeatmap({
  cropName,
  districts,
  prices,
  routes,
  selectedDistrict,
  generatedAt,
  source,
  onSelectDistrict,
}: DistrictHeatmapProps) {
  const isMapReady = useIsMapReady();
  const maxPrice = Math.max(...prices.map((price) => price.modalPrice), 1);
  const maxOpportunity = Math.max(
    ...routes.map((route) => route.opportunityScore),
    1,
  );
  const visibleRoutes =
    routes.filter(
      (route) =>
        route.sourceDistrict === selectedDistrict ||
        route.targetDistrict === selectedDistrict,
    ).slice(0, 5) || [];
  const fallbackRoutes = visibleRoutes.length > 0 ? visibleRoutes : routes.slice(0, 5);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top,rgba(224,245,223,0.92),rgba(245,247,239,0.98)_58%,rgba(250,252,249,1))] p-5 shadow-[0_35px_100px_-65px_rgba(46,94,61,0.55)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(42,95,62,0.09),transparent_28%,transparent_72%,rgba(211,163,58,0.12))]" />
      <div className="pointer-events-none absolute -left-18 top-8 size-40 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 size-56 rounded-full bg-accent/18 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            District heatmap
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {cropName} opportunity map
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A stitched district view for the demo build. High-energy routes glow
            brighter, and tapping a district refocuses the route layer.
          </p>
        </div>
        <div className="rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          South corridor fallback map
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <DataFreshnessBadge generatedAt={generatedAt} source={source} />
      </div>

      <div className="relative mt-6 min-h-[520px] overflow-hidden rounded-[1.75rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(242,248,241,0.75))]">
        {isMapReady ? (
          <GoogleHeatmapOverlay
            districts={districts}
            prices={prices}
            routes={routes}
            selectedDistrict={selectedDistrict}
            maxPrice={maxPrice}
            maxOpportunity={maxOpportunity}
            onSelectDistrict={onSelectDistrict}
          />
        ) : (
        <>
          <svg
            viewBox="0 0 700 560"
            className="absolute inset-0 size-full"
            aria-hidden="true"
          >
          <defs>
            <linearGradient id="agriflow-route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(39,94,63,0.28)" />
              <stop offset="100%" stopColor="rgba(201,146,26,0.95)" />
            </linearGradient>
            <radialGradient id="district-pulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {fallbackRoutes.map((route) => {
            const source = DISTRICT_POSITIONS[route.sourceDistrict];
            const target = DISTRICT_POSITIONS[route.targetDistrict];

            if (!source || !target) {
              return null;
            }

            const controlX = (source.x + target.x) / 2;
            const controlY = Math.min(source.y, target.y) - 48;

            return (
              <path
                key={`${route.sourceDistrict}:${route.targetDistrict}`}
                d={`M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`}
                fill="none"
                stroke="url(#agriflow-route-gradient)"
                strokeLinecap="round"
                strokeWidth={2 + route.opportunityScore / maxOpportunity}
                className="route-flow opacity-90"
                strokeDasharray="10 10"
              />
            );
          })}
        </svg>

        {districts.map((district) => {
          const position = DISTRICT_POSITIONS[district.district];

          if (!position) {
            return null;
          }

          const price = prices.find((entry) => entry.district === district.district);
          const outgoing = routes
            .filter((route) => route.sourceDistrict === district.district)
            .sort((left, right) => right.opportunityScore - left.opportunityScore)[0];
          const incoming = routes
            .filter((route) => route.targetDistrict === district.district)
            .sort((left, right) => right.opportunityScore - left.opportunityScore)[0];
          const priceIntensity = price ? price.modalPrice / maxPrice : 0.2;
          const routeIntensity = Math.max(
            outgoing?.opportunityScore ?? 0,
            incoming?.opportunityScore ?? 0,
          );
          const heat = clamp(Math.max(priceIntensity * 0.72, routeIntensity / maxOpportunity));
          const mode =
            (outgoing?.opportunityScore ?? 0) > (incoming?.opportunityScore ?? 0) * 1.15
              ? "source"
              : (incoming?.opportunityScore ?? 0) >
                  (outgoing?.opportunityScore ?? 0) * 1.15
                ? "destination"
                : "balanced";
          const isSelected = selectedDistrict === district.district;
          const size = 18 + heat * 28;
          const ringClass =
            mode === "source"
              ? "bg-[rgba(44,100,67,0.92)] text-white"
              : mode === "destination"
                ? "bg-[rgba(212,154,34,0.92)] text-[rgb(43,49,31)]"
                : "bg-[rgba(80,124,96,0.82)] text-white";

          return (
            <button
              key={district.district}
              type="button"
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 shadow-[0_16px_40px_-24px_rgba(32,82,55,0.95)] transition-all duration-300",
                ringClass,
                isSelected
                  ? "z-20 scale-110 ring-4 ring-primary/25"
                  : "z-10 hover:scale-105",
              )}
              style={{
                left: `${(position.x / 700) * 100}%`,
                top: `${(position.y / 560) * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: `0 0 ${18 + heat * 44}px rgba(67, 126, 86, ${0.12 + heat * 0.18})`,
              }}
              onClick={() => onSelectDistrict(district.district)}
              aria-pressed={isSelected}
            >
              <span className="sr-only">{district.district}</span>
              {isSelected ? (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
              ) : null}
            </button>
          );
        })}

        {districts.map((district) => {
          const position = DISTRICT_POSITIONS[district.district];

          if (!position) {
            return null;
          }

          return (
            <div
              key={`${district.district}-label`}
              className={cn(
                "pointer-events-none absolute -translate-x-1/2 text-[11px] font-medium tracking-wide text-foreground/78 transition-all",
                selectedDistrict === district.district
                  ? "translate-y-5 text-foreground"
                  : "translate-y-4",
              )}
              style={{
                left: `${(position.x / 700) * 100}%`,
                top: `${(position.y / 560) * 100}%`,
              }}
            >
              {district.district}
            </div>
          );
        })}
        </>
        )}
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[rgba(44,100,67,0.92)]" />
          Strong source district
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[rgba(212,154,34,0.92)]" />
          Strong destination district
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[rgba(80,124,96,0.82)]" />
          Balanced market
        </div>
      </div>
    </section>
  );
}
