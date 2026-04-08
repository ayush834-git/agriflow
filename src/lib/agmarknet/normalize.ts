import { findTargetCrop } from "@/lib/agmarknet/catalog";
import type {
  AgmarknetRawRecord,
  NormalizedMandiPriceRecord,
  PersistableMandiPriceRecord,
  PersistablePriceGapRecord,
  PriceGapRecord,
} from "@/lib/agmarknet/types";

function getStringValue(record: AgmarknetRawRecord, keys: string[]) {
  for (const [recordKey, rawValue] of Object.entries(record)) {
    const normalizedKey = recordKey.trim().toLowerCase().replace(/\s+/g, "_");

    if (keys.includes(normalizedKey) && typeof rawValue === "string") {
      return rawValue.trim();
    }

    if (keys.includes(normalizedKey) && typeof rawValue === "number") {
      return String(rawValue);
    }
  }

  return "";
}

function parseNumber(rawValue: string) {
  const normalized = rawValue.replace(/,/g, "").trim();

  if (!normalized || normalized === "NA" || normalized === "NR" || normalized === "--") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(rawValue: string) {
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function createSourceRecordId(
  cropSlug: string,
  state: string,
  district: string,
  market: string,
  marketDate: string,
  variety: string,
  grade: string,
) {
  return [cropSlug, state, district, market, marketDate, variety || "standard", grade || "standard"]
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    .join(":");
}

export function normalizeAgmarknetRecord(
  record: AgmarknetRawRecord,
  fetchedAt: string,
  cropHint?: { slug: string; name: string },
) {
  const commodity =
    getStringValue(record, ["commodity", "crop", "commodity_name"]) || cropHint?.name || "";
  const resolvedCrop = cropHint ?? findTargetCrop(commodity);
  const state = getStringValue(record, ["state", "state_name"]);
  const district = getStringValue(record, ["district", "district_name"]);
  const mandiName = getStringValue(record, ["market", "mandi", "market_name"]);
  const marketDate = parseDate(
    getStringValue(record, ["arrival_date", "market_date", "price_date"]),
  );
  const modalPrice = parseNumber(
    getStringValue(record, ["modal_price", "modalprice", "price"]),
  );

  if (!resolvedCrop || !state || !district || !mandiName || !marketDate || modalPrice === null) {
    return null;
  }

  const variety = getStringValue(record, ["variety"]) || "";
  const grade = getStringValue(record, ["grade"]) || "";

  return {
    sourceRecordId:
      getStringValue(record, ["id", "record_id"]) ||
      createSourceRecordId(
        resolvedCrop.slug,
        state,
        district,
        mandiName,
        marketDate,
        variety,
        grade,
      ),
    cropSlug: resolvedCrop.slug,
    cropName: resolvedCrop.name,
    mandiName,
    district,
    state,
    marketDate,
    minPrice: parseNumber(getStringValue(record, ["min_price", "minprice"])),
    maxPrice: parseNumber(getStringValue(record, ["max_price", "maxprice"])),
    modalPrice,
    arrivalsTonnes: parseNumber(
      getStringValue(record, ["arrivals", "arrivals_tonnes", "quantity"]),
    ),
    variety,
    grade,
    rawPayload: record,
    fetchedAt,
  } satisfies NormalizedMandiPriceRecord;
}

export function toPersistableMandiPrice(
  record: NormalizedMandiPriceRecord,
): PersistableMandiPriceRecord {
  return {
    source_record_id: record.sourceRecordId,
    crop_slug: record.cropSlug,
    crop_name: record.cropName,
    mandi_name: record.mandiName,
    district: record.district,
    state: record.state,
    market_date: record.marketDate,
    min_price: record.minPrice,
    max_price: record.maxPrice,
    modal_price: record.modalPrice,
    arrivals_tonnes: record.arrivalsTonnes,
    variety: record.variety,
    grade: record.grade,
    raw_payload: record.rawPayload,
    fetched_at: record.fetchedAt,
  };
}

export function toPersistablePriceGap(record: PriceGapRecord): PersistablePriceGapRecord {
  return {
    crop_slug: record.cropSlug,
    crop_name: record.cropName,
    source_district: record.sourceDistrict,
    source_state: record.sourceState,
    source_modal_price: record.sourceModalPrice,
    target_district: record.targetDistrict,
    target_state: record.targetState,
    target_modal_price: record.targetModalPrice,
    price_gap: record.priceGap,
    demand_strength: record.demandStrength,
    transport_feasibility: record.transportFeasibility,
    opportunity_score: record.opportunityScore,
    distance_km: record.distanceKm,
    data_window_started_at: record.dataWindowStartedAt,
    data_window_ended_at: record.dataWindowEndedAt,
    explanation: record.explanation,
    fetched_at: record.fetchedAt,
  };
}
