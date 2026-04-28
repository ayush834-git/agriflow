"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Filter, Search, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Fix leaflet default icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Smart Feature: Best Mandi Icon (Gold)
const BestMandiIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export type MandiData = {
  id: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  lat: number;
  lng: number;
};

// Helper component to recenter map
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

// -----------------------------------------------------------------------------------
// API & GEOCODING ARCHITECTURE
// -----------------------------------------------------------------------------------
const geocodeCache = new Map<string, {lat: number, lng: number}>();

async function geocodeMandi(market: string, district: string, state: string): Promise<{lat: number, lng: number} | null> {
  const query = `${market}, ${district}, ${state}, India`;
  if (geocodeCache.has(query)) return geocodeCache.get(query) || null;
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "AgriFlow-App" } });
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(query, coords);
      return coords;
    }
  } catch (e) {
    console.error("Geocoding failed for", query);
  }
  return null;
}

async function fetchAgmarknetData(apiKey: string, state?: string, commodity?: string): Promise<MandiData[]> {
  try {
    // Example endpoint from data.gov.in for Agmarknet
    // You would replace the resource ID with the actual one for the dataset you need
    const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"; 
    
    // Build query parameters
    const params = new URLSearchParams({
      "api-key": apiKey,
      format: "json",
      limit: "100"
    });
    
    if (state) params.append("filters[state]", state);
    if (commodity) params.append("filters[commodity]", commodity);
    
    // Uncomment when ready to use real API:
    // const response = await fetch(`https://api.data.gov.in/resource/${RESOURCE_ID}?${params.toString()}`);
    // if (!response.ok) throw new Error("Failed to fetch data");
    // const data = await response.json();
    // 
    // // Map and geocode records
    // const mappedData = [];
    // for (const record of data.records) {
    //   const coords = await geocodeMandi(record.market, record.district, record.state);
    //   if (coords) {
    //     mappedData.push({
    //       id: record.id, state: record.state, district: record.district,
    //       market: record.market, commodity: record.commodity, variety: record.variety,
    //       arrival_date: record.arrival_date, min_price: record.min_price,
    //       max_price: record.max_price, modal_price: record.modal_price,
    //       lat: coords.lat, lng: coords.lng
    //     });
    //   }
    //   // Note: Nominatim rate limits 1 req/sec. For production, use a batch geocoder or your backend.
    //   await new Promise(resolve => setTimeout(resolve, 1000)); 
    // }
    // return mappedData;
    
    // DEMO DATA for architecture readiness
    console.log("Fetching demo data with filters:", { state, commodity });
    return getDemoData(state, commodity);
  } catch (error) {
    console.error("Error fetching Agmarknet data:", error);
    return [];
  }
}

// Demo fallback data
function getDemoData(stateFilter?: string, commodityFilter?: string): MandiData[] {
  let demoData: MandiData[] = [
    { id: "1", state: "Maharashtra", district: "Pune", market: "Pune APMC", commodity: "Tomato", variety: "Deshi", arrival_date: "2024-04-28", min_price: 1500, max_price: 2200, modal_price: 1800, lat: 18.5204, lng: 73.8567 },
    { id: "2", state: "Maharashtra", district: "Nashik", market: "Nashik APMC", commodity: "Onion", variety: "Red", arrival_date: "2024-04-28", min_price: 1200, max_price: 1600, modal_price: 1400, lat: 20.0110, lng: 73.7903 },
    { id: "3", state: "Karnataka", district: "Bangalore", market: "Yeshwanthpur", commodity: "Tomato", variety: "Hybrid", arrival_date: "2024-04-28", min_price: 1800, max_price: 2500, modal_price: 2100, lat: 13.0285, lng: 77.5409 },
    { id: "4", state: "Andhra Pradesh", district: "Kurnool", market: "Kurnool APMC", commodity: "Onion", variety: "Local", arrival_date: "2024-04-28", min_price: 1000, max_price: 1400, modal_price: 1200, lat: 15.8281, lng: 78.0373 },
    { id: "5", state: "Telangana", district: "Hyderabad", market: "Bowenpally", commodity: "Tomato", variety: "Deshi", arrival_date: "2024-04-28", min_price: 1600, max_price: 2300, modal_price: 1900, lat: 17.4725, lng: 78.4727 },
  ];

  if (stateFilter) {
    demoData = demoData.filter(d => d.state.toLowerCase() === stateFilter.toLowerCase());
  }
  if (commodityFilter) {
    demoData = demoData.filter(d => d.commodity.toLowerCase() === commodityFilter.toLowerCase());
  }
  
  return demoData;
}

export default function MandiMapLeaflet() {
  const { dict } = useI18n();
  const [data, setData] = useState<MandiData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCommodity, setSelectedCommodity] = useState<string>("");
  
  // Map State
  const [center, setCenter] = useState<{lat: number, lng: number}>({ lat: 20.5937, lng: 78.9629 }); // India center
  const [zoom, setZoom] = useState(5);

  const availableStates = ["Maharashtra", "Karnataka", "Andhra Pradesh", "Telangana"];
  const availableCommodities = ["Tomato", "Onion"];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      // NEXT_PUBLIC_AGMARKNET_API_KEY could be used here
      const apiKey = process.env.NEXT_PUBLIC_AGMARKNET_API_KEY || "demo_key";
      
      const results = await fetchAgmarknetData(apiKey, selectedState, selectedCommodity);
      setData(results);
      
      if (results.length > 0) {
        // Adjust map center to the first result if filtering
        if (selectedState || selectedCommodity) {
          setCenter({ lat: results[0].lat, lng: results[0].lng });
          setZoom(7);
        }
      }
      setLoading(false);
    }
    
    loadData();
  }, [selectedState, selectedCommodity]);

  // Smart Feature: Best Mandi
  const bestMandi = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((best, current) => (current.modal_price > best.modal_price ? current : best), data[0]);
  }, [data]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col rounded-xl overflow-hidden border border-outline-variant/20 shadow-sm bg-white">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-surface-container-lowest border-b border-outline-variant/10 z-10 relative">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Search className="w-5 h-5" />
          <span>Mandi Prices Live</span>
        </div>
        
        <div className="h-6 w-px bg-outline-variant/20 mx-2 hidden md:block" />
        
        <div className="flex items-center gap-3 flex-1">
          <div className="flex flex-col gap-1 w-40">
            <select 
              value={selectedState} 
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-white border border-outline-variant/30 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All States</option>
              {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-1 w-40">
            <select 
              value={selectedCommodity} 
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="bg-white border border-outline-variant/30 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">All Commodities</option>
              {availableCommodities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => { setSelectedState(""); setSelectedCommodity(""); setCenter({ lat: 20.5937, lng: 78.9629 }); setZoom(5); }}
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[400] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        )}
        
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
        >
          <RecenterAutomatically lat={center.lat} lng={center.lng} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {data.map((mandi) => {
            const isBest = bestMandi?.id === mandi.id;
            
            return (
              <Marker 
                key={mandi.id} 
                position={[mandi.lat, mandi.lng]}
                icon={isBest ? BestMandiIcon : DefaultIcon}
                zIndexOffset={isBest ? 1000 : 0}
              >
                <Popup className="mandi-popup">
                  <div className="p-1 min-w-[200px]">
                    {isBest && (
                      <div className="mb-2 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm text-center shadow-sm">
                        ⭐ Best Price Recommendation
                      </div>
                    )}
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <h3 className="font-bold text-lg text-emerald-900">{mandi.market}</h3>
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                        {mandi.district}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Commodity</span>
                        <span className="font-semibold">{mandi.commodity} ({mandi.variety})</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Modal Price</span>
                        <span className={`font-bold text-lg ${isBest ? 'text-amber-600' : 'text-primary'}`}>
                          ₹{mandi.modal_price}/qtl
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">Min: ₹{mandi.min_price}</span>
                        <span className="text-gray-500">Max: ₹{mandi.max_price}</span>
                      </div>
                      
                      <div className="pt-2 border-t mt-2 text-[10px] text-gray-400 text-right">
                        Updated: {mandi.arrival_date}
                      </div>
                    </div>
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
