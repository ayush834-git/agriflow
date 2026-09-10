export type MandiMarket = {
  id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  isAPMC: boolean;
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
