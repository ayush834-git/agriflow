import { randomUUID } from "node:crypto";

import { hasSupabaseWriteConfig } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateMatchPayload,
  MarketMatch,
  MatchStatus,
} from "@/lib/matches/types";

declare global {
  var __agriflowMatches: Map<string, MarketMatch> | undefined;
}

type PersistedMatchRow = {
  id: string;
  listing_id: string | null;
  inventory_id: string | null;
  farmer_user_id: string | null;
  counterparty_user_id: string | null;
  crop_slug: string;
  crop_name: string;
  quantity_kg: number | null;
  offered_price_per_kg: number | null;
  match_score: number | null;
  status: MatchStatus;
  conversation_channel: MarketMatch["conversationChannel"] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function getMatchStore() {
  if (!globalThis.__agriflowMatches) {
    globalThis.__agriflowMatches = new Map<string, MarketMatch>();
  }

  return globalThis.__agriflowMatches;
}

export function resetFallbackMatches() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowMatches = new Map<string, MarketMatch>();
}

function mapMatchRow(row: PersistedMatchRow): MarketMatch {
  return {
    id: row.id,
    listingId: row.listing_id,
    inventoryId: row.inventory_id,
    farmerUserId: row.farmer_user_id,
    counterpartyUserId: row.counterparty_user_id,
    cropSlug: row.crop_slug,
    cropName: row.crop_name,
    quantityKg: row.quantity_kg,
    offeredPricePerKg: row.offered_price_per_kg,
    matchScore: row.match_score,
    status: row.status,
    conversationChannel: row.conversation_channel,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildMatch(payload: CreateMatchPayload): MarketMatch {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    listingId: payload.listingId ?? null,
    inventoryId: payload.inventoryId ?? null,
    farmerUserId: payload.farmerUserId ?? null,
    counterpartyUserId: payload.counterpartyUserId ?? null,
    cropSlug: payload.cropSlug,
    cropName: payload.cropName,
    quantityKg: payload.quantityKg ?? null,
    offeredPricePerKg: payload.offeredPricePerKg ?? null,
    matchScore: payload.matchScore ?? null,
    status: "CONTACTED",
    conversationChannel: payload.conversationChannel ?? "WHATSAPP",
    notes: payload.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listMatchesForFarmer(farmerUserId: string, limit = 8) {
  if (!hasSupabaseWriteConfig()) {
    return Array.from(getMatchStore().values())
      .filter((match) => match.farmerUserId === farmerUserId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("farmer_user_id", farmerUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list farmer matches: ${error.message}`);
  }

  return ((data ?? []) as PersistedMatchRow[]).map(mapMatchRow);
}

export async function listMatchesForCounterparty(counterpartyUserId: string, limit = 8) {
  if (!hasSupabaseWriteConfig()) {
    return Array.from(getMatchStore().values())
      .filter((match) => match.counterpartyUserId === counterpartyUserId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("counterparty_user_id", counterpartyUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list counterparty matches: ${error.message}`);
  }

  return ((data ?? []) as PersistedMatchRow[]).map(mapMatchRow);
}

export async function findMatchById(matchId: string) {
  if (!hasSupabaseWriteConfig()) {
    return getMatchStore().get(matchId) ?? null;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find match: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapMatchRow(data as PersistedMatchRow);
}

export async function createMatch(payload: CreateMatchPayload) {
  const match = buildMatch(payload);

  if (!hasSupabaseWriteConfig()) {
    getMatchStore().set(match.id, match);
    return match;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .insert({
      listing_id: match.listingId,
      inventory_id: match.inventoryId,
      farmer_user_id: match.farmerUserId,
      counterparty_user_id: match.counterpartyUserId,
      crop_slug: match.cropSlug,
      crop_name: match.cropName,
      quantity_kg: match.quantityKg,
      offered_price_per_kg: match.offeredPricePerKg,
      match_score: match.matchScore,
      status: match.status,
      conversation_channel: match.conversationChannel,
      notes: match.notes,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create match: ${error.message}`);
  }

  return mapMatchRow(data as PersistedMatchRow);
}

export async function updateMatchStatus(matchId: string, status: MatchStatus, notes?: string) {
  const current = await findMatchById(matchId);

  if (!current) {
    throw new Error(`Match ${matchId} was not found.`);
  }

  const nextMatch: MarketMatch = {
    ...current,
    status,
    notes: notes ?? current.notes,
    updatedAt: new Date().toISOString(),
  };

  if (!hasSupabaseWriteConfig()) {
    getMatchStore().set(matchId, nextMatch);
    return nextMatch;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({
      status: nextMatch.status,
      notes: nextMatch.notes,
      updated_at: nextMatch.updatedAt,
    } as never)
    .eq("id", matchId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`);
  }

  return mapMatchRow(data as PersistedMatchRow);
}
