import { TARGET_CROPS, TARGET_REGIONS } from "@/lib/agmarknet/catalog";
import type { PriceGapRecord, NormalizedMandiPriceRecord } from "@/lib/agmarknet/types";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { listDemoMarketRecords } from "@/lib/demo/market";
import { hasSupabaseWriteConfig } from "@/lib/env";
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
  DEMO_FARMER_DEFAULT_ID,
  DEMO_FARMER_USERS,
  DEMO_FPO_CONTACT,
  DEMO_FPO_OWNER_ID,
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
  isDemo: boolean;
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
  isDemo: boolean;
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

export async function buildSharedDashboardData(selectedCropSlugs: string[]): Promise<SharedDashboardData> {
  const hasPersistentPriceStore = hasSupabaseWriteConfig();
  
  if (!selectedCropSlugs || selectedCropSlugs.length === 0) {
    selectedCropSlugs = [TARGET_CROPS[0].slug];
  }

  const requestedCrops = TARGET_CROPS.filter((c) => selectedCropSlugs.includes(c.slug));
  const fallbackCrops = requestedCrops.length > 0 ? requestedCrops : [TARGET_CROPS[0]];

  const feedResult = await resolveAgmarknetFeed({
    cropSlugs: fallbackCrops.map(c => c.slug),
    historyDays: 7,
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
      const prices = latestPricesForCrop(cropRecords, crop.slug).map((record) => ({
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
      const routes = routeSource.map((route) => ({
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
  const [farmerEntries, authenticated] = await Promise.all([
    listFarmersWithCrops(),
    clerkUserId ? findUserByClerkId(clerkUserId) : Promise.resolve(null),
  ]);
  const fallbackFarmer = farmerEntries[0]?.user ?? DEMO_FARMER_USERS[0];

  let activeFarmer = fallbackFarmer;

  if (authenticated && authenticated.role === "FARMER") {
    activeFarmer = authenticated;
  }

  const activeFarmerEntry = farmerEntries.find(
    (entry) => entry.user.id === activeFarmer.id,
  );
  const cropPreferences =
    activeFarmerEntry?.crops ?? (await listFarmerCropsForUser(activeFarmer.id));

  const baseData = await buildSharedDashboardData(cropPreferences.map(c => c.cropSlug));

  const profile: FarmerDashboardProfile = {
    id: activeFarmer.id ?? DEMO_FARMER_DEFAULT_ID,
    fullName: activeFarmer.fullName,
    phone: activeFarmer.phone ?? null,
    email: activeFarmer.email ?? null,
    address: activeFarmer.address ?? null,
    district: activeFarmer.district ?? fallbackFarmer.district ?? null,
    state: activeFarmer.state ?? fallbackFarmer.state ?? null,
    preferredLanguage: activeFarmer.preferredLanguage ?? "te",
    whatsappBotLanguage:
      activeFarmer.whatsappBotLanguage ?? activeFarmer.preferredLanguage ?? "te",
    isDemo: activeFarmer.id.startsWith("demo-"),
  };

  const [notifications, matches, listings, fpos] = await Promise.all([
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
  const [fpoUsers, authenticated] = await Promise.all([
    listUsersByRole("FPO"),
    clerkUserId ? findUserByClerkId(clerkUserId) : Promise.resolve(null),
  ]);
  
  let registeredOwner = fpoUsers[0];
  
  if (authenticated && authenticated.role === "FPO") {
    registeredOwner = authenticated;
  }
  const owner: FpoDashboardOwner = registeredOwner
    ? {
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
        isDemo: registeredOwner.id.startsWith("demo-"),
      }
    : {
        id: DEMO_FPO_OWNER_ID,
        fullName: DEMO_FPO_CONTACT.fullName,
        phone: DEMO_FPO_CONTACT.phone,
        email: DEMO_FPO_CONTACT.email,
        address: null,
        organizationName: DEMO_FPO_CONTACT.organizationName,
        districtsServed: ["Guntur", "Kurnool", "Khammam", "Hyderabad"],
        cropsHandled: ["tomato", "onion", "green-chilli", "maize"],
        preferredLanguage: "en",
        whatsappBotLanguage: "en",
        serviceRadiusKm: 180,
        serviceSummary:
          "Aggregation, reefer dispatch, and mandi-side negotiation for perishables across AP and Telangana.",
        state: "Andhra Pradesh",
        isDemo: true,
      };

  const baseData = await buildSharedDashboardData(owner.cropsHandled);

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
