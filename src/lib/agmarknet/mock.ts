import { TARGET_REGIONS, resolveRequestedCrops } from "@/lib/agmarknet/catalog";
import type { NormalizedMandiPriceRecord } from "@/lib/agmarknet/types";

type MockOptions = {
  cropSlugs?: string[];
  historyDays?: number;
  fetchedAt?: string;
};

function hashValue(input: string) {
  return Array.from(input).reduce((hash, char) => hash * 31 + char.charCodeAt(0), 7);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function stateFactor(state: string) {
  switch (state) {
    case "Andhra Pradesh":
      return 0.98;
    case "Telangana":
      return 1.06;
    case "Karnataka":
      return 1.03;
    default:
      return 1;
  }
}

export function generateMockAgmarknetFeed(options: MockOptions = {}) {
  const historyDays = Math.max(1, options.historyDays ?? 1);
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const crops = resolveRequestedCrops(options.cropSlugs);
  const today = new Date();
  const records: NormalizedMandiPriceRecord[] = [];

  for (let dayOffset = 0; dayOffset < historyDays; dayOffset += 1) {
    const marketDate = new Date(today);
    marketDate.setUTCDate(today.getUTCDate() - dayOffset);
    const marketDateIso = marketDate.toISOString().slice(0, 10);
    const dayTrend = 1 - dayOffset * 0.018;

    for (const crop of crops) {
      for (const region of TARGET_REGIONS) {
        for (const district of region.districts) {
          const seed = hashValue(`${crop.slug}:${region.state}:${district}:${marketDateIso}`);
          const localFactor = 0.88 + ((seed % 31) / 100);
          const modalPrice = round(crop.basePrice * stateFactor(region.state) * localFactor * dayTrend);
          const minPrice = round(modalPrice * 0.88);
          const maxPrice = round(modalPrice * 1.12);
          const arrivalsTonnes = round(14 + (seed % 70) + dayOffset * 2.4);

          records.push({
            sourceRecordId: `mock:${crop.slug}:${district}:${marketDateIso}`,
            cropSlug: crop.slug,
            cropName: crop.name,
            mandiName: `${district} Market Yard`,
            district,
            state: region.state,
            marketDate: marketDateIso,
            minPrice,
            maxPrice,
            modalPrice,
            arrivalsTonnes,
            variety: "Standard",
            grade: "FAQ",
            rawPayload: {
              source: "mock",
              crop: crop.name,
              district,
              state: region.state,
              market_date: marketDateIso,
            },
            fetchedAt,
          });
        }
      }
    }
  }

  return records;
}
