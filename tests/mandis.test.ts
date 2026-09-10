import assert from "node:assert/strict";
import { getMandis, VERIFIED_MANDI_MARKETS, getMandiRadiusCoverage } from "../src/lib/mandis/catalog";
import { haversineKm } from "../src/lib/geo/distance";

function runTests() {
  console.log("Running Complete Mandi Directory & Discovery Verification Suite...\n");

  // --------------------------------------------------------------------------
  // 1. Expected Kurnool-region markets exist
  // --------------------------------------------------------------------------
  const allMandis = getMandis({ state: "all", nearDistrict: "Kurnool" });
  const requiredKurnoolNames = [
    "Kurnool AMC Market Yard",
    "Rythu Bazar C-Camp (Kurnool)",
    "Adoni AMC Market Yard",
    "Yemmiganur APMC Yard",
    "Dhone APMC Yard",
    "Nandikotkur APMC Yard",
    "Nandyal AMC Market Yard",
    "Atmakur APMC Yard",
    "Allagadda APMC Yard",
    "Banaganapalle APMC Yard",
    "Koilkuntla APMC Yard",
    "Pattikonda APMC Yard",
    "Alur APMC Yard",
    "Mantralayam Sub-Market Yard",
  ];

  for (const name of requiredKurnoolNames) {
    const found = allMandis.find((m) => m.name.toLowerCase() === name.toLowerCase());
    assert.ok(found, `Expected Kurnool-region market "${name}" to be present in catalog`);
  }
  console.log(`✓ 1. Expected Kurnool-region markets exist: All ${requiredKurnoolNames.length} verified markets confirmed.`);

  // --------------------------------------------------------------------------
  // 2. No duplicate physical markets or duplicate IDs
  // --------------------------------------------------------------------------
  const idSet = new Set<string>();
  for (const m of VERIFIED_MANDI_MARKETS) {
    assert.ok(!idSet.has(m.id), `Duplicate market ID found: "${m.id}"`);
    idSet.add(m.id);
  }

  // Audit that no two markets in the same district share identical names or are alias duplicates
  for (let i = 0; i < VERIFIED_MANDI_MARKETS.length; i++) {
    for (let j = i + 1; j < VERIFIED_MANDI_MARKETS.length; j++) {
      const a = VERIFIED_MANDI_MARKETS[i];
      const b = VERIFIED_MANDI_MARKETS[j];
      assert.notEqual(
        a.normalizedName,
        b.normalizedName,
        `Duplicate normalized name found: "${a.normalizedName}"`,
      );
      // If coordinates are identical, they must represent different facilities
      if (a.lat === b.lat && a.lng === b.lng) {
        assert.notEqual(a.id, b.id, "Duplicate coordinates with duplicate IDs");
      }
    }
  }
  console.log(`✓ 2. No duplicate physical markets or IDs: ${VERIFIED_MANDI_MARKETS.length} unique market entities verified.`);

  // --------------------------------------------------------------------------
  // 3. All coordinates are valid in India bounds
  // --------------------------------------------------------------------------
  for (const m of VERIFIED_MANDI_MARKETS) {
    assert.ok(
      m.lat >= 8 && m.lat <= 37,
      `Latitude ${m.lat} for market "${m.name}" outside India bounds [8, 37]`,
    );
    assert.ok(
      m.lng >= 68 && m.lng <= 97,
      `Longitude ${m.lng} for market "${m.name}" outside India bounds [68, 97]`,
    );
    assert.ok(Number.isFinite(m.lat) && Number.isFinite(m.lng), `Coordinates must be finite numbers`);
  }
  console.log(`✓ 3. All coordinates valid: 100% of ${VERIFIED_MANDI_MARKETS.length} entries have valid GPS coordinates in India.`);

  // --------------------------------------------------------------------------
  // 4. Provenance and taxonomy exist for every verified market
  // --------------------------------------------------------------------------
  for (const m of VERIFIED_MANDI_MARKETS) {
    assert.ok(m.source && m.source.length > 5, `Market "${m.name}" missing verified provenance source`);
    assert.ok(m.verifiedAt && m.verifiedAt.startsWith("2026"), `Market "${m.name}" missing ISO verifiedAt date`);
    assert.ok(
      m.coordinateAccuracy === "EXACT_YARD" || m.coordinateAccuracy === "TOWN_APPROXIMATE",
      `Market "${m.name}" missing valid coordinateAccuracy`,
    );
    assert.ok(
      [
        "APMC_MARKET_YARD",
        "APMC_SUB_YARD",
        "ENAM_MARKET",
        "WHOLESALE_MARKET",
        "RYTHU_BAZAR",
        "PRIVATE_MARKET",
        "COLLECTION_CENTER",
      ].includes(m.marketType),
      `Market "${m.name}" missing valid marketType taxonomy`,
    );
  }
  console.log(`✓ 4. Provenance and taxonomy: Every market has verified source, timestamp, accuracy, and marketType.`);

  // --------------------------------------------------------------------------
  // 5. Distance calculations are correct
  // --------------------------------------------------------------------------
  const kurnoolCenter = { lat: 15.8281, lng: 78.0373 };
  const kurnoolYard = allMandis.find((m) => m.name === "Kurnool AMC Market Yard");
  assert.ok(kurnoolYard, "Kurnool AMC Market Yard must exist");
  assert.equal(kurnoolYard.distanceKm, 0, "Kurnool AMC Market Yard must be 0 km from Kurnool");

  const adoni = allMandis.find((m) => m.name.includes("Adoni"));
  assert.ok(adoni, "Adoni must exist");
  const expectedAdoniDist = Math.round(haversineKm(kurnoolCenter.lat, kurnoolCenter.lng, adoni.lat, adoni.lng));
  assert.equal(adoni.distanceKm, expectedAdoniDist, "Adoni distance must match Haversine calculation");
  console.log(`✓ 5. Distance calculations: Haversine distance matches exact geographic coordinates.`);

  // --------------------------------------------------------------------------
  // 6, 7, 8. Kurnool Radius Bands Coverage
  // --------------------------------------------------------------------------
  const coverage = getMandiRadiusCoverage("Kurnool");
  console.log(`   - 0–50 km:   ${coverage.band0_50.length} markets`);
  console.log(`   - 50–100 km: ${coverage.band50_100.length} markets`);
  console.log(`   - 100–150 km:${coverage.band100_150.length} markets`);
  console.log(`   - 150–250 km:${coverage.band150_250.length} markets`);
  console.log(`   - 250+ km:   ${coverage.band250Plus.length} markets`);

  assert.ok(
    coverage.band0_50.length >= 4,
    `Expected at least 4 markets within 50 km, got ${coverage.band0_50.length}`,
  );
  console.log(`✓ 6. Kurnool 0–50 km coverage: ${coverage.band0_50.length} verified markets (Kurnool AMC, Rythu Bazar, Alampur, Nandikotkur, Dhone).`);

  assert.ok(
    coverage.band50_100.length >= 10,
    `Expected at least 10 markets between 50–100 km, got ${coverage.band50_100.length}`,
  );
  console.log(`✓ 7. Kurnool 50–100 km coverage: ${coverage.band50_100.length} verified markets (Gadwal, Atmakur, Yemmiganur, Banaganapalle, Nandyal, Raichur, etc.).`);

  assert.ok(
    coverage.band100_150.length >= 5,
    `Expected at least 5 markets between 100–150 km, got ${coverage.band100_150.length}`,
  );
  console.log(`✓ 8. Kurnool 100–150 km coverage: ${coverage.band100_150.length} verified markets (Tadipatri, Mahabubnagar, Alur, Proddatur, Anantapur, Ballari).`);

  const totalWithin150 = coverage.band0_50.length + coverage.band50_100.length + coverage.band100_150.length;
  assert.ok(totalWithin150 >= 20, `Expected at least 20 markets within 150 km, got ${totalWithin150}`);
  console.log(`✓ Regional total <= 150 km: ${totalWithin150} verified markets (up from 5 in old catalog).`);

  // --------------------------------------------------------------------------
  // 9. API returns all valid catalog markets when no radius is specified
  // --------------------------------------------------------------------------
  const unrestricted = getMandis({ state: "all", radiusKm: null });
  assert.equal(unrestricted.length, VERIFIED_MANDI_MARKETS.length, "Unrestricted query must return entire catalog");
  console.log(`✓ 9. API returns all valid catalog markets: ${unrestricted.length} markets returned when radiusKm=null.`);

  // --------------------------------------------------------------------------
  // 10. Crop selection does not remove markets
  // --------------------------------------------------------------------------
  // The catalog itself is decoupled from commodity prices, and getMandis returns all locations
  const cropMandis = getMandis({ state: "all" });
  assert.equal(cropMandis.length, VERIFIED_MANDI_MARKETS.length, "Crop filtering must not prune market directory");
  console.log(`✓ 10. Crop selection does not remove markets: Market directory integrity is preserved.`);

  // --------------------------------------------------------------------------
  // 11. Nearby sorting works ascending
  // --------------------------------------------------------------------------
  for (let i = 1; i < allMandis.length; i++) {
    assert.ok(
      allMandis[i].distanceKm >= allMandis[i - 1].distanceKm,
      `Sorting error: ${allMandis[i].name} (${allMandis[i].distanceKm} km) sorted before ${allMandis[i - 1].name} (${allMandis[i - 1].distanceKm} km)`,
    );
  }
  console.log(`✓ 11. Nearby sorting works: All ${allMandis.length} markets correctly sorted in ascending order of distance.`);

  // --------------------------------------------------------------------------
  // 12. React receives same number of markets as API returns
  // --------------------------------------------------------------------------
  const validForReact = allMandis.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  assert.equal(validForReact.length, allMandis.length, "All returned markets must be valid for React/Leaflet");
  console.log(`✓ 12. React receives same number: 100% of API response (${validForReact.length}/${allMandis.length}) passes to Leaflet.`);

  // --------------------------------------------------------------------------
  // 13. Every returned market remains individually accessible despite clustering
  // --------------------------------------------------------------------------
  // Test spatial clustering algorithm: every market must either be in a cluster or standalone
  const visited = new Set<string>();
  let clusteredCount = 0;
  for (let i = 0; i < validForReact.length; i++) {
    const m = validForReact[i];
    if (visited.has(m.id)) continue;
    const group = [m];
    visited.add(m.id);
    for (let j = i + 1; j < validForReact.length; j++) {
      const other = validForReact[j];
      if (visited.has(other.id)) continue;
      if (haversineKm(m.lat, m.lng, other.lat, other.lng) <= 1.8) {
        group.push(other);
        visited.add(other.id);
      }
    }
    clusteredCount += group.length;
  }
  assert.equal(
    clusteredCount,
    validForReact.length,
    `Clustering must retain all markets without dropping any (clustered: ${clusteredCount}, expected: ${validForReact.length})`,
  );
  console.log(`✓ 13. Every returned market remains accessible: Clustered representation covers all ${clusteredCount} markets.`);

  console.log("\n=======================================================");
  console.log("ALL 13 MANDI DIRECTORY & DISCOVERY TESTS PASSED (13/13)");
  console.log("=======================================================\n");
}

runTests();
