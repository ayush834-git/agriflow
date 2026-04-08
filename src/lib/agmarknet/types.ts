export type AgmarknetRawRecord = Record<string, unknown>;

export type AgmarknetApiResponse = {
  count?: number | string;
  limit?: number | string;
  offset?: number | string;
  records?: AgmarknetRawRecord[];
};

export type NormalizedMandiPriceRecord = {
  sourceRecordId: string;
  cropSlug: string;
  cropName: string;
  mandiName: string;
  district: string;
  state: string;
  marketDate: string;
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number;
  arrivalsTonnes: number | null;
  variety: string;
  grade: string;
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
};

export type PersistableMandiPriceRecord = {
  source_record_id: string;
  crop_slug: string;
  crop_name: string;
  mandi_name: string;
  district: string;
  state: string;
  market_date: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number;
  arrivals_tonnes: number | null;
  variety: string;
  grade: string;
  raw_payload: Record<string, unknown>;
  fetched_at: string;
};

export type PriceGapRecord = {
  cropSlug: string;
  cropName: string;
  sourceDistrict: string;
  sourceState: string;
  sourceModalPrice: number;
  targetDistrict: string;
  targetState: string;
  targetModalPrice: number;
  priceGap: number;
  demandStrength: number;
  transportFeasibility: number;
  opportunityScore: number;
  distanceKm: number | null;
  dataWindowStartedAt: string | null;
  dataWindowEndedAt: string | null;
  explanation: Record<string, unknown>;
  fetchedAt: string;
};

export type PersistablePriceGapRecord = {
  crop_slug: string;
  crop_name: string;
  source_district: string;
  source_state: string;
  source_modal_price: number;
  target_district: string;
  target_state: string;
  target_modal_price: number;
  price_gap: number;
  demand_strength: number;
  transport_feasibility: number;
  opportunity_score: number;
  distance_km: number | null;
  data_window_started_at: string | null;
  data_window_ended_at: string | null;
  explanation: Record<string, unknown>;
  fetched_at: string;
};

export type PriceFeedResult = {
  source: "live" | "mock";
  records: NormalizedMandiPriceRecord[];
  warnings: string[];
};
