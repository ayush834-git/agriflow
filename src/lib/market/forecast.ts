import type { NormalizedMandiPriceRecord } from "@/lib/agmarknet/types";

export type MarketForecastResult = {
  recommendation: "SELL" | "HOLD" | "TRACK" | "INSUFFICIENT_DATA";
  confidence: number;
  explanation: string;
  bestDay: string | null;
  dataFreshness: "LIVE" | "STALE" | "DEMO" | "NO_DATA";
  trend: "upward" | "softening" | "stable";
  currentPrice: number;
  movingAverage: number;
  observedLow: number;
  observedHigh: number;
  observationsCount: number;
};

export function computeMarketForecast(
  records: NormalizedMandiPriceRecord[],
  options: {
    cropName: string;
    cropSlug: string;
    district?: string;
    source: "database" | "live" | "mock";
  },
): MarketForecastResult {
  const { cropName, district, source } = options;

  let filtered = district
    ? records.filter((r) => r.district.toLowerCase() === district.toLowerCase())
    : records;

  if (filtered.length < 2 && district && records.length >= 2) {
    // Fall back to broader region if district has very few points
    filtered = records;
  }

  const freshnessMap: Record<string, "LIVE" | "STALE" | "DEMO" | "NO_DATA"> = {
    live: "LIVE",
    database: "STALE",
    mock: "DEMO",
  };

  const dataFreshness = freshnessMap[source] ?? "DEMO";

  if (filtered.length < 2) {
    const singlePrice = filtered[0]?.modalPrice ?? 0;
    return {
      recommendation: "INSUFFICIENT_DATA",
      confidence: 0.3,
      explanation: `Insufficient historical observations for ${cropName}${
        district ? ` in ${district}` : ""
      } to calculate a reliable price trend. Track daily mandi arrivals.`,
      bestDay: null,
      dataFreshness: filtered.length === 0 ? "NO_DATA" : dataFreshness,
      trend: "stable",
      currentPrice: singlePrice,
      movingAverage: singlePrice,
      observedLow: singlePrice,
      observedHigh: singlePrice,
      observationsCount: filtered.length,
    };
  }

  const sorted = [...filtered].sort((a, b) =>
    (a.marketDate ?? "").localeCompare(b.marketDate ?? ""),
  );

  const modalPrices = sorted.map((p) => p.modalPrice);
  const currentPrice = modalPrices[modalPrices.length - 1];
  const firstPrice = modalPrices[0];
  const observedLow = Math.min(...modalPrices);
  const observedHigh = Math.max(...modalPrices);
  const movingAverage = Math.round(
    modalPrices.reduce((sum, p) => sum + p, 0) / modalPrices.length,
  );
  const priceChangePct = firstPrice > 0 ? (currentPrice - firstPrice) / firstPrice : 0;

  let trend: "upward" | "softening" | "stable" = "stable";
  if (priceChangePct >= 0.04) {
    trend = "upward";
  } else if (priceChangePct <= -0.04) {
    trend = "softening";
  }

  const observationBonus = Math.min(0.2, filtered.length * 0.02);

  if (currentPrice >= observedHigh * 0.95 && trend === "upward") {
    return {
      recommendation: "SELL",
      confidence: Number((0.7 + observationBonus).toFixed(2)),
      explanation: `${cropName} prices are near recent highs at ₹${currentPrice}/q (+${Math.round(
        priceChangePct * 100,
      )}% trend). Recommended to sell now before arrivals increase.`,
      bestDay: sorted[sorted.length - 1].marketDate,
      dataFreshness,
      trend,
      currentPrice,
      movingAverage,
      observedLow,
      observedHigh,
      observationsCount: filtered.length,
    };
  }

  if (currentPrice <= observedLow * 1.05 && trend === "softening") {
    return {
      recommendation: "HOLD",
      confidence: Number((0.65 + observationBonus).toFixed(2)),
      explanation: `${cropName} prices have softened to ₹${currentPrice}/q (-${Math.abs(
        Math.round(priceChangePct * 100),
      )}% trend). If storage allows, consider holding for a price rebound.`,
      bestDay: null,
      dataFreshness,
      trend,
      currentPrice,
      movingAverage,
      observedLow,
      observedHigh,
      observationsCount: filtered.length,
    };
  }

  return {
    recommendation: "TRACK",
    confidence: Number((0.6 + observationBonus).toFixed(2)),
    explanation: `${cropName} prices are steady around ₹${currentPrice}/q (average: ₹${movingAverage}/q). Track daily arrivals for price shifts.`,
    bestDay: null,
    dataFreshness,
    trend,
    currentPrice,
    movingAverage,
    observedLow,
    observedHigh,
    observationsCount: filtered.length,
  };
}
