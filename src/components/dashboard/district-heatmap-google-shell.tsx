"use client";

import { GoogleHeatmapOverlay } from "@/components/dashboard/district-heatmap-google";
import { MapProvider } from "@/components/providers/map-provider";
import type {
  DashboardDistrict,
  DashboardPricePoint,
  DashboardRoute,
} from "@/lib/dashboard";

type DistrictHeatmapGoogleShellProps = {
  districts: DashboardDistrict[];
  prices: DashboardPricePoint[];
  routes: DashboardRoute[];
  selectedDistrict: string;
  maxPrice: number;
  maxOpportunity: number;
  onSelectDistrict: (district: string) => void;
};

export function DistrictHeatmapGoogleShell(props: DistrictHeatmapGoogleShellProps) {
  return (
    <MapProvider>
      <GoogleHeatmapOverlay {...props} />
    </MapProvider>
  );
}
