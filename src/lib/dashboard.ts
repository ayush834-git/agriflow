import { TARGET_CROPS, TARGET_REGIONS } from "@/lib/agmarknet/catalog";
import type { PriceGapRecord } from "@/lib/agmarknet/types";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { getDistrictsWithinKm } from "@/lib/geo/distance";
import { listInventory } from "@/lib/inventory/store";
import type { InventoryItem } from "@/lib/inventory/types";
import { listListings } from "@/lib/listings/store";
import type { ListingItem } from "@/lib/listings/types";
import { computePriceGaps, latestPricesForCrop } from "@/lib/market/engine";
import { loadStoredGapsForCrop, loadStoredPricesForCrop } from "@/lib/market/repository";
import { listMatchesForCounterparty, listMatchesForFarmer } from "@/lib/matches/store";
import type { MarketMatch } from "@/lib/matches/types";
import { listNotificationsForUser } from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";
import { listRecommendationsForInventory } from "@/lib/recommendations/store";
import type { MovementRecommendation } from "@/lib/recommendations/types";
import {
  DEMO_FARMER_CROPS,
  DEMO_FARMER_USERS,
  DEMO_FPO_OWNER_ID,
  DEMO_FPO_USERS,
} from "@/lib/users/demo";
import {
  findUserByClerkId,
  listFarmerCropsForUser,
  listFposForDistrict,
} from "@/lib/users/store";
import type { AppUser, FarmerCropPreference } from "@/lib/users/types";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

export type DashboardDistrict = {
  district: string;
  state: string;
};

export type DashboardPricePoint = {
  district: string;
  state: string;
  modalPrice: number;
  marketDate: string;
  arrivalsTonnes: number | null;
};

export type DashboardRoute = Pick<
  PriceGapRecord,
  | "sourceDistrict"
  | "sourceState"
  | "sourceModalPrice"
  | "targetDistrict"
  | "targetState"
  | "targetModalPrice"
  | "priceGap"
  | "opportunityScore"
  | "transportFeasibility"
  | "demandStrength"
>;

export type DashboardCropView = {
  slug: string;
  name: string;
  prices: DashboardPricePoint[];
  routes: DashboardRoute[];
  averageModalPrice: number;
  topOpportunityScore: number;
};

export type SharedDashboardData = {
  generatedAt: string;
  source: "live" | "mock";
  warnings: string[];
  defaultCropSlug: string;
  districts: DashboardDistrict[];
  nearbyDistricts: string[];
  crops: DashboardCropView[];
};

export type FarmerDashboardProfile = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  district: string | null;
  state: string | null;
  preferredLanguage: SupportedLanguage;
  whatsappBotLanguage?: SupportedLanguage;
};

export type FarmerDashboardData = SharedDashboardData & {
  profile: FarmerDashboardProfile;
  cropPreferences: FarmerCropPreference[];
  notifications: AppNotification[];
  matches: MarketMatch[];
  listings: ListingItem[];
  fpos: AppUser[];
};

export type FpoDashboardOwner = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  organizationName: string;
  districtsServed: string[];
  cropsHandled: string[];
  preferredLanguage: SupportedLanguage;
  whatsappBotLanguage?: SupportedLanguage;
  serviceRadiusKm?: number | null;
  serviceSummary?: string | null;
  state: string | null;
};

export type FpoDashboardData = SharedDashboardData & {
  owner: FpoDashboardOwner;
  inventory: InventoryItem[];
  recommendations: MovementRecommendation[];
  directoryListings: ListingItem[];
  notifications: AppNotification[];
  matches: MarketMatch[];
  metrics: {
    activeInventoryCount: number;
    urgentInventoryCount: number;
    criticalInventoryCount: number;
    atRiskQuantityKg: number;
    recommendationCount: number;
    liveMatchCount: number;
  };
};

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function buildSharedDashboardData(
  selectedCropSlugs: string[],
  options?: { nearbyDistricts?: string[] },
): Promise<SharedDashboardData> {
  const hasPersistentPriceStore = hasSupabaseWriteConfig();
  const nearbyDistricts = options?.nearbyDistricts ?? [];
  
  if (!selectedCropSlugs || selectedCropSlugs.length === 0) {
    selectedCropSlugs = [TARGET_CROPS[0].slug];
  }

  const requestedCrops = TARGET_CROPS.filter((c) => selectedCropSlugs.includes(c.slug));
  const fallbackCrops = requestedCrops.length > 0 ? requestedCrops : [TARGET_CROPS[0]];

  // Load stored prices and routes directly from cache / database snapshot (NO external blocking API calls)
  const cropsData = await Promise.all(
    fallbackCrops.map(async (crop) => {
      const [cropRecords, storedRoutes] = await Promise.all([
        loadStoredPricesForCrop(crop.slug),
        loadStoredGapsForCrop(crop.slug, 8),
      ]);

      const scopedRecords =
        nearbyDistricts.length > 0
          ? cropRecords.filter((r) => nearbyDistricts.includes(r.district))
          : cropRecords;
      const recordsToUse = scopedRecords.length > 0 ? scopedRecords : cropRecords;

      const prices = latestPricesForCrop(recordsToUse, crop.slug).map((record) => ({
        district: record.district,
        state: record.state,
        modalPrice: record.modalPrice,
        marketDate: record.marketDate,
        arrivalsTonnes: record.arrivalsTonnes,
      }));

      const routeSource =
        storedRoutes.length > 0
          ? storedRoutes
          : computePriceGaps(cropRecords, {
              maxSourceDistricts: 5,
              maxTargetDistricts: 5,
              maxPairsPerCrop: 8,
            }).filter((route) => route.cropSlug === crop.slug);

      const filteredRoutes =
        nearbyDistricts.length > 0
          ? routeSource.filter((route) => nearbyDistricts.includes(route.sourceDistrict))
          : routeSource;
      const routesToUse = filteredRoutes.length > 0 ? filteredRoutes : routeSource;
      const routes = routesToUse.map((route) => ({
        sourceDistrict: route.sourceDistrict,
        sourceState: route.sourceState,
        sourceModalPrice: route.sourceModalPrice,
        targetDistrict: route.targetDistrict,
        targetState: route.targetState,
        targetModalPrice: route.targetModalPrice,
        priceGap: route.priceGap,
        opportunityScore: route.opportunityScore,
        transportFeasibility: route.transportFeasibility,
        demandStrength: route.demandStrength,
      }));

      if (prices.length === 0) {
        return null;
      }

      const averageModalPrice =
        prices.reduce((sum, record) => sum + record.modalPrice, 0) / prices.length;
      const topOpportunityScore = routes[0]?.opportunityScore ?? 0;

      return {
        slug: crop.slug,
        name: crop.name,
        prices,
        routes,
        averageModalPrice: round(averageModalPrice),
        topOpportunityScore,
      } satisfies DashboardCropView;
    }),
  );

  const crops = cropsData
    .filter((crop): crop is DashboardCropView => crop !== null)
    .sort((left, right) => {
      if (right.topOpportunityScore !== left.topOpportunityScore) {
        return right.topOpportunityScore - left.topOpportunityScore;
      }

      return right.averageModalPrice - left.averageModalPrice;
    });

  return {
    generatedAt: new Date().toISOString(),
    source: hasPersistentPriceStore ? "live" : "mock",
    warnings: hasPersistentPriceStore
      ? []
      : ["Using seeded demo data because no persistent price store is configured."],
    defaultCropSlug: crops[0]?.slug ?? fallbackCrops[0].slug,
    nearbyDistricts,
    districts: TARGET_REGIONS.flatMap((region) =>
      region.districts.map((district) => ({
        district,
        state: region.state,
      })),
    ),
    crops,
  };
}

export async function buildFarmerDashboardData(
  userOrClerkId?: string | AppUser | null,
): Promise<FarmerDashboardData> {
  const authenticated: AppUser | null =
    userOrClerkId && typeof userOrClerkId === "object"
      ? userOrClerkId
      : typeof userOrClerkId === "string"
        ? await findUserByClerkId(userOrClerkId)
        : null;
  
  // Fall back to demo farmer if no real profile is found
  const isDemo = !authenticated || authenticated.role !== "FARMER";
  const activeFarmer: AppUser = isDemo
    ? { ...DEMO_FARMER_USERS[0], whatsappBotLanguage: undefined, address: null }
    : authenticated!;

  const cropPreferences = isDemo
    ? (DEMO_FARMER_CROPS[DEMO_FARMER_USERS[0].id] ?? [])
    : await listFarmerCropsForUser(activeFarmer.id);

  const profile: FarmerDashboardProfile = {
    id: activeFarmer.id,
    fullName: activeFarmer.fullName,
    phone: activeFarmer.phone ?? null,
    email: activeFarmer.email ?? null,
    address: activeFarmer.address ?? null,
    district: activeFarmer.district ?? null,
    state: activeFarmer.state ?? null,
    preferredLanguage: activeFarmer.preferredLanguage ?? "te",
    whatsappBotLanguage:
      activeFarmer.whatsappBotLanguage ?? activeFarmer.preferredLanguage ?? "te",
  };

  const targetCropSlug = cropPreferences[0]?.cropSlug ?? TARGET_CROPS[0].slug;

  const [baseData, fetchedNotifications, fetchedMatches, fetchedListings, fpos] = await Promise.all([
    buildSharedDashboardData(
      cropPreferences.map((c) => c.cropSlug),
      {
        nearbyDistricts: activeFarmer.district
          ? getDistrictsWithinKm(activeFarmer.district, 100)
          : [],
      },
    ),
    listNotificationsForUser(profile.id, 6).catch(() => []),
    listMatchesForFarmer(profile.id, 6).catch(() => []),
    listListings({
      farmerUserId: profile.id,
      statuses: ["ACTIVE", "MATCHED"],
    }).catch(() => []),
    listFposForDistrict({
      district: profile.district,
      cropSlug: targetCropSlug,
    }).catch(() => []),
  ]);

  let notifications = fetchedNotifications;
  let matches = fetchedMatches;
  let listings = fetchedListings;

  // If in demo mode and database has no records for demo user, provide populated sample data
  if (isDemo) {
    if (listings.length === 0) {
      listings = [
        {
          id: "00000000-0000-0000-0000-000000000101",
          farmerUserId: profile.id,
          cropSlug: "tomato",
          cropName: "Tomato",
          quantityKg: 2500,
          askingPricePerKg: 14,
          qualityGrade: "A",
          district: profile.district ?? "Kurnool",
          state: profile.state ?? "Andhra Pradesh",
          availableFrom: "2026-04-08",
          availableUntil: "2026-04-15",
          status: "ACTIVE",
          notes: "Fresh harvest ready for pickup.",
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    if (matches.length === 0) {
      matches = [
        {
          id: "00000000-0000-0000-0000-000000000201",
          listingId: listings[0]?.id ?? null,
          inventoryId: null,
          farmerUserId: profile.id,
          counterpartyUserId: DEMO_FPO_OWNER_ID,
          cropSlug: "tomato",
          cropName: "Tomato",
          quantityKg: 2000,
          offeredPricePerKg: 16,
          matchScore: 94,
          status: "CONTACTED",
          conversationChannel: "WHATSAPP",
          notes: "FPO offers ₹16/kg for 2,000kg tomato dispatched to Hyderabad.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    if (notifications.length === 0) {
      notifications = [
        {
          id: "00000000-0000-0000-0000-000000000301",
          userId: profile.id,
          channel: "WHATSAPP",
          kind: "PRICE_SPIKE",
          title: "Price Alert: Tomato",
          message: "Tomato price jumped to ₹18/kg in Hyderabad mandi. Potential ₹6/kg extra margin available.",
          language: profile.preferredLanguage,
          deliveryStatus: "SENT",
          payload: { cropSlug: "tomato", modalPrice: 1800 },
          createdAt: new Date().toISOString(),
        },
      ];
    }
  }

  return {
    ...baseData,
    profile,
    cropPreferences,
    notifications,
    matches,
    listings,
    fpos,
  };
}

export async function buildFpoDashboardData(
  userOrClerkId?: string | AppUser | null,
): Promise<FpoDashboardData> {
  const authenticated: AppUser | null =
    userOrClerkId && typeof userOrClerkId === "object"
      ? userOrClerkId
      : typeof userOrClerkId === "string"
        ? await findUserByClerkId(userOrClerkId)
        : null;

  // Fall back to demo FPO if no real profile is found
  const isDemo = !authenticated || authenticated.role !== "FPO";
  const registeredOwner: AppUser = isDemo
    ? { ...DEMO_FPO_USERS[0], whatsappBotLanguage: undefined, address: null }
    : authenticated!;

  const owner: FpoDashboardOwner = {
    id: registeredOwner.id,
    fullName: registeredOwner.fullName,
    phone: registeredOwner.phone ?? null,
    email: registeredOwner.email ?? null,
    address: registeredOwner.address ?? null,
    organizationName:
      registeredOwner.organizationName ?? "Registered FPO workspace",
    districtsServed: registeredOwner.districtsServed,
    cropsHandled: registeredOwner.cropsHandled,
    preferredLanguage: registeredOwner.preferredLanguage ?? "en",
    whatsappBotLanguage:
      registeredOwner.whatsappBotLanguage ??
      registeredOwner.preferredLanguage ??
      "en",
    serviceRadiusKm: registeredOwner.serviceRadiusKm ?? null,
    serviceSummary: registeredOwner.serviceSummary ?? null,
    state: registeredOwner.state ?? null,
  };

  const nearbyDistricts =
    owner.districtsServed.length > 0
      ? owner.districtsServed
          .flatMap((d) => getDistrictsWithinKm(d, owner.serviceRadiusKm ?? 200))
          .filter((v, i, a) => a.indexOf(v) === i)
      : [];

  const [baseData, inventory, directoryListings, notifications, matches] =
    await Promise.all([
      buildSharedDashboardData(owner.cropsHandled, { nearbyDistricts }),
      listInventory(owner.id),
      listListings({
        statuses: ["ACTIVE", "MATCHED"],
      }),
      listNotificationsForUser(owner.id, 8),
      listMatchesForCounterparty(owner.id, 8),
    ]);
  const recommendations = (
    await Promise.all(
      inventory.map((item) => listRecommendationsForInventory(item.id)),
    )
  )
    .flat()
    .sort(
      (left, right) =>
        (right.totalNetProfitInr ?? 0) - (left.totalNetProfitInr ?? 0),
    );

  return {
    ...baseData,
    owner,
    inventory,
    recommendations,
    directoryListings,
    notifications,
    matches,
    metrics: {
      activeInventoryCount: inventory.filter((item) => item.status === "ACTIVE").length,
      urgentInventoryCount: inventory.filter(
        (item) => item.spoilageLevel === "HIGH" || item.spoilageLevel === "CRITICAL",
      ).length,
      criticalInventoryCount: inventory.filter(
        (item) => item.spoilageLevel === "CRITICAL",
      ).length,
      atRiskQuantityKg: inventory
        .filter((item) => item.spoilageLevel !== "LOW")
        .reduce((sum, item) => sum + item.quantityKg, 0),
      recommendationCount: recommendations.length,
      liveMatchCount: matches.filter(
        (match) => match.status === "CONTACTED" || match.status === "ACCEPTED",
      ).length,
    },
  };
}
