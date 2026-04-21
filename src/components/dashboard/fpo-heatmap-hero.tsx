"use client";

import { ArrowRightLeft, ChevronRight, Radio, Warehouse } from "lucide-react";

import { DataFreshnessBadge } from "@/components/dashboard/data-freshness-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DashboardCropView,
  DashboardDistrict,
} from "@/lib/dashboard";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

type FpoHeatmapHeroProps = {
  crop: DashboardCropView;
  districts: DashboardDistrict[];
  selectedDistrict: string;
  generatedAt: string;
  source: "live" | "mock";
  onSelectDistrict: (district: string) => void;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function FpoHeatmapHero({
  crop,
  districts,
  selectedDistrict,
  generatedAt,
  source,
  onSelectDistrict,
}: FpoHeatmapHeroProps) {
  const { dict } = useI18n();
  const topRoutes = crop.routes.slice(0, 5);
  const maxOpportunity = Math.max(...topRoutes.map((route) => route.opportunityScore), 1);

  return (
    <div className="relative h-64 bg-surface-container-low border-b border-t border-outline-variant/10 overflow-hidden group">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-primary-container),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.02))] opacity-30" />

      <svg viewBox="0 0 700 560" className="absolute inset-0 size-full" aria-hidden="true">
        {topRoutes.map((route) => {
          const source = DISTRICT_POSITIONS[route.sourceDistrict];
          const target = DISTRICT_POSITIONS[route.targetDistrict];

          if (!source || !target) {
            return null;
          }

          const isFocused =
            route.sourceDistrict === selectedDistrict ||
            route.targetDistrict === selectedDistrict;
          const controlX = (source.x + target.x) / 2;
          const controlY = Math.min(source.y, target.y) - 70;
          const intensity = clamp(route.opportunityScore / maxOpportunity);

          return (
            <path
              key={`${route.sourceDistrict}:${route.targetDistrict}`}
              d={`M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`}
              fill="none"
              stroke={isFocused ? "var(--color-tertiary)" : "var(--color-primary)"}
              strokeWidth={2 + intensity * 6}
              strokeLinecap="round"
              strokeDasharray={isFocused ? "12 10" : "8 10"}
              className="route-flow"
              opacity={isFocused ? 0.8 : 0.3}
            />
          );
        })}
      </svg>

      {districts.map((district) => {
        const position = DISTRICT_POSITIONS[district.district];

        if (!position) {
          return null;
        }

        const outgoing = topRoutes.find(
          (route) => route.sourceDistrict === district.district,
        );
        const incoming = topRoutes.find(
          (route) => route.targetDistrict === district.district,
        );
        const intensity = clamp(
          Math.max(
            outgoing?.opportunityScore ?? 0,
            incoming?.opportunityScore ?? 0,
          ) / maxOpportunity,
        );
        const isSelected = selectedDistrict === district.district;

        return (
          <button
            key={district.district}
            type="button"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-left transition-all duration-300",
              outgoing
                ? "border-primary/40 bg-primary/20 text-on-surface"
                : incoming
                  ? "border-tertiary/40 bg-tertiary/20 text-on-surface"
                  : "border-outline-variant/50 bg-surface-container text-on-surface-variant",
              isSelected ? "scale-105 ring-2 ring-primary/30" : "hover:scale-[1.03]",
            )}
            style={{
              left: `${(position.x / 700) * 100}%`,
              top: `${(position.y / 560) * 100}%`,
              boxShadow: `0 0 ${8 + intensity * 20}px var(--color-primary)`,
            }}
            onClick={() => onSelectDistrict(district.district)}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  outgoing
                    ? "bg-primary"
                    : incoming
                      ? "bg-tertiary"
                      : "bg-outline",
                )}
              />
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {district.district}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
