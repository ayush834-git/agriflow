import type { SpoilageScoreResult } from "@/lib/inventory/types";
import {
  DEMO_FPO_OWNER_ID,
  findInventoryById,
  listInventory,
  refreshInventoryRiskAssessment,
  resetFallbackInventory,
} from "@/lib/inventory/store";
import { resetFallbackListings } from "@/lib/listings/store";
import { connectListingMatch } from "@/lib/matches/engine";
import { listMatchesForFarmer, resetFallbackMatches } from "@/lib/matches/store";
import { createNotification, resetFallbackNotifications } from "@/lib/notifications/store";
import {
  generateRecommendationsForInventory,
  generateRecommendationsForOwner,
} from "@/lib/recommendations/engine";
import { resetFallbackRecommendations } from "@/lib/recommendations/store";
import { DEMO_FARMER_DEFAULT_ID } from "@/lib/users/demo";
import { findUserById, resetFallbackUserStores } from "@/lib/users/store";
import { resetFallbackWhatsAppSessions } from "@/lib/whatsapp/session-store";

import { resetDemoMarketState, triggerDemoTomatoPriceSpike } from "@/lib/demo/market";

const DEMO_TOMATO_LISTING_ID = "demo-listing-tomato-kurnool";
const DEMO_TOMATO_INVENTORY_ID = "demo-inventory-tomato-kurnool";
const DEMO_ONION_INVENTORY_ID = "demo-inventory-onion-guntur";

export async function resetDemoSystem() {
  resetFallbackUserStores();
  resetFallbackListings();
  resetFallbackInventory();
  resetFallbackMatches();
  resetFallbackNotifications();
  resetFallbackRecommendations();
  resetFallbackWhatsAppSessions();
  const market = resetDemoMarketState();
  const inventory = await listInventory(DEMO_FPO_OWNER_ID);
  const recommendations = await generateRecommendationsForOwner(DEMO_FPO_OWNER_ID);

  return {
    resetAt: new Date().toISOString(),
    demoFarmerUserId: DEMO_FARMER_DEFAULT_ID,
    demoFpoUserId: DEMO_FPO_OWNER_ID,
    listingIds: [DEMO_TOMATO_LISTING_ID],
    inventoryIds: inventory.map((item) => item.id),
    recommendationCount: recommendations.length,
    seededRouteHighlights: {
      tomato: market.gaps.find(
        (gap) =>
          gap.cropSlug === "tomato" &&
          gap.sourceDistrict === "Kurnool" &&
          gap.targetDistrict === "Hyderabad",
      ),
      onion: market.gaps.find(
        (gap) =>
          gap.cropSlug === "onion" &&
          gap.sourceDistrict === "Guntur" &&
          gap.targetDistrict === "Bengaluru",
      ),
    },
  };
}

export function triggerDemoPriceSpike() {
  return triggerDemoTomatoPriceSpike();
}

export async function triggerDemoMatch() {
  const current = await listMatchesForFarmer(DEMO_FARMER_DEFAULT_ID, 12);
  const existing = current.find(
    (match) =>
      match.listingId === DEMO_TOMATO_LISTING_ID &&
      (match.status === "OPEN" ||
        match.status === "CONTACTED" ||
        match.status === "ACCEPTED"),
  );

  if (existing) {
    return {
      alreadyActive: true,
      match: existing,
    };
  }

  const connected = await connectListingMatch({
    listingId: DEMO_TOMATO_LISTING_ID,
    inventoryId: DEMO_TOMATO_INVENTORY_ID,
    counterpartyUserId: DEMO_FPO_OWNER_ID,
  });

  return {
    alreadyActive: false,
    ...connected,
  };
}

function buildForcedSpoilageScore(): SpoilageScoreResult {
  return {
    score: 91,
    level: "CRITICAL",
    weatherPressure: 0.88,
    deadlinePressure: 0.84,
    cropSensitivity: 0.72,
    storageAdjustment: -0.04,
    temperaturePressure: 0.77,
    humidityPressure: 0.81,
    confidence: 0.9,
    summary:
      "Humidity climbed overnight and the cold-chain window tightened for the Guntur onion lot.",
    reasoning: [
      "Relative humidity is elevated enough to accelerate skin damage and shrink storage tolerance.",
      "The 5-day onion deadline is now close enough that waiting reduces the safe dispatch window.",
      "This score is intentionally forced for the live demo so the spoilage flow can be rehearsed reliably.",
    ],
  };
}

export async function triggerDemoSpoilageAlert() {
  const inventory = await findInventoryById(DEMO_ONION_INVENTORY_ID);

  if (!inventory) {
    throw new Error("The demo onion inventory lot was not found.");
  }

  const forcedSpoilage = buildForcedSpoilageScore();
  const refreshed = await refreshInventoryRiskAssessment(
    DEMO_ONION_INVENTORY_ID,
    forcedSpoilage,
  );
  const recommendations = await generateRecommendationsForInventory(
    DEMO_ONION_INVENTORY_ID,
    {
      force: true,
    },
  );
  const owner = await findUserById(DEMO_FPO_OWNER_ID);
  const language = owner?.preferredLanguage ?? "en";
  const leadRecommendation = recommendations[0] ?? null;
  const alert = await createNotification({
    userId: DEMO_FPO_OWNER_ID,
    channel: "WHATSAPP",
    kind: "SPOILAGE_ALERT",
    title: `${inventory.cropName} demo alert`,
    message: `${inventory.cropName} lot in ${inventory.district} is now critical. Move within 24 hours.${leadRecommendation ? ` Best route: ${leadRecommendation.targetDistrict} for about Rs ${Math.round(leadRecommendation.netProfitPerKgInr ?? 0)}/kg net.` : ""}`,
    language,
    payload: {
      inventoryId: inventory.id,
      forced: true,
      recommendationId: leadRecommendation?.id ?? null,
    },
  });
  const report = await createNotification({
    userId: DEMO_FPO_OWNER_ID,
    channel: "EMAIL",
    kind: "FPO_DAILY_REPORT",
    title: "Demo spoilage escalation",
    message: `Suresh's Guntur onion lot is now critical in the demo path. ${leadRecommendation ? `${leadRecommendation.targetDistrict} is the lead movement route.` : "Review the movement board immediately."}`,
    language,
    payload: {
      inventoryId: inventory.id,
      recommendationId: leadRecommendation?.id ?? null,
      totalRecommendations: recommendations.length,
    },
  });

  return {
    triggeredAt: new Date().toISOString(),
    inventory: refreshed,
    recommendation: leadRecommendation,
    notifications: [alert, report],
  };
}
