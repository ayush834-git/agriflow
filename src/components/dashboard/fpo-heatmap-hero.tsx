"use client";

import { useState, useRef } from "react";
import { ArrowRightLeft, ChevronRight, Radio, Warehouse, ZoomIn, ZoomOut, Search } from "lucide-react";

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
  availableCrops?: DashboardCropView[];
  districts: DashboardDistrict[];
  selectedDistrict: string;
  generatedAt: string;
  source: "live" | "mock";
  onSelectDistrict: (district: string) => void;
  onSelectCrop?: (cropSlug: string) => void;
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
  availableCrops = [],
  districts,
  selectedDistrict,
  generatedAt,
  source,
  onSelectDistrict,
  onSelectCrop,
}: FpoHeatmapHeroProps) {
  const { dict } = useI18n();
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.75));

  const topRoutes = crop.routes.slice(0, 5);
  const maxOpportunity = Math.max(...topRoutes.map((route) => route.opportunityScore), 1);

  return (
    <div className="relative h-[400px] bg-surface-container-low border-b border-t border-outline-variant/10 overflow-hidden group">
      
      {/* Top Bar: Crop Selection */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        {onSelectCrop && availableCrops.length > 0 && (
          <select
            className="bg-white/90 backdrop-blur border border-gray-200 text-sm font-bold text-gray-800 rounded-lg px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={crop.slug}
            onChange={(e) => onSelectCrop(e.target.value)}
          >
            {availableCrops.map(c => (
              <option key={c.slug} value={c.slug}>{dict.crops?.[c.slug as keyof typeof dict.crops] ?? c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm p-1">
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="h-px bg-gray-200 mx-2" />
        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Pan & Zoom Container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-auto cursor-grab active:cursor-grabbing hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div 
          className="relative origin-center transition-transform duration-300 ease-out min-w-[700px] min-h-[560px]"
          style={{ transform: `scale(${zoom})`, width: '100%', height: '100%' }}
        >
          <div className="absolute inset-0 bg-[#eef2ec]">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(#214f38 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          </div>

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
            <g key={`${route.sourceDistrict}:${route.targetDistrict}`}>
              {/* Target (Scarcity) Halo */}
              <circle
                cx={target.x}
                cy={target.y}
                r={40 + intensity * 40}
                fill="rgba(220, 38, 38, 0.15)"
                className="animate-pulse"
              />
              {/* Source (Surplus) Halo */}
              <circle
                cx={source.x}
                cy={source.y}
                r={40 + intensity * 40}
                fill="rgba(5, 150, 105, 0.15)"
              />
              <path
                d={`M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`}
                fill="none"
                stroke={isFocused ? "rgba(33, 79, 56, 0.8)" : "rgba(33, 79, 56, 0.4)"}
                strokeWidth={2 + intensity * 4}
                strokeLinecap="round"
                strokeDasharray="6 6"
                className="route-flow"
              />
              <polygon
                points="-5,-5 5,0 -5,5"
                fill="rgba(33, 79, 56, 0.8)"
                transform={`translate(${target.x}, ${target.y}) rotate(${Math.atan2(target.y - controlY, target.x - controlX) * (180 / Math.PI)})`}
              />
            </g>
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
        const isSelected = selectedDistrict === district.district;

        return (
          <button
            key={district.district}
            type="button"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-left transition-all duration-300 shadow-sm",
              "bg-white border-gray-200 text-gray-800",
              isSelected ? "scale-105 ring-2 ring-[rgba(33,79,56,0.3)] shadow-md" : "hover:scale-[1.03]"
            )}
            style={{
              left: `${(position.x / 700) * 100}%`,
              top: `${(position.y / 560) * 100}%`,
            }}
            onClick={() => onSelectDistrict(district.district)}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  outgoing
                    ? "bg-emerald-600"
                    : incoming
                      ? "bg-red-500"
                      : "bg-gray-400",
                )}
              />
              <span className="text-[11px] font-bold tracking-wide">
                {district.district}
              </span>
            </div>
          </button>
        );
      })}
        </div>
      </div>
    </div>
  );
}
