import assert from "node:assert/strict";
import {
  calculateAgriFlowRevenue,
  calculateBenchmarkRevenue,
  compareEarnings,
  normalizeMandiPriceToPerKg,
  normalizeQuantityToKg,
} from "../src/lib/financial/units";

function runTests() {
  console.log("Running Financial Unit Normalization & Earnings Tests...\n");

  // 1. kg × ₹/kg
  {
    const qtyKg = 2500;
    const pricePerKg = 23.40;
    const revenue = calculateAgriFlowRevenue(qtyKg, pricePerKg);
    assert.equal(revenue, 58500, "2,500 kg × ₹23.40/kg must equal ₹58,500");
    console.log("✓ kg × ₹/kg: 2,500 kg × ₹23.40/kg = ₹58,500");
  }

  // 2. kg × ₹/quintal (1 quintal = 100 kg)
  {
    const qtyKg = 2500;
    const mandiPricePerQuintal = 1680; // ₹1,680/quintal = ₹16.80/kg
    const benchmark = calculateBenchmarkRevenue(qtyKg, mandiPricePerQuintal);
    assert.equal(benchmark, 42000, "2,500 kg × ₹1,680/quintal must equal ₹42,000 (NOT ₹42,00,000)");
    console.log("✓ kg × ₹/quintal: 2,500 kg × ₹1,680/quintal = ₹42,000 (NO 100x BUG)");
  }

  // 3. quintal × ₹/quintal
  {
    const qtyQuintal = 25;
    const qtyKg = normalizeQuantityToKg(qtyQuintal, "quintal");
    assert.equal(qtyKg, 2500, "25 quintals must normalize to 2,500 kg");
    const mandiPricePerQuintal = 1680;
    const benchmark = calculateBenchmarkRevenue(qtyKg, mandiPricePerQuintal);
    assert.equal(benchmark, 42000, "25 quintals (2,500 kg) × ₹1,680/quintal = ₹42,000");
    console.log("✓ quintal × ₹/quintal: 25 quintals × ₹1,680/quintal = ₹42,000");
  }

  // 4. tonne × ₹/kg
  {
    const qtyTonnes = 2.5;
    const qtyKg = normalizeQuantityToKg(qtyTonnes, "tonne");
    assert.equal(qtyKg, 2500, "2.5 tonnes must normalize to 2,500 kg");
    const pricePerKg = 23.40;
    const revenue = calculateAgriFlowRevenue(qtyKg, pricePerKg);
    assert.equal(revenue, 58500, "2.5 tonnes (2,500 kg) × ₹23.40/kg = ₹58,500");
    console.log("✓ tonne × ₹/kg: 2.5 tonnes × ₹23.40/kg = ₹58,500");
  }

  // 5. Positive comparison (AgriFlow > Mandi)
  {
    const actual = 58500;
    const benchmark = 42000;
    const result = compareEarnings(actual, benchmark);
    assert.equal(result.labelType, "GAIN");
    assert.equal(result.isPositive, true);
    assert.equal(result.isNegative, false);
    assert.equal(result.difference, 16500, "Gain must be +₹16,500");
    assert.equal(result.percentage, 39.3, "Improvement must be +39.3%");
    console.log("✓ Positive comparison: Actual ₹58,500 vs Benchmark ₹42,000 => +₹16,500 (+39.3% GAIN)");
  }

  // 6. Negative comparison (AgriFlow < Mandi)
  {
    const actual = 35000;
    const benchmark = 42000;
    const result = compareEarnings(actual, benchmark);
    assert.equal(result.labelType, "LOSS");
    assert.equal(result.isPositive, false);
    assert.equal(result.isNegative, true);
    assert.equal(result.difference, -7000, "Difference must be -₹7,000");
    assert.equal(result.percentage, -16.7, "Percentage must be -16.7%");
    console.log("✓ Negative comparison: Actual ₹35,000 vs Benchmark ₹42,000 => -₹7,000 (-16.7% LOSS, NOT labelled as 'savings')");
  }

  // 7. Zero benchmark
  {
    const actual = 50000;
    const benchmark = 0;
    const result = compareEarnings(actual, benchmark);
    assert.equal(result.labelType, "NO_BENCHMARK");
    assert.equal(result.hasBenchmark, false);
    assert.equal(result.difference, 0);
    assert.equal(result.percentage, 0);
    console.log("✓ Zero benchmark handled safely without division by zero");
  }

  // 8. Missing benchmark price
  {
    const normalizedPrice = normalizeMandiPriceToPerKg(null);
    assert.equal(normalizedPrice, 0, "Missing price returns 0");
    const benchmarkRevenue = calculateBenchmarkRevenue(2500, 0);
    assert.equal(benchmarkRevenue, 0, "Missing benchmark produces 0 revenue");
    console.log("✓ Missing benchmark handled gracefully");
  }

  // 9. Exact Reproduction of the Reported Production Bug:
  // Match 1: 1500 kg @ ₹17.00/kg
  // Match 2: 2000 kg @ ₹16.50/kg
  // Local Mandi modal price: ₹1200/quintal (Kurnool Tomato)
  {
    const match1Actual = calculateAgriFlowRevenue(1500, 17);
    const match2Actual = calculateAgriFlowRevenue(2000, 16.5);
    const totalActual = match1Actual + match2Actual;
    assert.equal(totalActual, 58500, "Total AgriFlow revenue must be ₹58,500");

    // The BUG was: 1500 * 1200 + 2000 * 1200 = 42,00,000
    const buggyBenchmark = (1500 * 1200) + (2000 * 1200);
    assert.equal(buggyBenchmark, 4200000, "Proof: Un-normalized math produces ₹42,00,000");

    // The FIX is:
    const match1Benchmark = calculateBenchmarkRevenue(1500, 1200);
    const match2Benchmark = calculateBenchmarkRevenue(2000, 1200);
    const totalCorrectBenchmark = match1Benchmark + match2Benchmark;
    assert.equal(totalCorrectBenchmark, 42000, "Normalized benchmark must be ₹42,000");

    const comparison = compareEarnings(totalActual, totalCorrectBenchmark);
    assert.equal(comparison.difference, 16500, "True profit gained is +₹16,500");
    assert.equal(comparison.percentage, 39.3, "True profit percentage is +39.3%");
    console.log("✓ Verified exact fix for reported production bug: ₹42,00,000 fixed to ₹42,000!");
  }

  console.log("\nALL FINANCIAL UNIT TESTS PASSED!\n");
}

runTests();
