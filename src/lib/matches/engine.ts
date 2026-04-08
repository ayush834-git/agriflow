import {
  findInventoryById,
} from "@/lib/inventory/store";
import {
  findListingById,
  listListings,
  updateListingStatus,
} from "@/lib/listings/store";
import type { ListingItem } from "@/lib/listings/types";
import {
  createMatch,
  listMatchesForFarmer,
  updateMatchStatus,
} from "@/lib/matches/store";
import type {
  DirectoryCandidate,
} from "@/lib/matches/types";
import {
  getFreshnessLabel,
  scoreListingAgainstInventory,
} from "@/lib/matches/scoring";
import { createNotification } from "@/lib/notifications/store";
import {
  DEMO_FARMER_DEFAULT_ID,
  DEMO_FPO_CONTACT,
  DEMO_FPO_OWNER_ID,
} from "@/lib/users/demo";
import { findUserById } from "@/lib/users/store";
import type { SupportedLanguage } from "@/lib/whatsapp/types";
import {
  getWhatsAppSession,
  saveWhatsAppSession,
  touchSession,
} from "@/lib/whatsapp/session-store";

async function buildCounterpartyContact(counterpartyUserId?: string | null) {
  if (!counterpartyUserId || counterpartyUserId === DEMO_FPO_OWNER_ID) {
    return DEMO_FPO_CONTACT;
  }

  const user = await findUserById(counterpartyUserId);

  if (!user) {
    return DEMO_FPO_CONTACT;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    organizationName: user.organizationName ?? "AgriFlow counterparty",
    phone: user.phone ?? DEMO_FPO_CONTACT.phone,
    email: user.email ?? DEMO_FPO_CONTACT.email,
    district: user.district ?? DEMO_FPO_CONTACT.district,
    state: user.state ?? DEMO_FPO_CONTACT.state,
  };
}

async function buildFarmerContact(farmerUserId?: string | null) {
  if (!farmerUserId) {
    return null;
  }

  return findUserById(farmerUserId);
}

function formatMatchInterestMessage(
  listing: ListingItem,
  language: SupportedLanguage,
) {
  const quantity = Math.round(listing.quantityKg).toLocaleString("en-IN");
  const offer = listing.askingPricePerKg
    ? ` at ₹${listing.askingPricePerKg}/kg`
    : "";

  if (language === "te") {
    return `Mee ${quantity}kg ${listing.cropName} ki oka buyer interest chupistunnadu${offer}. Connect avvalante YES ani reply ivvandi.`;
  }

  if (language === "hi") {
    return `Aapke ${quantity}kg ${listing.cropName} ke liye ek buyer interested hai${offer}. Connect karne ke liye YES reply kijiye.`;
  }

  if (language === "kn") {
    return `Nimma ${quantity}kg ${listing.cropName} ge buyer interest ide${offer}. Connect maadalu YES endu reply madi.`;
  }

  return `A buyer is interested in your ${quantity}kg ${listing.cropName}${offer}. Reply YES to connect.`;
}

function formatAcceptedMessage(
  language: SupportedLanguage,
  cropName: string,
  contact: { fullName: string; phone?: string | null; organizationName?: string | null },
) {
  const phone = contact.phone ?? DEMO_FPO_CONTACT.phone;

  if (language === "te") {
    return `${cropName} match confirmed. ${contact.organizationName ?? contact.fullName} contact: ${contact.fullName}, ${phone}.`;
  }

  if (language === "hi") {
    return `${cropName} match confirm ho gaya. ${contact.organizationName ?? contact.fullName} contact: ${contact.fullName}, ${phone}.`;
  }

  if (language === "kn") {
    return `${cropName} match confirm aagide. ${contact.organizationName ?? contact.fullName} contact: ${contact.fullName}, ${phone}.`;
  }

  return `${cropName} match confirmed. Contact ${contact.fullName} at ${phone}.`;
}

export async function scoreDirectoryForInventory(
  inventoryId: string,
  filters?: { district?: string; cropSlug?: string; minQuantityKg?: number; maxQuantityKg?: number },
) {
  const inventory = await findInventoryById(inventoryId);

  if (!inventory) {
    throw new Error(`Inventory ${inventoryId} was not found.`);
  }

  const listings = await listListings({
    cropSlug: filters?.cropSlug ?? inventory.cropSlug,
    district: filters?.district,
    minQuantityKg: filters?.minQuantityKg,
    maxQuantityKg: filters?.maxQuantityKg,
    statuses: ["ACTIVE", "MATCHED"],
  });

  const candidates = await Promise.all(
    listings.map(async (listing) => {
      const farmer = await buildFarmerContact(listing.farmerUserId);
      const score = scoreListingAgainstInventory(listing, inventory);

      return {
        listingId: listing.id,
        farmerUserId: listing.farmerUserId,
        farmerName: farmer?.fullName ?? "Farmer",
        farmerPhone: farmer?.phone ?? null,
        cropSlug: listing.cropSlug,
        cropName: listing.cropName,
        quantityKg: listing.quantityKg,
        askingPricePerKg: listing.askingPricePerKg,
        qualityGrade: listing.qualityGrade,
        district: listing.district,
        state: listing.state,
        freshnessLabel: getFreshnessLabel(listing),
        distanceKm: score.distanceKm,
        matchScore: score.matchScore,
        scoreBreakdown: score.scoreBreakdown,
        notes: listing.notes,
      } satisfies DirectoryCandidate;
    }),
  );

  return candidates.sort((left, right) => right.matchScore - left.matchScore);
}

export async function connectListingMatch(params: {
  listingId: string;
  inventoryId?: string;
  counterpartyUserId?: string;
}) {
  const listing = await findListingById(params.listingId);

  if (!listing) {
    throw new Error(`Listing ${params.listingId} was not found.`);
  }

  const inventory = params.inventoryId ? await findInventoryById(params.inventoryId) : null;
  const score = inventory ? scoreListingAgainstInventory(listing, inventory) : null;
  const match = await createMatch({
    listingId: listing.id,
    inventoryId: inventory?.id,
    farmerUserId: listing.farmerUserId,
    counterpartyUserId: params.counterpartyUserId ?? DEMO_FPO_OWNER_ID,
    cropSlug: listing.cropSlug,
    cropName: listing.cropName,
    quantityKg: Math.min(listing.quantityKg, inventory?.quantityKg ?? listing.quantityKg),
    offeredPricePerKg: listing.askingPricePerKg ?? undefined,
    matchScore: score?.matchScore,
    conversationChannel: "WHATSAPP",
    notes: inventory
      ? `Connected from ${inventory.district} inventory board for ${inventory.cropName}.`
      : "Connected from the FPO buyer directory.",
  });
  await updateListingStatus(listing.id, "MATCHED");

  const farmer = await buildFarmerContact(listing.farmerUserId);
  const farmerLanguage = farmer?.preferredLanguage ?? "te";
  const notification = await createNotification({
    userId: listing.farmerUserId,
    channel: "WHATSAPP",
    kind: "MATCH_INTEREST",
    title: "New buyer interest",
    message: formatMatchInterestMessage(listing, farmerLanguage),
    language: farmerLanguage,
    payload: {
      matchId: match.id,
      listingId: listing.id,
      inventoryId: inventory?.id ?? null,
    },
  });

  if (farmer?.phone) {
    const session = await getWhatsAppSession(farmer.phone);
    await saveWhatsAppSession(
      touchSession(session, {
        userId: farmer.id,
        state: "AWAITING_MATCH_CONFIRMATION",
        language: farmer.preferredLanguage,
        context: {
          pendingMatchId: match.id,
        },
      }),
    );
  }

  return {
    match,
    notification,
  };
}

export async function acceptPendingMatchForFarmer(
  farmerUserId: string,
  matchId?: string,
) {
  const pendingMatches = await listMatchesForFarmer(farmerUserId, 20);
  const target =
    (matchId
      ? pendingMatches.find((entry) => entry.id === matchId)
      : pendingMatches.find(
          (entry) => entry.status === "CONTACTED" || entry.status === "OPEN",
        )) ?? null;

  if (!target) {
    return null;
  }

  const match = await updateMatchStatus(target.id, "ACCEPTED");
  if (match.listingId) {
    await updateListingStatus(match.listingId, "MATCHED");
  }

  const farmer = await buildFarmerContact(match.farmerUserId);
  const counterparty = await buildCounterpartyContact(match.counterpartyUserId);
  const farmerLanguage = farmer?.preferredLanguage ?? "te";
  const farmerMessage = formatAcceptedMessage(farmerLanguage, match.cropName, counterparty);

  const farmerNotification = await createNotification({
    userId: farmerUserId,
    channel: "WHATSAPP",
    kind: "MATCH_ACCEPTED",
    title: "Match accepted",
    message: farmerMessage,
    language: farmerLanguage,
    payload: {
      matchId: match.id,
      contactPhone: counterparty.phone,
      contactName: counterparty.fullName,
    },
  });

  const counterpartyNotification = match.counterpartyUserId
    ? await createNotification({
        userId: match.counterpartyUserId,
        channel: "WHATSAPP",
        kind: "MATCH_ACCEPTED",
        title: "Farmer confirmed interest",
        message: `${farmer?.fullName ?? "Farmer"} accepted the ${match.cropName} match. Contact: ${farmer?.phone ?? "not available"}.`,
        language: "en",
        payload: {
          matchId: match.id,
          farmerPhone: farmer?.phone,
          farmerName: farmer?.fullName,
        },
      })
    : null;

  return {
    match,
    farmerMessage,
    farmerNotification,
    counterpartyNotification,
  };
}

export async function ensureDemoMatchInterest() {
  const current = await listMatchesForFarmer(DEMO_FARMER_DEFAULT_ID, 1);

  if (current.length > 0) {
    return current[0];
  }

  const { match } = await connectListingMatch({
    listingId: "demo-listing-tomato-kurnool",
    counterpartyUserId: DEMO_FPO_OWNER_ID,
  });

  return match;
}
