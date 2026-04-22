import { randomUUID } from "node:crypto";

import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { scoreSpoilageRisk } from "@/lib/inventory/scoring";
import type {
  AddInventoryPayload,
  InventoryItem,
  InventoryStatus,
  SpoilageScoreResult,
} from "@/lib/inventory/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEMO_FPO_OWNER_ID as DEMO_FPO_OWNER } from "@/lib/users/demo";

export const DEMO_FPO_OWNER_ID = DEMO_FPO_OWNER;

declare global {
  var __agriflowInventory: Map<string, InventoryItem> | undefined;
}

type PersistedInventoryRow = {
  id: string;
  owner_user_id: string;
  crop_slug: string;
  crop_name: string;
  quantity_kg: number;
  storage_location_name: string | null;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  storage_type: string | null;
  deadline_date: string;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  spoilage_score: number | null;
  spoilage_level: InventoryItem["spoilageLevel"] | null;
  status: InventoryStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function getInventoryStore() {
  if (!globalThis.__agriflowInventory) {
    globalThis.__agriflowInventory = new Map<string, InventoryItem>();
    seedDemoInventory(globalThis.__agriflowInventory);
  }

  return globalThis.__agriflowInventory;
}

function mapInventoryRow(row: PersistedInventoryRow): InventoryItem {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    quantityKg: row.quantity_kg,
    storageLocationName: row.storage_location_name,
    district: row.district,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    storageType: row.storage_type,
    deadlineDate: row.deadline_date,
    temperatureCelsius: row.temperature_celsius,
    humidityPercent: row.humidity_percent,
    spoilageScore: row.spoilage_score ?? 0,
    spoilageLevel: row.spoilage_level ?? "LOW",
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildInventoryItem(
  payload: AddInventoryPayload,
  overrides?: Partial<InventoryItem>,
): InventoryItem {
  const crop = getTargetCropOrThrow(payload.cropSlug);
  const now = overrides?.createdAt ?? new Date().toISOString();
  const spoilage = scoreSpoilageRisk({
    cropSlug: crop.slug,
    district: payload.district,
    state: payload.state,
    deadlineDate: payload.deadlineDate,
    storageType: payload.storageType,
    temperatureCelsius: payload.temperatureCelsius,
    humidityPercent: payload.humidityPercent,
  });

  return {
    id: overrides?.id ?? randomUUID(),
    ownerUserId: overrides?.ownerUserId ?? payload.ownerUserId ?? DEMO_FPO_OWNER_ID,
    cropSlug: crop.slug,
    cropName: crop.name,
    quantityKg: payload.quantityKg,
    storageLocationName: overrides?.storageLocationName ?? payload.storageLocationName ?? null,
    district: payload.district,
    state: payload.state,
    latitude: overrides?.latitude ?? null,
    longitude: overrides?.longitude ?? null,
    storageType: overrides?.storageType ?? payload.storageType ?? "ambient shed",
    deadlineDate: payload.deadlineDate,
    temperatureCelsius: overrides?.temperatureCelsius ?? payload.temperatureCelsius ?? null,
    humidityPercent: overrides?.humidityPercent ?? payload.humidityPercent ?? null,
    spoilageScore: overrides?.spoilageScore ?? spoilage.score,
    spoilageLevel: overrides?.spoilageLevel ?? spoilage.level,
    status: overrides?.status ?? "ACTIVE",
    metadata: {
      ...(overrides?.metadata ?? {}),
      spoilage: spoilage,
    },
    createdAt: now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

function seedDemoInventory(store: Map<string, InventoryItem>) {
  const demoSeed: Array<{
    id: string;
    payload: AddInventoryPayload;
    createdAt?: string;
    updatedAt?: string;
  }> = [
    {
      id: "demo-inventory-onion-guntur",
      payload: {
        ownerUserId: DEMO_FPO_OWNER_ID,
        cropSlug: "onion",
        quantityKg: 40000,
        storageLocationName: "Guntur Pack House 2",
        district: "Guntur",
        state: "Andhra Pradesh",
        storageType: "cold storage",
        deadlineDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        temperatureCelsius: 9,
        humidityPercent: 72,
      },
      createdAt: "2026-04-08T05:45:00.000Z",
      updatedAt: "2026-04-08T05:45:00.000Z",
    },
    {
      id: "demo-inventory-tomato-kurnool",
      payload: {
        ownerUserId: DEMO_FPO_OWNER_ID,
        cropSlug: "tomato",
        quantityKg: 12000,
        storageLocationName: "Kurnool Aggregation Yard",
        district: "Kurnool",
        state: "Andhra Pradesh",
        storageType: "ambient shed",
        deadlineDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        temperatureCelsius: 27,
        humidityPercent: 78,
      },
      createdAt: "2026-04-08T05:46:00.000Z",
      updatedAt: "2026-04-08T05:46:00.000Z",
    },
    {
      id: "demo-inventory-chilli-khammam",
      payload: {
        ownerUserId: DEMO_FPO_OWNER_ID,
        cropSlug: "green-chilli",
        quantityKg: 6500,
        storageLocationName: "Khammam Transit Bay",
        district: "Khammam",
        state: "Telangana",
        storageType: "ventilated warehouse",
        deadlineDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        temperatureCelsius: 19,
        humidityPercent: 74,
      },
      createdAt: "2026-04-08T05:47:00.000Z",
      updatedAt: "2026-04-08T05:47:00.000Z",
    },
  ];

  for (const entry of demoSeed) {
    const item = buildInventoryItem(entry.payload, {
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
    store.set(item.id, item);
  }
}

export function resetFallbackInventory() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowInventory = new Map<string, InventoryItem>();
  seedDemoInventory(globalThis.__agriflowInventory);
}

export async function listInventory(ownerUserId = DEMO_FPO_OWNER_ID) {
  if (!hasSupabaseWriteConfig() || ownerUserId === DEMO_FPO_OWNER_ID) {
    return Array.from(getInventoryStore().values())
      .filter((item) => item.ownerUserId === ownerUserId)
      .sort((left, right) => left.deadlineDate.localeCompare(right.deadlineDate));
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("deadline_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to list inventory: ${error.message}`);
  }

  return ((data ?? []) as PersistedInventoryRow[]).map(mapInventoryRow);
}

export async function listAllInventory() {
  if (!hasSupabaseWriteConfig()) {
    return Array.from(getInventoryStore().values()).sort((left, right) =>
      left.deadlineDate.localeCompare(right.deadlineDate),
    );
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .select("*")
    .order("deadline_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to list inventory: ${error.message}`);
  }

  return ((data ?? []) as PersistedInventoryRow[]).map(mapInventoryRow);
}

export async function findInventoryById(inventoryId: string) {
  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    return getInventoryStore().get(inventoryId) ?? null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .select("*")
    .eq("id", inventoryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find inventory item: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapInventoryRow(data as PersistedInventoryRow);
}

export async function createInventory(payload: AddInventoryPayload) {
  const item = buildInventoryItem(payload);

  if (!hasSupabaseWriteConfig() || item.ownerUserId === DEMO_FPO_OWNER_ID) {
    getInventoryStore().set(item.id, item);
    return item;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .insert({
      owner_user_id: item.ownerUserId,
      crop_slug: item.cropSlug,
      crop_name: item.cropName,
      quantity_kg: item.quantityKg,
      storage_location_name: item.storageLocationName,
      district: item.district,
      state: item.state,
      latitude: item.latitude,
      longitude: item.longitude,
      storage_type: item.storageType,
      deadline_date: item.deadlineDate,
      temperature_celsius: item.temperatureCelsius,
      humidity_percent: item.humidityPercent,
      spoilage_score: item.spoilageScore,
      spoilage_level: item.spoilageLevel,
      status: item.status,
      metadata: item.metadata,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create inventory: ${error.message}`);
  }

  return mapInventoryRow(data as PersistedInventoryRow);
}

export async function refreshInventoryRiskAssessment(
  inventoryId: string,
  spoilage: SpoilageScoreResult,
) {
  const current = await findInventoryById(inventoryId);

  if (!current) {
    throw new Error(`Inventory item ${inventoryId} was not found.`);
  }

  const nextItem: InventoryItem = {
    ...current,
    spoilageScore: spoilage.score,
    spoilageLevel: spoilage.level,
    metadata: {
      ...current.metadata,
      spoilage,
    },
    updatedAt: new Date().toISOString(),
  };

  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    getInventoryStore().set(nextItem.id, nextItem);
    return nextItem;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .update({
      spoilage_score: nextItem.spoilageScore,
      spoilage_level: nextItem.spoilageLevel,
      metadata: nextItem.metadata,
    } as never)
    .eq("id", inventoryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update inventory risk: ${error.message}`);
  }

  return mapInventoryRow(data as PersistedInventoryRow);
}

export async function updateInventory(inventoryId: string, payload: Partial<AddInventoryPayload>) {
  const current = await findInventoryById(inventoryId);
  if (!current) {
    throw new Error(`Inventory item ${inventoryId} was not found.`);
  }

  // Recalculate spoilage if relevant fields changed
  let spoilageScore = current.spoilageScore;
  let spoilageLevel = current.spoilageLevel;
  let metadata = current.metadata;
  
  if (payload.district || payload.deadlineDate || payload.storageType || payload.temperatureCelsius || payload.humidityPercent) {
    const spoilage = scoreSpoilageRisk({
      cropSlug: payload.cropSlug ?? current.cropSlug,
      district: payload.district ?? current.district,
      state: payload.state ?? current.state,
      deadlineDate: payload.deadlineDate ?? current.deadlineDate,
      storageType: payload.storageType ?? current.storageType ?? "ambient shed",
      temperatureCelsius: payload.temperatureCelsius ?? current.temperatureCelsius ?? null,
      humidityPercent: payload.humidityPercent ?? current.humidityPercent ?? null,
    });
    spoilageScore = spoilage.score;
    spoilageLevel = spoilage.level;
    metadata = { ...metadata, spoilage };
  }

  const nextItem: InventoryItem = {
    ...current,
    ...payload,
    quantityKg: payload.quantityKg ?? current.quantityKg,
    spoilageScore,
    spoilageLevel,
    metadata,
    updatedAt: new Date().toISOString(),
  };

  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    getInventoryStore().set(nextItem.id, nextItem);
    return nextItem;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("inventory")
    .update({
      quantity_kg: nextItem.quantityKg,
      storage_location_name: nextItem.storageLocationName,
      district: nextItem.district,
      state: nextItem.state,
      storage_type: nextItem.storageType,
      deadline_date: nextItem.deadlineDate,
      temperature_celsius: nextItem.temperatureCelsius,
      humidity_percent: nextItem.humidityPercent,
      spoilage_score: nextItem.spoilageScore,
      spoilage_level: nextItem.spoilageLevel,
      metadata: nextItem.metadata,
      updated_at: nextItem.updatedAt,
    } as never)
    .eq("id", inventoryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update inventory: ${error.message}`);
  }

  return mapInventoryRow(data as PersistedInventoryRow);
}

export async function deleteInventory(inventoryId: string) {
  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    getInventoryStore().delete(inventoryId);
    return true;
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("inventory")
    .delete()
    .eq("id", inventoryId);

  if (error) {
    throw new Error(`Failed to delete inventory: ${error.message}`);
  }

  return true;
}
