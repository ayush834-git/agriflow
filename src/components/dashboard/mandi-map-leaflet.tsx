"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, RefreshCw, Navigation, Layers, ShieldCheck, MapPin, ExternalLink, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Icon } from "leaflet";
import type { MandiMarketWithPrice } from "@/lib/mandis/types";
import { haversineKm } from "@/lib/geo/distance";

// Fix leaflet default icons in Next.js
let DefaultIcon: Icon | undefined;
let BestMandiIcon: Icon | undefined;
let LocalMandiIcon: Icon | undefined;

if (typeof window !== "undefined") {
  DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;

  // Best Price Mandi Icon (Gold)
  BestMandiIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Local Mandi Icon (Green)
  LocalMandiIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function createClusterDivIcon(count: number, hasBestPrice: boolean) {
  return L.divIcon({
    className: "mandi-cluster-icon",
    html: `
      <div style="
        background: ${hasBestPrice ? "linear-gradient(135deg, #f59e0b, #b45309)" : "linear-gradient(135deg, #15803d, #166534)"};
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        border: 2px solid white;
        cursor: pointer;
      ">
        ${count}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

type ViewScope = "regional" | "nearby" | "all";

/**
 * Intelligent View Controller:
 * Frames the appropriate set of markets based on the active discovery scope.
 */
function MapBoundsController({
  mandis,
  scope,
  recenterTrigger,
}: {
  mandis: MandiMarketWithPrice[];
  scope: ViewScope;
  recenterTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!mandis || mandis.length === 0) return;

    if (scope === "nearby") {
      // Immediate neighborhood (< 75 km from Kurnool)
      const subset = mandis.filter((m) => m.distanceKm <= 75);
      if (subset.length > 0) {
        const bounds = L.latLngBounds(subset.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
        return;
      }
    }

    if (scope === "regional") {
      // Rayalaseema & neighboring regional belt (< 160 km from Kurnool)
      const subset = mandis.filter((m) => m.distanceKm <= 160);
      if (subset.length > 0) {
        const bounds = L.latLngBounds(subset.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 9 });
        return;
      }
    }

    // "all": fit bounds across all available markets
    const valid = mandis.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
    }
  }, [mandis, scope, recenterTrigger, map]);

  return null;
}

/** Helper component to allow clicking a cluster to zoom in */
function ZoomToPointButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full h-7 text-xs font-semibold mt-2 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
      onClick={() => {
        map.closePopup();
        map.setView([lat, lng], 14, { animate: true });
      }}
    >
      <ZoomIn className="size-3.5" />
      Zoom in to separate facilities on map
    </Button>
  );
}

const AVAILABLE_STATES = [
  "All States",
  "Andhra Pradesh",
  "Telangana",
  "Karnataka",
  "Maharashtra",
];

const AVAILABLE_COMMODITIES = [
  { slug: "tomato", name: "Tomato" },
  { slug: "onion", name: "Onion" },
  { slug: "potato", name: "Potato" },
  { slug: "green-chilli", name: "Green Chilli" },
  { slug: "maize", name: "Maize" },
  { slug: "paddy", name: "Paddy" },
  { slug: "groundnut", name: "Groundnut" },
  { slug: "cotton", name: "Cotton" },
  { slug: "red-chilli", name: "Red Chilli" },
];

function formatMarketType(type?: string) {
  switch (type) {
    case "ENAM_MARKET":
      return { label: "e-NAM APMC", variant: "default" as const, color: "bg-emerald-600 text-white" };
    case "APMC_MARKET_YARD":
      return { label: "APMC Yard", variant: "secondary" as const, color: "bg-blue-600/10 text-blue-800 dark:text-blue-300" };
    case "APMC_SUB_YARD":
      return { label: "Sub-Market Yard", variant: "outline" as const, color: "bg-amber-500/10 text-amber-800 dark:text-amber-300" };
    case "RYTHU_BAZAR":
      return { label: "Rythu Bazar", variant: "secondary" as const, color: "bg-purple-600/10 text-purple-800 dark:text-purple-300" };
    case "WHOLESALE_MARKET":
      return { label: "Wholesale Hub", variant: "default" as const, color: "bg-indigo-600 text-white" };
    default:
      return { label: "Mandi", variant: "outline" as const, color: "bg-muted text-foreground" };
  }
}

type MarketCluster = {
  id: string;
  lat: number;
  lng: number;
  markets: MandiMarketWithPrice[];
};

export default function MandiMapLeaflet() {
  const [mandis, setMandis] = useState<MandiMarketWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [selectedCrop, setSelectedCrop] = useState<string>("tomato");
  const [viewScope, setViewScope] = useState<ViewScope>("regional");
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const fetchMandis = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== "All States") {
        params.append("state", selectedState);
      }
      if (selectedCrop) {
        params.append("crop", selectedCrop);
      }
      params.append("nearDistrict", "Kurnool");

      const res = await fetch(`/api/mandis?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load mandis");
      const data = await res.json();
      setMandis(data.mandis || []);
    } catch (err) {
      console.error("Error loading mandis:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedCrop]);

  useEffect(() => {
    fetchMandis();
  }, [fetchMandis]);

  // Identify best price mandi
  const bestMandiId = useMemo(() => {
    const withPrices = mandis.filter((m) => m.price && m.price.modalPrice > 0);
    if (withPrices.length === 0) return null;
    return withPrices.reduce((best, cur) =>
      (cur.price?.modalPrice ?? 0) > (best.price?.modalPrice ?? 0) ? cur : best,
    ).id;
  }, [mandis]);

  // Spatial clustering: Group markets closer than 1.8 km to prevent visual overlap
  // while keeping all individual markets accessible in the cluster popup or on zoom.
  const clusters = useMemo<MarketCluster[]>(() => {
    const validMandis = mandis.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    const result: MarketCluster[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < validMandis.length; i++) {
      const m = validMandis[i];
      if (visited.has(m.id)) continue;

      const group: MandiMarketWithPrice[] = [m];
      visited.add(m.id);

      for (let j = i + 1; j < validMandis.length; j++) {
        const other = validMandis[j];
        if (visited.has(other.id)) continue;

        const dist = haversineKm(m.lat, m.lng, other.lat, other.lng);
        if (dist <= 1.8) {
          group.push(other);
          visited.add(other.id);
        }
      }

      // Calculate centroid of cluster
      const avgLat = group.reduce((sum, item) => sum + item.lat, 0) / group.length;
      const avgLng = group.reduce((sum, item) => sum + item.lng, 0) / group.length;

      result.push({
        id: group.length > 1 ? `cluster-${m.id}` : m.id,
        lat: avgLat,
        lng: avgLng,
        markets: group,
      });
    }

    return result;
  }, [mandis]);

  // Stats for the active view
  const nearbyCount = useMemo(() => mandis.filter((m) => m.distanceKm <= 50).length, [mandis]);
  const regionalCount = useMemo(() => mandis.filter((m) => m.distanceKm <= 160).length, [mandis]);

  return (
    <div className="relative w-full h-full min-h-[580px] flex flex-col rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm bg-surface-container-lowest">
      {/* Top Filter & Discovery Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low border-b border-outline-variant/20 z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
            <Search className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-on-surface">Mandi Network Live Map</h3>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-surface/50 border-outline-variant/40">
                Verified Directory
              </Badge>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
              <Navigation className="size-3 text-primary shrink-0" />
              <span>
                Origin: Kurnool · <strong className="text-on-surface">{mandis.length}</strong> verified markets ({regionalCount} within 160 km)
              </span>
            </p>
          </div>
        </div>

        {/* Dynamic Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Scope Selector */}
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-0.5 shadow-2xs text-xs">
            <button
              onClick={() => setViewScope("nearby")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewScope === "nearby"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Focus on immediate markets within 75 km"
            >
              Nearby (&lt;75 km) [{nearbyCount}]
            </button>
            <button
              onClick={() => setViewScope("regional")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewScope === "regional"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Focus on Rayalaseema regional belt within 160 km"
            >
              Regional (&lt;160 km) [{regionalCount}]
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                viewScope === "all"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Show all verified markets in directory"
            >
              All Directory [{mandis.length}]
            </button>
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setViewScope("all");
            }}
            className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            {AVAILABLE_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {/* Commodity Filter */}
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            {AVAILABLE_COMMODITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Reset View Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedState("All States");
              setSelectedCrop("tomato");
              setViewScope("regional");
              setRecenterTrigger((prev) => prev + 1);
            }}
            title="Reset to Regional View"
            className="h-8 px-2.5 text-xs font-medium"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 relative z-0 min-h-[460px]">
        {loading && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs z-[400] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
              <span className="text-xs font-medium text-on-surface-variant">
                Loading Verified Mandi Directory...
              </span>
            </div>
          </div>
        )}

        <MapContainer
          center={[15.8281, 78.0373]}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
        >
          <MapBoundsController
            mandis={mandis}
            scope={viewScope}
            recenterTrigger={recenterTrigger}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {clusters.map((cluster) => {
            const isCluster = cluster.markets.length > 1;
            const hasBestInCluster = cluster.markets.some((m) => m.id === bestMandiId);

            if (isCluster) {
              const clusterIcon = createClusterDivIcon(cluster.markets.length, hasBestInCluster);

              return (
                <Marker
                  key={cluster.id}
                  position={[cluster.lat, cluster.lng]}
                  icon={clusterIcon}
                  zIndexOffset={hasBestInCluster ? 1000 : 500}
                >
                  <Popup className="mandi-popup" minWidth={280} maxWidth={340}>
                    <div className="p-1 space-y-2.5 max-h-[380px] overflow-y-auto">
                      <div className="border-b pb-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Layers className="size-3" />
                            {cluster.markets.length} Verified Facilities
                          </span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                            ~{cluster.markets[0].distanceKm} km from Kurnool
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold text-on-surface mt-0.5">
                          {cluster.markets[0].district}, {cluster.markets[0].state} Hub
                        </h4>
                      </div>

                      {/* Stacked list of markets inside cluster */}
                      <div className="space-y-2">
                        {cluster.markets.map((mandi) => {
                          const typeBadge = formatMarketType(mandi.marketType);
                          const isBest = mandi.id === bestMandiId;

                          return (
                            <div
                              key={mandi.id}
                              className={`p-2 rounded-lg border text-xs ${
                                isBest
                                  ? "bg-amber-500/10 border-amber-500/30"
                                  : "bg-surface-container-low border-outline-variant/30"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <div>
                                  <h5 className="font-bold text-on-surface text-[12px] leading-snug">
                                    {mandi.name}
                                  </h5>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm inline-block mt-0.5 ${typeBadge.color}`}>
                                    {typeBadge.label}
                                  </span>
                                </div>
                                {isBest && (
                                  <span className="text-[9px] font-black bg-amber-400 text-amber-950 px-1 py-0.5 rounded shadow-2xs shrink-0">
                                    ⭐ Best Price
                                  </span>
                                )}
                              </div>

                              {mandi.price ? (
                                <div className="mt-1.5 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between">
                                  <span className="text-on-surface-variant text-[11px]">
                                    {mandi.price.commodity} modal:
                                  </span>
                                  <span className="font-black text-primary text-[13px]">
                                    ₹{mandi.price.modalPricePerKg.toFixed(2)}/kg
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-on-surface-variant/80 italic mt-1">
                                  No recent price for {selectedCrop}
                                </p>
                              )}

                              {mandi.majorCommodities && mandi.majorCommodities.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-on-surface-variant">
                                  {mandi.majorCommodities.slice(0, 3).map((c) => (
                                    <span key={c} className="bg-surface px-1 py-0.2 rounded border border-outline-variant/20">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <ZoomToPointButton lat={cluster.lat} lng={cluster.lng} />
                    </div>
                  </Popup>
                </Marker>
              );
            }

            // Single Market Pin
            const mandi = cluster.markets[0];
            const isBest = mandi.id === bestMandiId;
            const isLocal = mandi.district.toLowerCase() === "kurnool";
            const iconToUse = isBest
              ? BestMandiIcon || DefaultIcon
              : isLocal
                ? LocalMandiIcon || DefaultIcon
                : DefaultIcon;
            const typeBadge = formatMarketType(mandi.marketType);

            return (
              <Marker
                key={mandi.id}
                position={[mandi.lat, mandi.lng]}
                icon={iconToUse}
                zIndexOffset={isBest ? 1000 : isLocal ? 500 : 0}
              >
                <Popup className="mandi-popup" minWidth={240} maxWidth={300}>
                  <div className="p-1 min-w-[220px]">
                    {isBest && (
                      <div className="mb-2 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm text-center shadow-xs">
                        ⭐ Best Selling Opportunity
                      </div>
                    )}

                    {isLocal && !isBest && (
                      <div className="mb-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm text-center">
                        📍 Local District ({mandi.district})
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 border-b pb-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                          {mandi.coordinateAccuracy === "EXACT_YARD" && (
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                              <ShieldCheck className="size-2.5" /> Exact Yard
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-on-surface leading-tight">
                          {mandi.name}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3 text-on-surface-variant/70 shrink-0" />
                          {mandi.district}, {mandi.state}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-bold">
                        {mandi.distanceKm === 0 ? "Local" : `${mandi.distanceKm} km`}
                      </Badge>
                    </div>

                    {mandi.price ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant font-medium">Commodity:</span>
                          <span className="font-bold text-on-surface">{mandi.price.commodity}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-on-surface-variant font-medium">Modal Price:</span>
                          <div className="text-right">
                            <span
                              className={`font-black text-sm ${
                                isBest ? "text-amber-600" : "text-primary"
                              }`}
                            >
                              ₹{mandi.price.modalPricePerKg.toFixed(2)}/kg
                            </span>
                            <span className="text-[10px] text-on-surface-variant block">
                              (₹{mandi.price.modalPrice}/qtl)
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant border-t pt-1">
                          <span>Range: ₹{mandi.price.minPrice ?? 0} - ₹{mandi.price.maxPrice ?? 0}</span>
                          {mandi.price.arrivalsTonnes != null && mandi.price.arrivalsTonnes > 0 && (
                            <span>Arrivals: {mandi.price.arrivalsTonnes} T</span>
                          )}
                        </div>

                        <div className="pt-1.5 border-t text-[10px] flex items-center justify-between text-on-surface-variant/80">
                          <span className="capitalize">Status: {mandi.dataFreshness}</span>
                          <span>{mandi.price.marketDate}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-xs text-on-surface-variant">
                        <p className="font-medium">No recent price for {selectedCrop}</p>
                        <p className="text-[10px] mt-0.5 text-outline">
                          Market active for other commodities
                        </p>
                      </div>
                    )}

                    {mandi.majorCommodities && mandi.majorCommodities.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-outline-variant/20">
                        <span className="text-[9px] font-semibold text-on-surface-variant block mb-1">
                          Key Traded Commodities:
                        </span>
                        <div className="flex flex-wrap gap-1 text-[9px]">
                          {mandi.majorCommodities.map((c) => (
                            <span key={c} className="bg-surface px-1.5 py-0.5 rounded border border-outline-variant/20 font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {mandi.source && (
                      <div className="mt-2 pt-1 border-t border-outline-variant/20 text-[9px] text-on-surface-variant/70 flex items-center justify-between">
                        <span className="truncate pr-1">Src: {mandi.source}</span>
                        {mandi.sourceUrl && (
                          <a
                            href={mandi.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            Verify <ExternalLink className="size-2" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
