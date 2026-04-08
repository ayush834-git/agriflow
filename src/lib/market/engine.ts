import type {
  NormalizedMandiPriceRecord,
  PriceGapRecord,
} from "@/lib/agmarknet/types";

type ComputeGapOptions = {
  maxSourceDistricts?: number;
  maxTargetDistricts?: number;
  maxPairsPerCrop?: number;
};

const CROSS_STATE_FACTORS: Record<string, number> = {
  "Andhra Pradesh:Telangana": 1.04,
  "Telangana:Andhra Pradesh": 1.04,
  "Andhra Pradesh:Karnataka": 0.98,
  "Karnataka:Andhra Pradesh": 0.98,
  "Telangana:Karnataka": 1.01,
  "Karnataka:Telangana": 1.01,
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function getTransportFeasibility(sourceState: string, targetState: string) {
  if (sourceState === targetState) {
    return 1.12;
  }

  return CROSS_STATE_FACTORS[`${sourceState}:${targetState}`] ?? 0.95;
}

function latestByDistrict(records: NormalizedMandiPriceRecord[]) {
  const latest = new Map<string, NormalizedMandiPriceRecord>();

  for (const record of records) {
    const key = `${record.cropSlug}:${record.state}:${record.district}`;
    const current = latest.get(key);

    if (!current) {
      latest.set(key, record);
      continue;
    }

    const nextDate = new Date(`${record.marketDate}T00:00:00Z`).getTime();
    const currentDate = new Date(`${current.marketDate}T00:00:00Z`).getTime();

    if (nextDate >= currentDate) {
      latest.set(key, record);
    }
  }

  return Array.from(latest.values());
}

export function computePriceGaps(
  records: NormalizedMandiPriceRecord[],
  options: ComputeGapOptions = {},
) {
  const maxSourceDistricts = options.maxSourceDistricts ?? 3;
  const maxTargetDistricts = options.maxTargetDistricts ?? 3;
  const maxPairsPerCrop = options.maxPairsPerCrop ?? 5;
  const latestRecords = latestByDistrict(records);
  const grouped = new Map<string, NormalizedMandiPriceRecord[]>();

  for (const record of latestRecords) {
    const current = grouped.get(record.cropSlug) ?? [];
    current.push(record);
    grouped.set(record.cropSlug, current);
  }

  const recommendations: PriceGapRecord[] = [];

  for (const cropRecords of grouped.values()) {
    if (cropRecords.length < 2) {
      continue;
    }

    const sortedByPrice = [...cropRecords].sort((left, right) => left.modalPrice - right.modalPrice);
    const averagePrice =
      sortedByPrice.reduce((sum, record) => sum + record.modalPrice, 0) / sortedByPrice.length;
    const sources = sortedByPrice.slice(0, maxSourceDistricts);
    const targets = [...sortedByPrice].reverse().slice(0, maxTargetDistricts);
    const marketDates = sortedByPrice
      .map((record) => record.marketDate)
      .sort((left, right) => left.localeCompare(right));

    const windowStart = marketDates[0] ? `${marketDates[0]}T00:00:00.000Z` : null;
    const windowEnd = marketDates.at(-1) ? `${marketDates.at(-1)}T00:00:00.000Z` : null;
    const fetchedAt = new Date().toISOString();

    for (const source of sources) {
      for (const target of targets) {
        if (source.district === target.district || target.modalPrice <= source.modalPrice) {
          continue;
        }

        const priceGap = target.modalPrice - source.modalPrice;
        const demandStrength = Math.min(1.8, Math.max(0.7, target.modalPrice / averagePrice));
        const transportFeasibility = getTransportFeasibility(source.state, target.state);
        const opportunityScore = round(priceGap * demandStrength * transportFeasibility);

        recommendations.push({
          cropSlug: source.cropSlug,
          cropName: source.cropName,
          sourceDistrict: source.district,
          sourceState: source.state,
          sourceModalPrice: source.modalPrice,
          targetDistrict: target.district,
          targetState: target.state,
          targetModalPrice: target.modalPrice,
          priceGap: round(priceGap),
          demandStrength: round(demandStrength),
          transportFeasibility: round(transportFeasibility),
          opportunityScore,
          distanceKm: null,
          dataWindowStartedAt: windowStart,
          dataWindowEndedAt: windowEnd,
          explanation: {
            source_arrivals_tonnes: source.arrivalsTonnes,
            target_arrivals_tonnes: target.arrivalsTonnes,
            average_price: round(averagePrice),
            rationale: [
              `${target.district} is pricing ${source.cropName} higher than ${source.district}.`,
              `The source district sits in the cheapest cohort for the latest market snapshot.`,
              `Transport feasibility is currently estimated from interstate proximity only.`,
            ],
          },
          fetchedAt,
        });
      }
    }
  }

  return recommendations
    .sort((left, right) => right.opportunityScore - left.opportunityScore)
    .reduce<PriceGapRecord[]>((accumulator, record) => {
      const currentForCrop = accumulator.filter((item) => item.cropSlug === record.cropSlug);

      if (currentForCrop.length >= maxPairsPerCrop) {
        return accumulator;
      }

      accumulator.push(record);
      return accumulator;
    }, []);
}

export function latestPricesForCrop(records: NormalizedMandiPriceRecord[], cropSlug: string) {
  return latestByDistrict(records)
    .filter((record) => record.cropSlug === cropSlug)
    .sort((left, right) => right.modalPrice - left.modalPrice);
}
