"use client";

import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { cn } from "@/lib/utils";
import type { DashboardDistrict, DashboardPricePoint, DashboardRoute } from "@/lib/dashboard";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";

type GoogleHeatmapOverlayProps = {
  districts: DashboardDistrict[];
  prices: DashboardPricePoint[];
  routes: DashboardRoute[];
  selectedDistrict: string;
  maxPrice: number;
  maxOpportunity: number;
  onSelectDistrict: (district: string) => void;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function GoogleHeatmapOverlay({
  districts,
  prices,
  routes,
  selectedDistrict,
  maxPrice,
  maxOpportunity,
  onSelectDistrict,
}: GoogleHeatmapOverlayProps) {
  return (
    <>
      <Map
        defaultCenter={{ lat: 15.9, lng: 78.5 }}
        defaultZoom={6.2}
        disableDefaultUI={true}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_STYLE_ID || "DEMO_MAP_ID"}
        className="absolute inset-0 size-full"
      />

      {districts.map((district) => {
        const position = DISTRICT_POSITIONS[district.district];

        if (!position || !position.lat) {
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
            : (incoming?.opportunityScore ?? 0) > (outgoing?.opportunityScore ?? 0) * 1.15
              ? "destination"
              : "balanced";

        const isSelected = selectedDistrict === district.district;
        const size = 24 + heat * 32;

        const ringClass =
          mode === "source"
            ? "bg-[rgba(44,100,67,0.92)] text-white"
            : mode === "destination"
              ? "bg-[rgba(212,154,34,0.92)] text-[rgb(43,49,31)]"
              : "bg-[rgba(80,124,96,0.82)] text-white";

        return (
          <AdvancedMarker
            key={district.district}
            position={{ lat: position.lat, lng: position.lng }}
            onClick={() => onSelectDistrict(district.district)}
            className="group"
          >
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full border border-white/80 shadow-[0_16px_40px_-24px_rgba(32,82,55,0.95)] transition-all duration-300",
                ringClass,
                isSelected ? "z-20 scale-110 ring-4 ring-primary/25" : "z-10 hover:scale-105"
              )}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: `0 0 ${18 + heat * 44}px rgba(67, 126, 86, ${0.12 + heat * 0.18})`,
              }}
            >
              {isSelected && (
                <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
              )}
            </div>

            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium tracking-wide shadow-sm backdrop-blur-sm transition-all",
                isSelected ? "text-foreground opacity-100" : "text-foreground/78 opacity-0 group-hover:opacity-100"
              )}
            >
              {district.district}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
