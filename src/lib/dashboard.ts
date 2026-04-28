import { TARGET_CROPS, TARGET_REGIONS } from "@/lib/agmarknet/catalog";
import type { PriceGapRecord, NormalizedMandiPriceRecord } from "@/lib/agmarknet/types";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { listDemoMarketRecords } from "@/lib/demo/market";
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
  DEMO_FARMER_DEFAULT_ID,
  DEMO_FARMER_USERS,
  DEMO_FPO_CONTACT,
  DEMO_FPO_OWNER_ID,
  DEMO_FPO_USERS,
} from "@/lib/users/demo";
import {
  findUserByClerkId,
  listFarmerCropsForUser,
  listFarmersWithCrops,
  listFposForDistrict,
  listUsersByRole,
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

  const feedResult = await resolveAgmarknetFeed({
    cropSlugs: fallbackCrops.map(c => c.slug),
    historyDays: 3,
    mode: "auto",
  });

  const usedDemoFallback = feedResult.source === "mock";
  const recordsByCrop = new Map<string, NormalizedMandiPriceRecord[]>();
  
  for (const record of feedResult.records) {
    const arr = recordsByCrop.get(record.cropSlug) ?? [];
    arr.push(record);
    recordsByCrop.set(record.cropSlug, arr);
  }

  const allPriceRecords = feedResult.records;
  const computedRoutes = computePriceGaps(allPriceRecords, {
    maxSourceDistricts: 5,
    maxTargetDistricts: 5,
    maxPairsPerCrop: 8,
  });

  const crops = (await Promise.all(
    fallbackCrops.map(async (crop) => {
      const cropRecords = recordsByCrop.get(crop.slug) ?? [];
      // Filter to nearby districts if we have them, fallback to all records
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
      const storedRoutes = await loadStoredGapsForCrop(crop.slug, 8);
      const routeSource =
        storedRoutes.length > 0
          ? storedRoutes
          : computedRoutes.filter((route) => route.cropSlug === crop.slug);
      // Filter routes whose source is in nearby districts when available
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
  ))
    .filter((crop): crop is DashboardCropView => crop !== null)
    .sort((left, right) => {
      if (right.topOpportunityScore !== left.topOpportunityScore) {
        return right.topOpportunityScore - left.topOpportunityScore;
      }

      return right.averageModalPrice - left.averageModalPrice;
    });

  return {
    generatedAt: new Date().toISOString(),
    source: usedDemoFallback ? "mock" : "live",
    warnings: usedDemoFallback
      ? [
          hasPersistentPriceStore
            ? "Some feed fetches missed, causing demo fallbacks for continuity."
            : "Using seeded demo data because no persistent price store is configured.",
          ...feedResult.warnings,
        ]
      : feedResult.warnings,
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

export async function buildFarmerDashboardData(clerkUserId?: string | null): Promise<FarmerDashboardData> {
  const authenticated = clerkUserId ? await findUserByClerkId(clerkUserId) : null;
  
  // Fall back to demo farmer if no real profile is found
  const isDemo = !authenticated || authenticated.role !== "FARMER";
  const activeFarmer: AppUser = isDemo
    ? { ...DEMO_FARMER_USERS[0], whatsappBotLanguage: undefined, address: null }
    : authenticated!;

  const cropPreferences = isDemo
    ? (DEMO_FARMER_CROPS[DEMO_FARMER_USERS[0].id] ?? [])
    : await listFarmerCropsForUser(activeFarmer.id);

  const baseData = await buildSharedDashboardData(
    cropPreferences.map(c => c.cropSlug),
    {
      nearbyDistricts: activeFarmer.district
        ? getDistrictsWithinKm(activeFarmer.district, 100)
        : [],
    },
  );

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

  // Skip UUID-dependent DB calls when using demo profile (demo IDs are not valid UUIDs)
  const [notifications, matches, listings, fpos] = isDemo
    ? [[], [], [], []]
    : await Promise.all([
        listNotificationsForUser(profile.id, 6),
        listMatchesForFarmer(profile.id, 6),
        listListings({
          farmerUserId: profile.id,
          statuses: ["ACTIVE", "MATCHED"],
        }),
        listFposForDistrict({
          district: profile.district,
          cropSlug: baseData.defaultCropSlug,
        }),
      ]);

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

export async function buildFpoDashboardData(clerkUserId?: string | null): Promise<FpoDashboardData> {
  const authenticated = clerkUserId ? await findUserByClerkId(clerkUserId) : null;

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

  const baseData = await buildSharedDashboardData(
    owner.cropsHandled,
    {
      nearbyDistricts: owner.districtsServed.length > 0
        ? owner.districtsServed.flatMap((d) =>
            getDistrictsWithinKm(d, owner.serviceRadiusKm ?? 200)
          ).filter((v, i, a) => a.indexOf(v) === i)
        : [],
    },
  );

  // Skip UUID-dependent DB calls when using demo profile (demo IDs are not valid UUIDs)
  if (isDemo) {
    return {
      ...baseData,
      owner,
      inventory: [],
      recommendations: [],
      directoryListings: [],
      notifications: [],
      matches: [],
      metrics: {
        activeInventoryCount: 0,
        urgentInventoryCount: 0,
        criticalInventoryCount: 0,
        atRiskQuantityKg: 0,
        recommendationCount: 0,
        liveMatchCount: 0,
      },
    };
  }

  const [inventory, directoryListings, notifications, matches] =
    await Promise.all([
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
