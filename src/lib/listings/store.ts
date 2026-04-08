import { randomUUID } from "node:crypto";

import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_FARMER_DEFAULT_ID,
  DEMO_FARMER_USERS,
} from "@/lib/users/demo";
import type {
  AddListingPayload,
  ListingItem,
  ListingSearchFilters,
  ListingStatus,
} from "@/lib/listings/types";

declare global {
  var __agriflowListings: Map<string, ListingItem> | undefined;
}

type PersistedListingRow = {
  id: string;
  farmer_user_id: string;
  crop_slug: string;
  crop_name: string;
  quantity_kg: number;
  asking_price_per_kg: number | null;
  quality_grade: string | null;
  district: string;
  state: string;
  available_from: string | null;
  available_until: string | null;
  status: ListingStatus;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function getListingStore() {
  if (!globalThis.__agriflowListings) {
    globalThis.__agriflowListings = new Map<string, ListingItem>();
    seedDemoListings(globalThis.__agriflowListings);
  }

  return globalThis.__agriflowListings;
}

function mapListingRow(row: PersistedListingRow): ListingItem {
  return {
    id: row.id,
    farmerUserId: row.farmer_user_id,
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    quantityKg: row.quantity_kg,
    askingPricePerKg: row.asking_price_per_kg,
    qualityGrade: row.quality_grade,
    district: row.district,
    state: row.state,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    status: row.status,
    notes: row.notes,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildListingItem(
  payload: AddListingPayload,
  overrides?: Partial<ListingItem>,
): ListingItem {
  const crop = getTargetCropOrThrow(payload.cropSlug);
  const now = overrides?.createdAt ?? new Date().toISOString();

  return {
    id: overrides?.id ?? randomUUID(),
    farmerUserId: payload.farmerUserId,
    cropSlug: crop.slug,
    cropName: crop.name,
    quantityKg: payload.quantityKg,
    askingPricePerKg: payload.askingPricePerKg ?? null,
    qualityGrade: payload.qualityGrade ?? "A",
    district: payload.district,
    state: payload.state,
    availableFrom: payload.availableFrom ?? now.slice(0, 10),
    availableUntil: payload.availableUntil ?? null,
    status: overrides?.status ?? "ACTIVE",
    notes: payload.notes ?? null,
    metadata: overrides?.metadata ?? {},
    createdAt: now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

function seedDemoListings(store: Map<string, ListingItem>) {
  const states = new Map(DEMO_FARMER_USERS.map((user) => [user.id, user.state ?? ""]));
  const seed: Array<{ id: string; payload: AddListingPayload; status?: ListingStatus }> = [
    {
      id: "demo-listing-tomato-kurnool",
      payload: {
        farmerUserId: DEMO_FARMER_DEFAULT_ID,
        cropSlug: "tomato",
        quantityKg: 300,
        askingPricePerKg: 12,
        qualityGrade: "A",
        district: "Kurnool",
        state: states.get(DEMO_FARMER_DEFAULT_ID) ?? "Andhra Pradesh",
        availableFrom: "2026-04-08",
        availableUntil: "2026-04-10",
        notes: "Fresh harvest ready for pickup tomorrow morning.",
      },
    },
    {
      id: "demo-listing-onion-ballari",
      payload: {
        farmerUserId: "demo-farmer-ramesh",
        cropSlug: "onion",
        quantityKg: 5200,
        askingPricePerKg: 21,
        qualityGrade: "A",
        district: "Ballari",
        state: states.get("demo-farmer-ramesh") ?? "Karnataka",
        availableFrom: "2026-04-08",
        availableUntil: "2026-04-12",
        notes: "Stored onions with moderate ventilation.",
      },
    },
    {
      id: "demo-listing-chilli-khammam",
      payload: {
        farmerUserId: "demo-farmer-saritha",
        cropSlug: "green-chilli",
        quantityKg: 1800,
        askingPricePerKg: 46,
        qualityGrade: "A+",
        district: "Khammam",
        state: states.get("demo-farmer-saritha") ?? "Telangana",
        availableFrom: "2026-04-08",
        availableUntil: "2026-04-09",
        notes: "Needs dispatch within 24 hours to preserve freshness.",
      },
    },
  ];

  for (const item of seed) {
    store.set(
      item.id,
      buildListingItem(item.payload, {
        id: item.id,
        status: item.status ?? "ACTIVE",
        createdAt: "2026-04-08T05:30:00.000Z",
        updatedAt: "2026-04-08T05:30:00.000Z",
      }),
    );
  }
}

export function resetFallbackListings() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowListings = new Map<string, ListingItem>();
  seedDemoListings(globalThis.__agriflowListings);
}

function filterListings(listings: ListingItem[], filters: ListingSearchFilters = {}) {
  const statuses = filters.statuses ?? ["ACTIVE"];

  return listings
    .filter((listing) =>
      statuses.length > 0 ? statuses.includes(listing.status) : true,
    )
    .filter((listing) => (filters.cropSlug ? listing.cropSlug === filters.cropSlug : true))
    .filter((listing) => (filters.district ? listing.district === filters.district : true))
    .filter((listing) =>
      filters.farmerUserId ? listing.farmerUserId === filters.farmerUserId : true,
    )
    .filter((listing) =>
      filters.minQuantityKg ? listing.quantityKg >= filters.minQuantityKg : true,
    )
    .filter((listing) =>
      filters.maxQuantityKg ? listing.quantityKg <= filters.maxQuantityKg : true,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listListings(filters: ListingSearchFilters = {}) {
  if (!hasSupabaseWriteConfig()) {
    return filterListings(Array.from(getListingStore().values()), filters);
  }

  const admin = getSupabaseAdminClient();
  let query = admin.from("listings").select("*").order("created_at", { ascending: false });

  if (filters.cropSlug) {
    query = query.eq("crop_slug", filters.cropSlug);
  }

  if (filters.district) {
    query = query.eq("district", filters.district);
  }

  if (filters.farmerUserId) {
    query = query.eq("farmer_user_id", filters.farmerUserId);
  }

  if (filters.minQuantityKg) {
    query = query.gte("quantity_kg", filters.minQuantityKg);
  }

  if (filters.maxQuantityKg) {
    query = query.lte("quantity_kg", filters.maxQuantityKg);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else {
    query = query.eq("status", "ACTIVE");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list listings: ${error.message}`);
  }

  return ((data ?? []) as PersistedListingRow[]).map(mapListingRow);
}

export async function findListingById(listingId: string) {
  if (!hasSupabaseWriteConfig() || listingId.startsWith("demo-")) {
    return getListingStore().get(listingId) ?? null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find listing: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapListingRow(data as PersistedListingRow);
}

export async function createListing(payload: AddListingPayload) {
  const listing = buildListingItem(payload);

  if (!hasSupabaseWriteConfig() || listing.farmerUserId.startsWith("demo-")) {
    getListingStore().set(listing.id, listing);
    return listing;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("listings")
    .insert({
      farmer_user_id: listing.farmerUserId,
      crop_slug: listing.cropSlug,
      crop_name: listing.cropName,
      quantity_kg: listing.quantityKg,
      asking_price_per_kg: listing.askingPricePerKg,
      quality_grade: listing.qualityGrade,
      district: listing.district,
      state: listing.state,
      available_from: listing.availableFrom,
      available_until: listing.availableUntil,
      status: listing.status,
      notes: listing.notes,
      metadata: listing.metadata,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create listing: ${error.message}`);
  }

  return mapListingRow(data as PersistedListingRow);
}

export async function updateListingStatus(listingId: string, status: ListingStatus) {
  const current = await findListingById(listingId);

  if (!current) {
    throw new Error(`Listing ${listingId} was not found.`);
  }

  const nextListing: ListingItem = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (!hasSupabaseWriteConfig() || listingId.startsWith("demo-")) {
    getListingStore().set(listingId, nextListing);
    return nextListing;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("listings")
    .update({
      status: nextListing.status,
      updated_at: nextListing.updatedAt,
    } as never)
    .eq("id", listingId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update listing status: ${error.message}`);
  }

  return mapListingRow(data as PersistedListingRow);
}
