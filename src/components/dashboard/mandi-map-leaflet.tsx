"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, RefreshCw, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Icon } from "leaflet";
import type { MandiMarketWithPrice } from "@/lib/mandis/types";

// Fix leaflet default icon issue in Next.js
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

function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
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

export default function MandiMapLeaflet() {
  const [mandis, setMandis] = useState<MandiMarketWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [selectedCrop, setSelectedCrop] = useState<string>("tomato");

  // Center on Kurnool / South Central India
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 15.8281,
    lng: 78.0373,
  });
  const [zoom, setZoom] = useState(7);

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

      // If a specific state is chosen, center on the first market of that state
      if (selectedState && selectedState !== "All States" && data.mandis?.length > 0) {
        setCenter({ lat: data.mandis[0].lat, lng: data.mandis[0].lng });
        setZoom(7);
      }
    } catch (err) {
      console.error("Error loading mandis:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedCrop]);

  useEffect(() => {
    fetchMandis();
  }, [fetchMandis]);

  // Find the best price mandi for the selected crop
  const bestMandiId = useMemo(() => {
    const withPrices = mandis.filter((m) => m.price && m.price.modalPrice > 0);
    if (withPrices.length === 0) return null;
    return withPrices.reduce((best, cur) =>
      (cur.price?.modalPrice ?? 0) > (best.price?.modalPrice ?? 0) ? cur : best,
    ).id;
  }, [mandis]);

  return (
    <div className="relative w-full h-full min-h-[520px] flex flex-col rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm bg-surface-container-lowest">
      {/* Top Filter & Discovery Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-container-low border-b border-outline-variant/20 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Search className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Mandi Network Live Map</h3>
            <p className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1">
              <Navigation className="size-3 text-primary" />
              Centered on Kurnool, AP · {mandis.length} markets discovered
            </p>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary shadow-2xs"
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
            className="bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary shadow-2xs"
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
              setCenter({ lat: 15.8281, lng: 78.0373 });
              setZoom(7);
            }}
            title="Reset Map View"
            className="h-8 px-2 text-xs font-medium"
          >
            <RefreshCw className="size-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 relative z-0 min-h-[420px]">
        {loading && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-xs z-[400] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent" />
              <span className="text-xs font-medium text-on-surface-variant">
                Loading Mandi Network...
              </span>
            </div>
          </div>
        )}

        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
        >
          <RecenterAutomatically lat={center.lat} lng={center.lng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mandis
            .filter((mandi) => Number.isFinite(mandi.lat) && Number.isFinite(mandi.lng))
            .map((mandi) => {
              const isBest = bestMandiId === mandi.id;
              const isLocal = mandi.district.toLowerCase() === "kurnool";
              const iconToUse = isBest
                ? BestMandiIcon || DefaultIcon
                : isLocal
                  ? LocalMandiIcon || DefaultIcon
                  : DefaultIcon;

              return (
                <Marker
                  key={mandi.id}
                  position={[mandi.lat, mandi.lng]}
                  icon={iconToUse}
                  zIndexOffset={isBest ? 1000 : isLocal ? 500 : 0}
                >
                  <Popup className="mandi-popup">
                    <div className="p-1 min-w-[220px]">
                      {isBest && (
                        <div className="mb-2 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm text-center shadow-xs">
                          ⭐ Best Selling Opportunity
                        </div>
                      )}

                      {isLocal && !isBest && (
                        <div className="mb-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm text-center">
                          📍 Local Mandi ({mandi.district})
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 border-b pb-2 mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-on-surface leading-tight">
                            {mandi.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant">
                            {mandi.district}, {mandi.state}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 font-semibold">
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
