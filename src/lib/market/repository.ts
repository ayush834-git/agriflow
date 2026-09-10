import { hasSupabaseWriteConfig } from "@/lib/env";
import {
  listDemoMarketRecords,
  listDemoPriceGaps,
  replaceDemoPriceGaps,
} from "@/lib/demo/market";
import { toPersistablePriceGap } from "@/lib/agmarknet/normalize";
import type {
  NormalizedMandiPriceRecord,
  PersistableMandiPriceRecord,
  PersistablePriceGapRecord,
  PriceGapRecord,
} from "@/lib/agmarknet/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// In-memory short-TTL cache to avoid repeated Supabase queries within and across requests
type CacheEntry<T> = { data: T; expiresAt: number };
const pricesCache = new Map<string, CacheEntry<NormalizedMandiPriceRecord[]>>();
const gapsCache = new Map<string, CacheEntry<PriceGapRecord[]>>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export async function loadStoredPricesForCrop(cropSlug: string): Promise<NormalizedMandiPriceRecord[]> {
  const now = Date.now();
  const cached = pricesCache.get(cropSlug);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (!hasSupabaseWriteConfig()) {
    const records = listDemoMarketRecords({
      cropSlugs: [cropSlug],
      historyDays: 7,
    });
    pricesCache.set(cropSlug, { data: records, expiresAt: now + CACHE_TTL_MS });
    return records;
  }

  const admin = getSupabaseAdminClient();

  // Fast single query: select only scalar columns (omit heavy raw_payload JSON)
  const queryResult = await admin
    .from("mandi_prices")
    .select("source_record_id, crop_slug, crop_name, mandi_name, district, state, market_date, min_price, max_price, modal_price, arrivals_tonnes, variety, grade, fetched_at")
    .eq("crop_slug", cropSlug)
    .order("market_date", { ascending: false })
    .limit(60);

  if (queryResult.error) {
    throw new Error(`Failed to load mandi prices: ${queryResult.error.message}`);
  }

  const rows = (queryResult.data ?? []) as unknown as PersistableMandiPriceRecord[];

  const result: NormalizedMandiPriceRecord[] = rows.map((row) => ({
    sourceRecordId: row.source_record_id,
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    mandiName: row.mandi_name,
    district: row.district,
    state: row.state,
    marketDate: row.market_date,
    minPrice: row.min_price,
    maxPrice: row.max_price,
    modalPrice: row.modal_price,
    arrivalsTonnes: row.arrivals_tonnes,
    variety: row.variety,
    grade: row.grade,
    rawPayload: {},
    fetchedAt: row.fetched_at,
  }));

  pricesCache.set(cropSlug, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

export async function loadStoredGapsForCrop(cropSlug: string, limit = 10): Promise<PriceGapRecord[]> {
  const cacheKey = `${cropSlug}:${limit}`;
  const now = Date.now();
  const cached = gapsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  if (!hasSupabaseWriteConfig()) {
    const gaps = listDemoPriceGaps(cropSlug, limit);
    gapsCache.set(cacheKey, { data: gaps, expiresAt: now + CACHE_TTL_MS });
    return gaps;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("price_gaps")
    .select("crop_slug, crop_name, source_district, source_state, source_modal_price, target_district, target_state, target_modal_price, price_gap, demand_strength, transport_feasibility, opportunity_score, distance_km, data_window_started_at, data_window_ended_at, explanation, fetched_at")
    .eq("crop_slug", cropSlug)
    .order("opportunity_score", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load price gaps: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PersistablePriceGapRecord[];

  const result: PriceGapRecord[] = rows.map((row) => ({
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    sourceDistrict: row.source_district,
    sourceState: row.source_state,
    sourceModalPrice: row.source_modal_price,
    targetDistrict: row.target_district,
    targetState: row.target_state,
    targetModalPrice: row.target_modal_price,
    priceGap: row.price_gap,
    demandStrength: row.demand_strength,
    transportFeasibility: row.transport_feasibility,
    opportunityScore: row.opportunity_score,
    distanceKm: row.distance_km,
    dataWindowStartedAt: row.data_window_started_at,
    dataWindowEndedAt: row.data_window_ended_at,
    explanation: row.explanation,
    fetchedAt: row.fetched_at,
  }));

  gapsCache.set(cacheKey, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

export async function replaceStoredPriceGaps(priceGaps: PriceGapRecord[]) {
  if (!hasSupabaseWriteConfig()) {
    replaceDemoPriceGaps(priceGaps);

    return {
      persisted: false,
      insertedCount: priceGaps.length,
    };
  }

  const admin = getSupabaseAdminClient();
  const cropSlugs = [...new Set(priceGaps.map((gap) => gap.cropSlug))];

  if (cropSlugs.length > 0) {
    const { error: deleteError } = await admin
      .from("price_gaps")
      .delete()
      .in("crop_slug", cropSlugs);

    if (deleteError) {
      throw new Error(`Failed to clear price gaps: ${deleteError.message}`);
    }
  }

  const payload = priceGaps.map<PersistablePriceGapRecord>(toPersistablePriceGap);

  if (payload.length === 0) {
    return {
      persisted: true,
      insertedCount: 0,
    };
  }

  for (let index = 0; index < payload.length; index += 250) {
    const chunk = payload.slice(index, index + 250);
    const { error } = await admin.from("price_gaps").insert(chunk as never);

    if (error) {
      throw new Error(`Failed to store price gaps: ${error.message}`);
    }
  }

  return {
    persisted: true,
    insertedCount: payload.length,
  };
}
