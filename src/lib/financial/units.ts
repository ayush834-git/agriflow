/**
 * AgriFlow Financial Unit Normalization Engine
 * 
 * CANONICAL INTERNAL REPRESENTATION:
 * - Quantity: Kilograms (kg)
 * - Price: INR per Kilogram (₹/kg)
 * - Revenue / Value: INR (₹)
 * 
 * EXTERNAL SOURCES:
 * - Agmarknet & mandi_prices: Stored in ₹/quintal (1 quintal = 100 kg)
 * - Listings & Matches: Stored in kg and ₹/kg
 * - Arrivals: Tonnes (1 tonne = 1,000 kg)
 */

export type FinancialComparison = {
  actualRevenue: number;
  benchmarkRevenue: number;
  difference: number;
  percentage: number;
  isPositive: boolean;
  isNegative: boolean;
  hasBenchmark: boolean;
  labelType: "GAIN" | "LOSS" | "PARITY" | "NO_BENCHMARK";
};

/**
 * Normalizes mandi modal price (stored in ₹/quintal) to canonical ₹/kg.
 * 1 Quintal = 100 Kilograms.
 */
export function normalizeMandiPriceToPerKg(pricePerQuintal: number | null | undefined): number {
  if (!pricePerQuintal || pricePerQuintal <= 0) return 0;
  return Number((pricePerQuintal / 100).toFixed(2));
}

/**
 * Normalizes any quantity unit to kilograms.
 */
export function normalizeQuantityToKg(
  quantity: number,
  unit: "kg" | "quintal" | "tonne" = "kg",
): number {
  if (quantity <= 0) return 0;
  switch (unit) {
    case "quintal":
      return quantity * 100;
    case "tonne":
      return quantity * 1000;
    case "kg":
    default:
      return quantity;
  }
}

/**
 * Calculates AgriFlow revenue for a transaction.
 * Q (kg) × Price (₹/kg) = INR (₹)
 */
export function calculateAgriFlowRevenue(
  quantityKg: number,
  offeredPricePerKg: number,
): number {
  if (quantityKg <= 0 || offeredPricePerKg <= 0) return 0;
  return Number((quantityKg * offeredPricePerKg).toFixed(2));
}

/**
 * Calculates comparable mandi benchmark revenue for the EXACT same quantity.
 * Q (kg) × Mandi Price (₹/kg) = INR (₹)
 * Input mandiPricePerQuintal is converted by dividing by 100.
 */
export function calculateBenchmarkRevenue(
  quantityKg: number,
  mandiPricePerQuintal: number,
): number {
  if (quantityKg <= 0 || mandiPricePerQuintal <= 0) return 0;
  const pricePerKg = normalizeMandiPriceToPerKg(mandiPricePerQuintal);
  return Number((quantityKg * pricePerKg).toFixed(2));
}

/**
 * Compares AgriFlow realized revenue against local mandi benchmark for the exact same quantity sold.
 * Truthful comparison:
 * - If AgriFlow > Mandi: GAIN (positive savings/extra earned)
 * - If AgriFlow < Mandi: LOSS (truthfully reported as below benchmark; NEVER called 'savings')
 * - If benchmark is zero or missing: NO_BENCHMARK
 */
export function compareEarnings(
  actualRevenue: number,
  benchmarkRevenue: number,
): FinancialComparison {
  if (benchmarkRevenue <= 0) {
    return {
      actualRevenue,
      benchmarkRevenue: 0,
      difference: 0,
      percentage: 0,
      isPositive: false,
      isNegative: false,
      hasBenchmark: false,
      labelType: "NO_BENCHMARK",
    };
  }

  const diff = actualRevenue - benchmarkRevenue;
  const pct = (diff / benchmarkRevenue) * 100;

  if (diff > 0) {
    return {
      actualRevenue,
      benchmarkRevenue,
      difference: Number(diff.toFixed(2)),
      percentage: Number(pct.toFixed(1)),
      isPositive: true,
      isNegative: false,
      hasBenchmark: true,
      labelType: "GAIN",
    };
  }

  if (diff < 0) {
    return {
      actualRevenue,
      benchmarkRevenue,
      difference: Number(diff.toFixed(2)),
      percentage: Number(pct.toFixed(1)),
      isPositive: false,
      isNegative: true,
      hasBenchmark: true,
      labelType: "LOSS",
    };
  }

  return {
    actualRevenue,
    benchmarkRevenue,
    difference: 0,
    percentage: 0,
    isPositive: false,
    isNegative: false,
    hasBenchmark: true,
    labelType: "PARITY",
  };
}
