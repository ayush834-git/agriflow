import { unstable_cache } from "next/cache";
import { TARGET_CROPS, TARGET_REGIONS } from "@/lib/agmarknet/catalog";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import type { PriceGapRecord } from "@/lib/agmarknet/types";
import { listInventory } from "@/lib/inventory/store";
import type { InventoryItem } from "@/lib/inventory/types";
import { listListings } from "@/lib/listings/store";
import type { ListingItem } from "@/lib/listings/types";
import { computePriceGaps, latestPricesForCrop } from "@/lib/market/engine";
import { loadStoredGapsForCrop } from "@/lib/market/repository";
import { listMatchesForCounterparty, listMatchesForFarmer } from "@/lib/matches/store";
import type { MarketMatch } from "@/lib/matches/types";
import { listNotificationsForUser } from "@/lib/notifications/store";
import type { AppNotification } from "@/lib/notifications/types";
import { generateRecommendationsForOwner } from "@/lib/recommendations/engine";
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

async function _buildSharedDashboardData(): Promise<SharedDashboardData> {
  const feed = await resolveAgmarknetFeed({
    historyDays: 7,
    mode: "auto",
  });
  const computedRoutes = computePriceGaps(feed.records, {
    maxSourceDistricts: 5,
    maxTargetDistricts: 5,
    maxPairsPerCrop: 8,
  });

  const crops = (await Promise.all(
    TARGET_CROPS.map(async (crop) => {
      const prices = latestPricesForCrop(feed.records, crop.slug).map((record) => ({
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
    source: feed.source,
    warnings: feed.warnings,
    defaultCropSlug: crops[0]?.slug ?? TARGET_CROPS[0].slug,
    districts: TARGET_REGIONS.flatMap((region) =>
      region.districts.map((district) => ({
        district,
        state: region.state,
      })),
    ),
    crops,
  };
}

const buildSharedDashboardData = unstable_cache(
  async () => _buildSharedDashboardData(),
  ["agriflow-shared-dashboard-v2"],
  { revalidate: 300 }
);

export async function buildFarmerDashboardData(clerkUserId?: string | null): Promise<FarmerDashboardData> {
  const baseData = await buildSharedDashboardData();
  const farmerEntries = await listFarmersWithCrops();
  const fallbackFarmer = farmerEntries[0]?.user ?? DEMO_FARMER_USERS[0];

  let activeFarmer = fallbackFarmer;

  if (clerkUserId) {
    const authenticated = await findUserByClerkId(clerkUserId);
    if (authenticated && authenticated.role === "FARMER") {
      activeFarmer = authenticated;
    }
  }

  const activeFarmerEntry = farmerEntries.find(
    (entry) => entry.user.id === activeFarmer.id,
  );
  const cropPreferences =
    activeFarmerEntry?.crops ?? (await listFarmerCropsForUser(activeFarmer.id));

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

  const [notifications, matches, listings] = await Promise.all([
    listNotificationsForUser(profile.id, 6),
    listMatchesForFarmer(profile.id, 6),
    listListings({
      farmerUserId: profile.id,
      statuses: ["ACTIVE", "MATCHED"],
    }),
  ]);
  const fpos = await listFposForDistrict({
    district: profile.district,
    cropSlug: baseData.defaultCropSlug,
  });

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
  const [baseData, fpoUsers] = await Promise.all([
    buildSharedDashboardData(),
    listUsersByRole("FPO"),
  ]);
  
  let registeredOwner = fpoUsers[0];
  
  if (clerkUserId) {
    const authenticated = await findUserByClerkId(clerkUserId);
    if (authenticated && authenticated.role === "FPO") {
      registeredOwner = authenticated;
    }
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
  const [inventory, recommendations, directoryListings, notifications, matches] =
    await Promise.all([
      listInventory(owner.id),
      generateRecommendationsForOwner(owner.id),
      listListings({
        statuses: ["ACTIVE", "MATCHED"],
      }),
      listNotificationsForUser(owner.id, 8),
      listMatchesForCounterparty(owner.id, 8),
    ]);

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
