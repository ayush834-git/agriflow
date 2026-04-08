import { hasSupabaseWriteConfig } from "@/lib/env";
import {
  listDemoMarketRecords,
  listDemoPriceGaps,
  replaceDemoPriceGaps,
} from "@/lib/demo/market";
import { toPersistablePriceGap } from "@/lib/agmarknet/normalize";
import type {
  PersistableMandiPriceRecord,
  PersistablePriceGapRecord,
  PriceGapRecord,
} from "@/lib/agmarknet/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function loadStoredPricesForCrop(cropSlug: string) {
  if (!hasSupabaseWriteConfig()) {
    return listDemoMarketRecords({
      cropSlugs: [cropSlug],
      historyDays: 7,
    });
  }

  const admin = getSupabaseAdminClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const { data, error } = await admin
    .from("mandi_prices")
    .select("*")
    .eq("crop_slug", cropSlug)
    .gte("market_date", since.toISOString().slice(0, 10))
    .order("market_date", { ascending: false })
    .order("fetched_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load mandi prices: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PersistableMandiPriceRecord[];

  return rows.map((row) => ({
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
    rawPayload: row.raw_payload,
    fetchedAt: row.fetched_at,
  }));
}

export async function loadStoredGapsForCrop(cropSlug: string, limit = 10) {
  if (!hasSupabaseWriteConfig()) {
    return listDemoPriceGaps(cropSlug, limit);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("price_gaps")
    .select("*")
    .eq("crop_slug", cropSlug)
    .order("opportunity_score", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load price gaps: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PersistablePriceGapRecord[];

  return rows.map((row) => ({
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
  })) satisfies PriceGapRecord[];
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
