import { randomUUID } from "node:crypto";

import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_FARMER_CROPS,
  DEMO_FARMER_USERS,
  DEMO_FPO_USERS,
} from "@/lib/users/demo";
import type {
  AppUser,
  FarmerCropPreference,
  FarmerRegistrationPayload,
  FpoRegistrationPayload,
} from "@/lib/users/types";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

declare global {
  var __agriflowUsers: Map<string, AppUser> | undefined;
  var __agriflowFarmerCrops: Map<string, FarmerCropPreference[]> | undefined;
}

type PersistedUserRow = {
  id: string;
  clerk_user_id: string | null;
  role: AppUser["role"];
  full_name: string;
  phone: string | null;
  email: string | null;
  preferred_language: AppUser["preferredLanguage"];
  district: string | null;
  state: string | null;
  organization_name: string | null;
  districts_served: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type UpdateUserSettingsInput = {
  userId: string;
  preferredLanguage?: SupportedLanguage;
  whatsappBotLanguage?: SupportedLanguage;
  address?: string | null;
  district?: string | null;
  state?: string | null;
  farmerCropSlugs?: string[];
  organizationName?: string | null;
  districtsServed?: string[];
  cropsHandled?: string[];
  serviceRadiusKm?: number | null;
  serviceSummary?: string | null;
};

type PersistedFarmerCropRow = {
  user_id: string;
  crop_slug: string;
  crop_name: string;
  district: string | null;
  alert_threshold: number | null;
};

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["te", "hi", "kn", "en"];

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function seedFallbackUsers(store: Map<string, AppUser>) {
  if (store.size > 0) {
    return;
  }

  for (const user of DEMO_FARMER_USERS) {
    store.set(user.id, user);
  }

  for (const user of DEMO_FPO_USERS) {
    store.set(user.id, user);
  }
}

function seedFallbackFarmerCrops(store: Map<string, FarmerCropPreference[]>) {
  if (store.size > 0) {
    return;
  }

  for (const [userId, crops] of Object.entries(DEMO_FARMER_CROPS)) {
    store.set(userId, crops);
  }
}

function getUserStore() {
  if (!globalThis.__agriflowUsers) {
    globalThis.__agriflowUsers = new Map<string, AppUser>();
    seedFallbackUsers(globalThis.__agriflowUsers);
  }

  return globalThis.__agriflowUsers;
}

function getFarmerCropStore() {
  if (!globalThis.__agriflowFarmerCrops) {
    globalThis.__agriflowFarmerCrops = new Map<string, FarmerCropPreference[]>();
    seedFallbackFarmerCrops(globalThis.__agriflowFarmerCrops);
  }

  return globalThis.__agriflowFarmerCrops;
}

export function resetFallbackUserStores() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowUsers = new Map<string, AppUser>();
  globalThis.__agriflowFarmerCrops = new Map<string, FarmerCropPreference[]>();
  seedFallbackUsers(globalThis.__agriflowUsers);
  seedFallbackFarmerCrops(globalThis.__agriflowFarmerCrops);
}

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const withoutChannel = trimmed.replace(/^whatsapp:/i, "");
  const digits = withoutChannel.replace(/[^\d+]/g, "");

  if (!digits) {
    return "";
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}

function mapUserRow(row: PersistedUserRow): AppUser {
  const whatsappBotLanguage = isSupportedLanguage(row.metadata?.whatsapp_bot_language)
    ? row.metadata.whatsapp_bot_language
    : row.preferred_language;

  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    preferredLanguage: row.preferred_language,
    whatsappBotLanguage,
    address: typeof row.metadata?.address === "string" ? row.metadata.address : null,
    district: row.district,
    state: row.state,
    organizationName: row.organization_name,
    districtsServed: row.districts_served ?? [],
    cropsHandled: Array.isArray(row.metadata?.crops_handled)
      ? row.metadata.crops_handled.filter((value): value is string => typeof value === "string")
      : [],
    serviceRadiusKm:
      typeof row.metadata?.service_radius_km === "number"
        ? row.metadata.service_radius_km
        : null,
    serviceSummary:
      typeof row.metadata?.service_summary === "string"
        ? row.metadata.service_summary
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFarmerCropRow(row: PersistedFarmerCropRow): FarmerCropPreference {
  return {
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    district: row.district ?? undefined,
    alertThreshold: row.alert_threshold ?? undefined,
  };
}

async function upsertUser(
  row: Record<string, unknown>,
  conflictColumn: "phone" | "email",
) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .upsert(row as never, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  return mapUserRow(data as unknown as PersistedUserRow);
}

export async function listUsersByRole(role: AppUser["role"]) {
  if (!hasSupabaseWriteConfig()) {
    return Array.from(getUserStore().values()).filter((user) => user.role === role);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("role", role)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list users by role: ${error.message}`);
  }

  return ((data ?? []) as PersistedUserRow[]).map(mapUserRow);
}

export async function findUserById(userId: string) {
  if (!hasSupabaseWriteConfig()) {
    return getUserStore().get(userId) ?? null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find user by id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapUserRow(data as PersistedUserRow);
}

export async function findUserByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  if (!hasSupabaseWriteConfig()) {
    return (
      Array.from(getUserStore().values()).find((user) => user.phone === normalizedPhone) ??
      null
    );
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find user by phone: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapUserRow(data as unknown as PersistedUserRow);
}

export async function findUserByClerkId(clerkUserId: string) {
  if (!hasSupabaseWriteConfig()) {
    return (
      Array.from(getUserStore().values()).find((user) => user.clerkUserId === clerkUserId) ??
      null
    );
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find user by clerk id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapUserRow(data as PersistedUserRow);
}

export async function listFarmerCropsForUser(userId: string) {
  if (!hasSupabaseWriteConfig()) {
    return getFarmerCropStore().get(userId) ?? [];
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("farmer_crops")
    .select("user_id, crop_slug, crop_name, district, alert_threshold")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list farmer crops: ${error.message}`);
  }

  return ((data ?? []) as PersistedFarmerCropRow[]).map(mapFarmerCropRow);
}

export async function upsertFarmerCropAlertThreshold(params: {
  userId: string;
  cropSlug: string;
  threshold: number;
  district?: string | null;
}) {
  const user = await findUserById(params.userId);
  const crop = getTargetCropOrThrow(params.cropSlug);
  const district = params.district ?? user?.district ?? null;

  if (!hasSupabaseWriteConfig() || params.userId.startsWith("demo-")) {
    const current = [...(getFarmerCropStore().get(params.userId) ?? [])];
    const existingIndex = current.findIndex(
      (entry) =>
        entry.cropSlug === crop.slug &&
        (entry.district ?? null) === district,
    );
    const nextEntry: FarmerCropPreference = {
      cropSlug: crop.slug,
      cropName: crop.name,
      district: district ?? undefined,
      alertThreshold: params.threshold,
    };

    if (existingIndex >= 0) {
      current[existingIndex] = {
        ...current[existingIndex],
        ...nextEntry,
      };
    } else {
      current.push(nextEntry);
    }

    getFarmerCropStore().set(params.userId, current);
    return nextEntry;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("farmer_crops")
    .upsert(
      {
        user_id: params.userId,
        crop_slug: crop.slug,
        crop_name: crop.name,
        district,
        alert_threshold: params.threshold,
        is_active: true,
      } as never,
      {
        onConflict: "user_id,crop_slug,district",
        ignoreDuplicates: false,
      },
    )
    .select("user_id, crop_slug, crop_name, district, alert_threshold")
    .single();

  if (error) {
    throw new Error(`Failed to save farmer crop alert threshold: ${error.message}`);
  }

  return mapFarmerCropRow(data as PersistedFarmerCropRow);
}

export async function listFarmersWithCrops() {
  if (!hasSupabaseWriteConfig()) {
    return Array.from(getUserStore().values())
      .filter((user) => user.role === "FARMER")
      .map((user) => ({
        user,
        crops: getFarmerCropStore().get(user.id) ?? [],
      }));
  }

  const [farmers, cropRows] = await Promise.all([
    listUsersByRole("FARMER"),
    getSupabaseAdminClient()
      .from("farmer_crops")
      .select("user_id, crop_slug, crop_name, district, alert_threshold")
      .eq("is_active", true),
  ]);

  if (cropRows.error) {
    throw new Error(`Failed to load farmer crops: ${cropRows.error.message}`);
  }

  const cropMap = new Map<string, FarmerCropPreference[]>();

  for (const row of (cropRows.data ?? []) as PersistedFarmerCropRow[]) {
    const current = cropMap.get(row.user_id) ?? [];
    current.push(mapFarmerCropRow(row));
    cropMap.set(row.user_id, current);
  }

  return farmers.map((user) => ({
    user,
    crops: cropMap.get(user.id) ?? [],
  }));
}

export async function registerFarmer(payload: FarmerRegistrationPayload) {
  const normalizedPhone = normalizePhone(payload.phone);
  const now = new Date().toISOString();

  if (!hasSupabaseWriteConfig()) {
    const existing =
      Array.from(getUserStore().values()).find((user) => user.phone === normalizedPhone) ??
      null;
    const user: AppUser = {
      id: existing?.id ?? randomUUID(),
      clerkUserId: payload.clerkUserId ?? existing?.clerkUserId ?? null,
      role: "FARMER",
      fullName: payload.fullName,
      phone: normalizedPhone,
      email: existing?.email ?? null,
      preferredLanguage: payload.preferredLanguage,
      whatsappBotLanguage: payload.preferredLanguage,
      address: existing?.address ?? null,
      district: payload.district,
      state: payload.state,
      organizationName: null,
      districtsServed: [],
      cropsHandled: [],
      serviceRadiusKm: null,
      serviceSummary: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    getUserStore().set(user.id, user);
    getFarmerCropStore().set(user.id, payload.crops);

    return {
      user,
      crops: payload.crops,
    };
  }

  const user = await upsertUser(
    {
      clerk_user_id: payload.clerkUserId ?? null,
      role: "FARMER",
      full_name: payload.fullName,
      phone: normalizedPhone,
      preferred_language: payload.preferredLanguage,
      district: payload.district,
      state: payload.state,
      organization_name: null,
      districts_served: [],
      metadata: {
        whatsapp_bot_language: payload.preferredLanguage,
      },
    },
    "phone",
  );

  const admin = getSupabaseAdminClient();
  const { error: deleteError } = await admin
    .from("farmer_crops")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(`Failed to reset farmer crops: ${deleteError.message}`);
  }

  if (payload.crops.length > 0) {
    const { error: insertError } = await admin.from("farmer_crops").insert(
      payload.crops.map((crop) => ({
        user_id: user.id,
        crop_slug: crop.cropSlug,
        crop_name: crop.cropName,
        district: crop.district ?? payload.district,
        alert_threshold: crop.alertThreshold ?? 0,
      })) as never,
    );

    if (insertError) {
      throw new Error(`Failed to save farmer crops: ${insertError.message}`);
    }
  }

  return {
    user,
    crops: payload.crops,
  };
}

export async function registerFpo(payload: FpoRegistrationPayload) {
  const normalizedPhone = payload.phone ? normalizePhone(payload.phone) : null;
  const now = new Date().toISOString();

  if (!hasSupabaseWriteConfig()) {
    const existing =
      Array.from(getUserStore().values()).find(
        (user) => user.email?.toLowerCase() === payload.email.toLowerCase(),
      ) ?? null;
    const user: AppUser = {
      id: existing?.id ?? randomUUID(),
      clerkUserId: payload.clerkUserId ?? existing?.clerkUserId ?? null,
      role: "FPO",
      fullName: payload.fullName,
      phone: normalizedPhone,
      email: payload.email,
      preferredLanguage: payload.preferredLanguage,
      whatsappBotLanguage: payload.preferredLanguage,
      address: existing?.address ?? null,
      district: null,
      state: payload.state ?? null,
      organizationName: payload.organizationName,
      districtsServed: payload.districtsServed,
      cropsHandled: payload.cropsHandled,
      serviceRadiusKm: payload.serviceRadiusKm ?? null,
      serviceSummary: payload.serviceSummary ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    getUserStore().set(user.id, user);

    return { user };
  }

  const user = await upsertUser(
    {
      clerk_user_id: payload.clerkUserId ?? null,
      role: "FPO",
      full_name: payload.fullName,
      phone: normalizedPhone,
      email: payload.email,
      preferred_language: payload.preferredLanguage,
      district: null,
      state: payload.state ?? null,
      organization_name: payload.organizationName,
      districts_served: payload.districtsServed,
      metadata: {
        crops_handled: payload.cropsHandled,
        service_radius_km: payload.serviceRadiusKm ?? null,
        service_summary: payload.serviceSummary ?? null,
        whatsapp_bot_language: payload.preferredLanguage,
      },
    },
    "email",
  );

  return { user };
}

export async function listFposForDistrict(options: {
  district?: string | null;
  cropSlug?: string;
}) {
  const fpos = await listUsersByRole("FPO");

  return fpos.filter((user) => {
    const districtMatch = options.district
      ? user.districtsServed.includes(options.district)
      : true;
    const cropMatch =
      options.cropSlug && user.cropsHandled.length > 0
        ? user.cropsHandled.includes(options.cropSlug)
        : true;

    return districtMatch && cropMatch;
  });
}

export async function updateUserPreferredLanguage(
  userId: string,
  preferredLanguage: AppUser["preferredLanguage"],
) {
  const existing = await findUserById(userId);

  if (!existing) {
    throw new Error(`User ${userId} was not found.`);
  }

  const nextUser: AppUser = {
    ...existing,
    preferredLanguage,
    whatsappBotLanguage: preferredLanguage,
    updatedAt: new Date().toISOString(),
  };

  if (!hasSupabaseWriteConfig() || userId.startsWith("demo-")) {
    getUserStore().set(userId, nextUser);
    return nextUser;
  }

  const admin = getSupabaseAdminClient();
  const { data: currentRow, error: currentRowError } = await admin
    .from("users")
    .select("metadata")
    .eq("id", userId)
    .single();

  if (currentRowError) {
    throw new Error(`Failed to load existing user metadata: ${currentRowError.message}`);
  }

  const currentMetadata = (currentRow as { metadata?: unknown } | null)?.metadata;
  const existingMetadata =
    typeof currentMetadata === "object" && currentMetadata
      ? (currentMetadata as Record<string, unknown>)
      : {};
  const { data, error } = await admin
    .from("users")
    .update({
      preferred_language: preferredLanguage,
      metadata: {
        ...existingMetadata,
        whatsapp_bot_language: preferredLanguage,
      },
      updated_at: nextUser.updatedAt,
    } as never)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update user preferred language: ${error.message}`);
  }

  return mapUserRow(data as PersistedUserRow);
}

export async function updateUserSettings(input: UpdateUserSettingsInput) {
  const existing = await findUserById(input.userId);

  if (!existing) {
    throw new Error(`User ${input.userId} was not found.`);
  }

  const preferredLanguage = input.preferredLanguage ?? existing.preferredLanguage;
  const whatsappBotLanguage = input.whatsappBotLanguage ?? preferredLanguage;

  const nextUser: AppUser = {
    ...existing,
    preferredLanguage,
    whatsappBotLanguage,
    address: input.address ?? existing.address ?? null,
    district:
      typeof input.district === "string" ? input.district : (existing.district ?? null),
    state: typeof input.state === "string" ? input.state : (existing.state ?? null),
    organizationName:
      input.organizationName !== undefined
        ? input.organizationName
        : (existing.organizationName ?? null),
    districtsServed:
      input.districtsServed !== undefined
        ? input.districtsServed
        : existing.districtsServed,
    cropsHandled:
      input.cropsHandled !== undefined ? input.cropsHandled : existing.cropsHandled,
    serviceRadiusKm:
      input.serviceRadiusKm !== undefined
        ? input.serviceRadiusKm
        : (existing.serviceRadiusKm ?? null),
    serviceSummary:
      input.serviceSummary !== undefined
        ? input.serviceSummary
        : (existing.serviceSummary ?? null),
    updatedAt: new Date().toISOString(),
  };

  if (
    input.farmerCropSlugs &&
    nextUser.role === "FARMER"
  ) {
    const normalized = [...new Set(input.farmerCropSlugs)];

    for (const cropSlug of normalized) {
      getTargetCropOrThrow(cropSlug);
    }
  }

  if (input.cropsHandled && nextUser.role === "FPO") {
    const normalized = [...new Set(input.cropsHandled)];

    for (const cropSlug of normalized) {
      getTargetCropOrThrow(cropSlug);
    }
  }

  if (!hasSupabaseWriteConfig() || input.userId.startsWith("demo-")) {
    getUserStore().set(input.userId, nextUser);

    if (nextUser.role === "FARMER" && input.farmerCropSlugs) {
      const existingCrops = getFarmerCropStore().get(input.userId) ?? [];
      const existingThresholdBySlug = new Map<string, number>();

      for (const crop of existingCrops) {
        if (typeof crop.alertThreshold === "number") {
          existingThresholdBySlug.set(crop.cropSlug, crop.alertThreshold);
        }
      }

      const district = nextUser.district ?? undefined;
      const farmerCrops = [...new Set(input.farmerCropSlugs)].map((cropSlug) => {
        const crop = getTargetCropOrThrow(cropSlug);

        return {
          cropSlug: crop.slug,
          cropName: crop.name,
          district,
          alertThreshold: existingThresholdBySlug.get(crop.slug) ?? 0,
        } satisfies FarmerCropPreference;
      });

      getFarmerCropStore().set(input.userId, farmerCrops);
    }

    return {
      user: nextUser,
      cropPreferences:
        nextUser.role === "FARMER"
          ? (getFarmerCropStore().get(input.userId) ?? [])
          : [],
    };
  }

  const admin = getSupabaseAdminClient();
  const { data: currentRow, error: currentRowError } = await admin
    .from("users")
    .select("metadata")
    .eq("id", input.userId)
    .single();

  if (currentRowError) {
    throw new Error(`Failed to load existing user metadata: ${currentRowError.message}`);
  }

  const currentMetadata = (currentRow as { metadata?: unknown } | null)?.metadata;
  const existingMetadata =
    typeof currentMetadata === "object" && currentMetadata
      ? (currentMetadata as Record<string, unknown>)
      : {};

  const mergedMetadata: Record<string, unknown> = {
    ...existingMetadata,
    whatsapp_bot_language: whatsappBotLanguage,
    ui_language: preferredLanguage,
    language_lock: true,
    address: nextUser.address ?? null,
    crops_handled: nextUser.cropsHandled,
    service_radius_km: nextUser.serviceRadiusKm ?? null,
    service_summary: nextUser.serviceSummary ?? null,
  };

  const { data, error } = await admin
    .from("users")
    .update({
      preferred_language: preferredLanguage,
      district: nextUser.district,
      state: nextUser.state,
      organization_name: nextUser.organizationName,
      districts_served: nextUser.districtsServed,
      metadata: mergedMetadata,
      updated_at: nextUser.updatedAt,
    } as never)
    .eq("id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update user settings: ${error.message}`);
  }

  if (nextUser.role === "FARMER" && input.farmerCropSlugs) {
    const existingCrops = await listFarmerCropsForUser(input.userId);
    const existingThresholdBySlug = new Map<string, number>();

    for (const crop of existingCrops) {
      if (typeof crop.alertThreshold === "number") {
        existingThresholdBySlug.set(crop.cropSlug, crop.alertThreshold);
      }
    }

    const { error: deleteError } = await admin
      .from("farmer_crops")
      .delete()
      .eq("user_id", input.userId);

    if (deleteError) {
      throw new Error(`Failed to update farmer crops: ${deleteError.message}`);
    }

    const uniqueCropSlugs = [...new Set(input.farmerCropSlugs)];

    if (uniqueCropSlugs.length > 0) {
      const district = nextUser.district ?? null;
      const rows = uniqueCropSlugs.map((cropSlug) => {
        const crop = getTargetCropOrThrow(cropSlug);
        return {
          user_id: input.userId,
          crop_slug: crop.slug,
          crop_name: crop.name,
          district,
          alert_threshold: existingThresholdBySlug.get(crop.slug) ?? 0,
          is_active: true,
        };
      });

      const { error: insertError } = await admin
        .from("farmer_crops")
        .insert(rows as never);

      if (insertError) {
        throw new Error(`Failed to save farmer crops: ${insertError.message}`);
      }
    }
  }

  return {
    user: mapUserRow(data as PersistedUserRow),
    cropPreferences:
      nextUser.role === "FARMER"
        ? await listFarmerCropsForUser(input.userId)
        : [],
  };
}
