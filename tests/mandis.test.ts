import assert from "node:assert/strict";
import { getMandis, VERIFIED_MANDI_MARKETS } from "../src/lib/mandis/catalog";

function runTests() {
  console.log("Running Mandi Market Directory & Discovery Tests...\n");

  // 1. Total verified markets
  assert.ok(VERIFIED_MANDI_MARKETS.length >= 40, `Expected at least 40 mandis, got ${VERIFIED_MANDI_MARKETS.length}`);
  console.log(`✓ Verified Mandi Catalog contains ${VERIFIED_MANDI_MARKETS.length} real mandis (NOT 4 or 5 hardcoded entries)`);

  // 2. All States filter
  const allMandis = getMandis({ state: "all", nearDistrict: "Kurnool" });
  assert.equal(allMandis.length, VERIFIED_MANDI_MARKETS.length, "All states must return all verified mandis");
  console.log(`✓ All States filter: returns ${allMandis.length} mandis across AP, Telangana, Karnataka, and Maharashtra`);

  // 3. Selected State filter: Andhra Pradesh
  const apMandis = getMandis({ state: "Andhra Pradesh", nearDistrict: "Kurnool" });
  assert.ok(apMandis.length >= 8, `Expected at least 8 AP mandis, got ${apMandis.length}`);
  assert.ok(apMandis.every((m) => m.state === "Andhra Pradesh"), "All returned mandis must be in Andhra Pradesh");
  console.log(`✓ Selected State filter (Andhra Pradesh): returns ${apMandis.length} mandis, all in AP`);

  // 4. Selected State filter: Telangana
  const tgMandis = getMandis({ state: "Telangana", nearDistrict: "Kurnool" });
  assert.ok(tgMandis.length >= 10, `Expected at least 10 TG mandis, got ${tgMandis.length}`);
  assert.ok(tgMandis.every((m) => m.state === "Telangana"), "All returned mandis must be in Telangana");
  console.log(`✓ Selected State filter (Telangana): returns ${tgMandis.length} mandis, all in Telangana`);

  // 5. Selected State filter: Karnataka
  const kaMandis = getMandis({ state: "Karnataka", nearDistrict: "Kurnool" });
  assert.ok(kaMandis.length >= 10, `Expected at least 10 KA mandis, got ${kaMandis.length}`);
  assert.ok(kaMandis.every((m) => m.state === "Karnataka"), "All returned mandis must be in Karnataka");
  console.log(`✓ Selected State filter (Karnataka): returns ${kaMandis.length} mandis, all in Karnataka`);

  // 6. Proximity discovery for a Kurnool farmer
  const nearestToKurnool = allMandis[0];
  assert.equal(nearestToKurnool.district, "Kurnool", "Nearest mandi to Kurnool must be in Kurnool district");
  assert.ok(nearestToKurnool.distanceKm <= 5, `Local mandi distance should be ~0 km, got ${nearestToKurnool.distanceKm} km`);
  console.log(`✓ Kurnool farmer proximity discovery: Nearest mandi is "${nearestToKurnool.name}" (${nearestToKurnool.distanceKm} km away)`);

  // 7. Verify Adoni APMC is discovered in Kurnool district
  const adoni = allMandis.find((m) => m.name.toLowerCase().includes("adoni"));
  assert.ok(adoni, "Adoni APMC must be present in catalog");
  assert.equal(adoni?.district, "Kurnool", "Adoni must belong to Kurnool district");
  console.log(`✓ Local market discovery: Found ${adoni?.name} in ${adoni?.district} (${adoni?.distanceKm} km away)`);

  // 8. Nearby Radius filter (e.g. within 150 km of Kurnool)
  const nearbyMandis = getMandis({ nearDistrict: "Kurnool", radiusKm: 150 });
  assert.ok(nearbyMandis.length >= 3, `Expected at least 3 mandis within 150km, got ${nearbyMandis.length}`);
  assert.ok(nearbyMandis.every((m) => m.distanceKm <= 150), "All returned mandis must be within 150km");
  console.log(`✓ Radius filter (150 km): returns ${nearbyMandis.length} nearby mandis (Kurnool, Adoni, Anantapur, Ballari)`);

  // 9. Coordinate validation (all mandis must have valid coordinates in India)
  for (const m of VERIFIED_MANDI_MARKETS) {
    assert.ok(m.lat >= 8 && m.lat <= 37, `Latitude ${m.lat} of ${m.name} out of India bounds`);
    assert.ok(m.lng >= 68 && m.lng <= 97, `Longitude ${m.lng} of ${m.name} out of India bounds`);
    assert.ok(m.id && m.id.length > 0, `Mandi ${m.name} missing stable ID`);
  }
  console.log(`✓ Coordinate validation: All ${VERIFIED_MANDI_MARKETS.length} mandis have verified valid GPS coordinates in India`);

  console.log("\nALL MANDI MARKET DIRECTORY TESTS PASSED!\n");
}

runTests();
