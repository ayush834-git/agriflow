export type MarketType =
  | "APMC_MARKET_YARD"
  | "APMC_SUB_YARD"
  | "ENAM_MARKET"
  | "WHOLESALE_MARKET"
  | "RYTHU_BAZAR"
  | "PRIVATE_MARKET"
  | "COLLECTION_CENTER";

export type CoordinateAccuracy = "EXACT_YARD" | "TOWN_APPROXIMATE";

export type MandiMarket = {
  id: string;
  name: string;
  normalizedName: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  coordinateAccuracy: CoordinateAccuracy;
  marketType: MarketType;
  isAPMC: boolean;
  isEnam: boolean;
  source: string;
  sourceUrl?: string;
  verifiedAt: string;
  majorCommodities?: string[];
  notes?: string;
};

export type MandiMarketPrice = {
  commodity: string;
  cropSlug: string;
  marketDate: string;
  minPrice: number | null; // ₹/quintal
  maxPrice: number | null; // ₹/quintal
  modalPrice: number; // ₹/quintal
  modalPricePerKg: number; // ₹/kg
  arrivalsTonnes: number | null;
  variety?: string;
  grade?: string;
  source: "LIVE" | "STALE" | "DEMO";
};

export type MandiMarketWithPrice = MandiMarket & {
  distanceKm: number;
  price: MandiMarketPrice | null;
  dataFreshness: "LIVE" | "STALE" | "DEMO" | "NO_DATA";
};
