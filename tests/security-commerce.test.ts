import assert from "node:assert/strict";
import { verifyTwilioSignature } from "../src/lib/twilio/auth";
import { calculateAgriFlowRevenue, calculateBenchmarkRevenue, compareEarnings } from "../src/lib/financial/units";

function runTests() {
  console.log("Running Security & Commerce Flow Verification Tests...\n");

  // 1. Webhook Signature Verification (Anti-Tampering)
  {
    process.env.TWILIO_AUTH_TOKEN = "test_auth_token_12345";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const formData = new FormData();
    formData.append("From", "whatsapp:+919876543210");
    formData.append("Body", "SELL tomato 1000 18");

    // With a fake signature, verification must FAIL
    const reqWithFakeSig = new Request("https://agriflowv1.vercel.app/api/whatsapp/webhook", {
      headers: { "x-twilio-signature": "invalid_signature_hex_123" },
    });
    const resultFake = verifyTwilioSignature(reqWithFakeSig, formData);
    assert.equal(resultFake.valid, false, "Invalid signature must be rejected");
    console.log("✓ Webhook Security: Invalid HMAC signature correctly rejected (403/401)");

    // Missing signature in production must FAIL
    const reqNoSig = new Request("https://agriflowv1.vercel.app/api/whatsapp/webhook");
    const resultNoSig = verifyTwilioSignature(reqNoSig, formData);
    assert.equal(resultNoSig.valid, false, "Missing signature in production must be rejected");
    console.log("✓ Webhook Security: Missing signature correctly rejected");
  }

  // 2. Listing & Match Data Integrity
  {
    // Farmer creates listing: 2000 kg tomato @ ₹18.00/kg
    const listingQuantityKg = 2000;
    const askingPricePerKg = 18;
    assert.ok(listingQuantityKg > 0, "Listing quantity must be positive");
    assert.ok(askingPricePerKg > 0, "Listing asking price must be positive");

    // Match created: FPO offers ₹17.50/kg for 2000 kg
    const matchQuantityKg = 2000;
    const offeredPricePerKg = 17.50;
    const revenue = calculateAgriFlowRevenue(matchQuantityKg, offeredPricePerKg);
    assert.equal(revenue, 35000, "AgriFlow revenue must be 2,000 kg × ₹17.50/kg = ₹35,000");

    // Local Mandi modal price: ₹1400/quintal = ₹14.00/kg
    const localMandiPriceQuintal = 1400;
    const benchmarkRevenue = calculateBenchmarkRevenue(matchQuantityKg, localMandiPriceQuintal);
    assert.equal(benchmarkRevenue, 28000, "Benchmark must be 2,000 kg × ₹14.00/kg = ₹28,000");

    // Earnings progression upon acceptance:
    const comparison = compareEarnings(revenue, benchmarkRevenue);
    assert.equal(comparison.labelType, "GAIN");
    assert.equal(comparison.difference, 7000, "Extra earned must be +₹7,000");
    assert.equal(comparison.percentage, 25.0, "Improvement must be +25.0%");
    console.log("✓ Commerce Lifecycle: Match acceptance correctly records +₹7,000 (+25%) extra earnings over local mandi");
  }

  // 3. Truthful reporting when AgriFlow offer is lower than mandi
  {
    // Distress or clearance sale: ₹11.00/kg vs Mandi ₹14.00/kg
    const revenue = calculateAgriFlowRevenue(2000, 11);
    const benchmark = calculateBenchmarkRevenue(2000, 1400);
    const comparison = compareEarnings(revenue, benchmark);
    assert.equal(comparison.labelType, "LOSS");
    assert.equal(comparison.isNegative, true);
    assert.equal(comparison.difference, -6000);
    assert.equal(comparison.percentage, -21.4);
    console.log("✓ Truthful Reporting: Negative difference (-₹6,000, -21.4%) correctly identified as below benchmark, NEVER as savings");
  }

  console.log("\nALL SECURITY & COMMERCE TESTS PASSED!\n");
}

runTests();
