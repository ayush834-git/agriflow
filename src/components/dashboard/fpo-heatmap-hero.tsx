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
  const topRoutes = crop.routes.slice(0, 5);
  const maxOpportunity = Math.max(...topRoutes.map((route) => route.opportunityScore), 1);

  return (
    <section className="overflow-hidden rounded-[2.1rem] border border-border/70 bg-[linear-gradient(135deg,rgba(24,63,42,0.98),rgba(39,90,58,0.97)_48%,rgba(145,42,32,0.96)_120%)] text-white shadow-[0_48px_140px_-76px_rgba(20,49,33,0.95)]">
      <div className="grid gap-6 px-5 py-5 xl:grid-cols-[1.15fr_0.85fr] xl:px-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/12 bg-white/10 text-white hover:bg-white/10">
              Heatmap hero
            </Badge>
            <Badge className="border-white/12 bg-white/8 text-white/80 hover:bg-white/8">
              Realtime-ready route grid
            </Badge>
            <DataFreshnessBadge
              generatedAt={generatedAt}
              source={source}
              className="border-white/12 bg-white/8 text-white"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/62">
              FPO movement monitor
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {crop.name} supply flow opportunity
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
              Surplus districts glow green, demand centers burn warmer, and the
              strongest cross-district routes stay in view so an operator can act
              in seconds.
            </p>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(237,247,236,0.95),rgba(246,247,243,0.9))]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(68,142,92,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(187,63,45,0.2),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]" />

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
                    stroke={isFocused ? "rgba(224,185,67,0.98)" : "rgba(58,126,82,0.45)"}
                    strokeWidth={2 + intensity * 7}
                    strokeLinecap="round"
                    strokeDasharray={isFocused ? "12 10" : "8 10"}
                    className="route-flow"
                    opacity={isFocused ? 1 : 0.7}
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
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-[999px] border px-3 py-2 text-left shadow-[0_18px_42px_-24px_rgba(35,76,52,0.65)] transition-all duration-300",
                    outgoing
                      ? "border-[rgba(47,126,75,0.46)] bg-[rgba(62,145,88,0.18)] text-[rgb(28,77,51)]"
                      : incoming
                        ? "border-[rgba(173,71,44,0.48)] bg-[rgba(199,88,55,0.16)] text-[rgb(110,44,28)]"
                        : "border-white/50 bg-white/62 text-[rgb(57,69,52)]",
                    isSelected ? "scale-105 ring-4 ring-white/30" : "hover:scale-[1.03]",
                  )}
                  style={{
                    left: `${(position.x / 700) * 100}%`,
                    top: `${(position.y / 560) * 100}%`,
                    boxShadow: `0 0 ${10 + intensity * 30}px rgba(70, 141, 96, ${0.08 + intensity * 0.16})`,
                  }}
                  onClick={() => onSelectDistrict(district.district)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        outgoing
                          ? "bg-[rgb(54,129,79)]"
                          : incoming
                            ? "bg-[rgb(191,81,48)]"
                            : "bg-[rgb(138,149,130)]",
                      )}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                      {district.district}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-80">{district.state}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[1.8rem] border border-white/12 bg-white/9 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">
                  Selected district
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{selectedDistrict}</h3>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Warehouse className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Focus the route board around one district to inspect the strongest
              dispatch opportunities first.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-white/12 bg-white/9 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">
                  Top opportunity routes
                </p>
                <h3 className="mt-2 text-xl font-semibold">{crop.name} route board</h3>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Radio className="size-5" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {topRoutes.map((route) => {
                const isActive =
                  route.sourceDistrict === selectedDistrict ||
                  route.targetDistrict === selectedDistrict;

                return (
                  <button
                    key={`${route.sourceDistrict}:${route.targetDistrict}`}
                    type="button"
                    className={cn(
                      "w-full rounded-[1.3rem] border px-4 py-4 text-left transition-all",
                      isActive
                        ? "border-white/28 bg-white/16"
                        : "border-white/10 bg-black/10 hover:bg-white/10",
                    )}
                    onClick={() => onSelectDistrict(route.sourceDistrict)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">
                          {route.sourceDistrict} to {route.targetDistrict}
                        </p>
                        <p className="mt-1 text-sm text-white/68">
                          {route.sourceState}
                          {" -> "}
                          {route.targetState}
                        </p>
                      </div>
                      <Badge className="border-white/12 bg-white/12 text-white hover:bg-white/12">
                        {route.opportunityScore.toFixed(0)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-white/76 sm:grid-cols-2">
                      <p>Source {formatCurrency(route.sourceModalPrice)}</p>
                      <p>Target {formatCurrency(route.targetModalPrice)}</p>
                      <p>Gap {formatCurrency(route.priceGap)}</p>
                      <p>Feasibility {route.transportFeasibility.toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/16 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  onSelectDistrict(topRoutes[0]?.sourceDistrict ?? selectedDistrict)
                }
              >
                Jump to strongest source district
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/12 bg-white/9 p-4 text-sm text-white/74">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <ArrowRightLeft className="size-5" />
              </div>
              <div>
                <p className="font-medium text-white">Movement engine next</p>
                <p>Phase 6 can plug profit estimates and route reasoning directly into this board.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
