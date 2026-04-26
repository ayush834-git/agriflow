/**
 * gemini-context.ts
 *
 * Builds rich, structured context strings about a specific user's real data
 * (inventory, listings, crop preferences, recent matches, live prices) to
 * inject into any Gemini prompt — giving the AI full awareness of actual
 * user-fed data rather than responding generically.
 */

import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { getDistrictsWithinKm } from "@/lib/geo/distance";
import { listInventory } from "@/lib/inventory/store";
import { listListings } from "@/lib/listings/store";
import { latestPricesForCrop } from "@/lib/market/engine";
import { listMatchesForFarmer, listMatchesForCounterparty } from "@/lib/matches/store";
import { listRecommendationsForInventory } from "@/lib/recommendations/store";
import { listFarmerCropsForUser } from "@/lib/users/store";
import type { AppUser } from "@/lib/users/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Returns a compact text block describing the user's live inventory,
 * listings, matches and crop preferences.  Safe to embed in any Gemini
 * system prompt without exceeding token budgets.
 */
export async function buildUserInventoryContext(user: AppUser): Promise<string> {
  const lines: string[] = [
    `=== AGRIFLOW USER CONTEXT ===`,
    `Name: ${user.fullName}`,
    `Role: ${user.role}`,
    `District: ${user.district ?? "Not set"}`,
    `State: ${user.state ?? "Not set"}`,
  ];

  if (user.role === "FARMER") {
    // Crop preferences
    const crops = await listFarmerCropsForUser(user.id);
    if (crops.length > 0) {
      lines.push(`\nFarmer crops tracked:`);
      for (const c of crops) {
        lines.push(
          `  • ${c.cropName} (${c.district ?? user.district ?? "?"}) — alert threshold: ${c.alertThreshold ? formatCurrency(c.alertThreshold) + "/q" : "not set"}`,
        );
      }
    }

    // Listings
    const listings = await listListings({ farmerUserId: user.id, statuses: ["ACTIVE", "MATCHED"] });
    if (listings.length > 0) {
      lines.push(`\nActive listings:`);
      for (const l of listings) {
        lines.push(
          `  • ${l.cropName} — ${l.quantityKg.toLocaleString("en-IN")} kg @ ${l.askingPricePerKg ? formatCurrency(l.askingPricePerKg) + "/kg" : "price TBD"} — status: ${l.status}`,
        );
      }
    } else {
      lines.push(`\nNo active listings.`);
    }

    // Matches
    const matches = await listMatchesForFarmer(user.id, 5);
    if (matches.length > 0) {
      lines.push(`\nRecent matches:`);
      for (const m of matches) {
        lines.push(
          `  • ${m.cropName} — ${m.quantityKg?.toLocaleString("en-IN") ?? "?"} kg — status: ${m.status}${m.offeredPricePerKg ? ` @ ${formatCurrency(m.offeredPricePerKg)}/kg` : ""}`,
        );
      }
    }
  }

  if (user.role === "FPO") {
    lines.push(`\nOrganization: ${user.organizationName ?? "—"}`);
    lines.push(`Districts served: ${user.districtsServed.join(", ") || "None set"}`);
    lines.push(`Crops handled: ${user.cropsHandled.join(", ") || "None set"}`);
    lines.push(`Service radius: ${user.serviceRadiusKm ?? "Not set"} km`);

    // Inventory
    const inventory = await listInventory(user.id);
    if (inventory.length > 0) {
      lines.push(`\nCurrent inventory (${inventory.length} lot${inventory.length > 1 ? "s" : ""}):`);
      for (const item of inventory) {
        lines.push(
          `  • ${item.cropName} — ${item.quantityKg.toLocaleString("en-IN")} kg in ${item.district}, ${item.state}`,
        );
        lines.push(
          `    Deadline: ${item.deadlineDate} | Storage: ${item.storageType ?? "ambient"} | Risk: ${item.spoilageLevel} (score ${item.spoilageScore})`,
        );

        // Top recommendation for this lot
        const recs = await listRecommendationsForInventory(item.id);
        if (recs.length > 0) {
          const top = recs[0];
          lines.push(
            `    Best route: ${top.targetDistrict}, ${top.targetState} — net profit ~${formatCurrency(top.totalNetProfitInr ?? 0)} total (${top.urgency} urgency, ${((top.confidence ?? 0) * 100).toFixed(0)}% confidence)`,
          );
        }
      }
    } else {
      lines.push(`\nNo inventory lots currently.`);
    }

    // FPO Matches
    const matches = await listMatchesForCounterparty(user.id, 5);
    if (matches.length > 0) {
      lines.push(`\nRecent buyer matches:`);
      for (const m of matches) {
        lines.push(
          `  • ${m.cropName} — ${m.quantityKg?.toLocaleString("en-IN") ?? "?"} kg — status: ${m.status}`,
        );
      }
    }
  }

  lines.push(`\n=== END USER CONTEXT ===`);
  return lines.join("\n");
}

/**
 * Returns a compact text block of live market prices for the given crops
 * scoped to districts within the specified radius of the user's district.
 */
export async function buildMarketContext(
  cropSlugs: string[],
  district: string | null,
  radiusKm = 100,
): Promise<string> {
  if (cropSlugs.length === 0) return "";

  const nearbyDistricts = district ? getDistrictsWithinKm(district, radiusKm) : [];

  const feed = await resolveAgmarknetFeed({
    cropSlugs,
    historyDays: 3,
    mode: "auto",
  });

  if (feed.records.length === 0) return "No live price data available.";

  const lines: string[] = [`=== LIVE MARKET PRICES (${feed.source === "mock" ? "demo" : "live"}) ===`];

  for (const slug of cropSlugs) {
    const cropRecords = feed.records.filter((r) => r.cropSlug === slug);
    const scopedRecords =
      nearbyDistricts.length > 0
        ? cropRecords.filter((r) => nearbyDistricts.includes(r.district))
        : cropRecords;
    const recordsToUse = scopedRecords.length > 0 ? scopedRecords : cropRecords;
    const prices = latestPricesForCrop(recordsToUse, slug);

    if (prices.length === 0) continue;

    const cropName = prices[0]?.cropSlug ?? slug;
    lines.push(`\n${cropName} prices (₹/quintal):`);
    for (const p of prices.slice(0, 5)) {
      lines.push(`  ${p.district}: ${formatCurrency(p.modalPrice)}`);
    }
  }

  lines.push(`\n=== END MARKET DATA ===`);
  return lines.join("\n");
}
