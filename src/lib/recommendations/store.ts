import { randomUUID } from "node:crypto";

import { hasSupabaseWriteConfig } from "@/lib/env";
import { listInventory } from "@/lib/inventory/store";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CreateRecommendationPayload,
  MovementRecommendation,
} from "@/lib/recommendations/types";

declare global {
  var __agriflowRecommendations: Map<string, MovementRecommendation> | undefined;
}

type PersistedRecommendationRow = {
  id: string;
  inventory_id: string;
  target_district: string;
  target_state: string;
  generated_by: string;
  transport_distance_km: number | null;
  transport_cost_inr: number | null;
  net_profit_per_kg_inr: number | null;
  total_net_profit_inr: number | null;
  confidence: number | null;
  urgency: MovementRecommendation["urgency"];
  reasoning: string | null;
  signals: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function getRecommendationStore() {
  if (!globalThis.__agriflowRecommendations) {
    globalThis.__agriflowRecommendations = new Map<string, MovementRecommendation>();
  }

  return globalThis.__agriflowRecommendations;
}

export function resetFallbackRecommendations() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowRecommendations = new Map<string, MovementRecommendation>();
}

function mapRecommendationRow(row: PersistedRecommendationRow): MovementRecommendation {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    targetDistrict: row.target_district,
    targetState: row.target_state,
    generatedBy: row.generated_by,
    transportDistanceKm: row.transport_distance_km,
    transportCostInr: row.transport_cost_inr,
    netProfitPerKgInr: row.net_profit_per_kg_inr,
    totalNetProfitInr: row.total_net_profit_inr,
    confidence: row.confidence,
    urgency: row.urgency,
    reasoning: row.reasoning,
    signals: row.signals ?? {},
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildRecommendation(payload: CreateRecommendationPayload): MovementRecommendation {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    inventoryId: payload.inventoryId,
    targetDistrict: payload.targetDistrict,
    targetState: payload.targetState,
    generatedBy: payload.generatedBy ?? "agriflow-local-engine",
    transportDistanceKm: payload.transportDistanceKm ?? null,
    transportCostInr: payload.transportCostInr ?? null,
    netProfitPerKgInr: payload.netProfitPerKgInr ?? null,
    totalNetProfitInr: payload.totalNetProfitInr ?? null,
    confidence: payload.confidence ?? null,
    urgency: payload.urgency,
    reasoning: payload.reasoning ?? null,
    signals: payload.signals ?? {},
    expiresAt: payload.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listRecommendationsForInventory(inventoryId: string) {
  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    return Array.from(getRecommendationStore().values())
      .filter((recommendation) => recommendation.inventoryId === inventoryId)
      .sort(
        (left, right) =>
          (right.totalNetProfitInr ?? 0) - (left.totalNetProfitInr ?? 0),
      );
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("movement_recommendations")
    .select("*")
    .eq("inventory_id", inventoryId)
    .order("total_net_profit_inr", { ascending: false });

  if (error) {
    throw new Error(`Failed to list movement recommendations: ${error.message}`);
  }

  return ((data ?? []) as PersistedRecommendationRow[]).map(mapRecommendationRow);
}

export async function listRecommendationsForOwner(ownerUserId: string) {
  const inventory = await listInventory(ownerUserId);
  const recommendations = await Promise.all(
    inventory.map((item) => listRecommendationsForInventory(item.id)),
  );

  return recommendations.flat();
}

export async function replaceRecommendationsForInventory(
  inventoryId: string,
  payloads: CreateRecommendationPayload[],
) {
  const nextRecommendations = payloads.map(buildRecommendation);

  if (!hasSupabaseWriteConfig() || inventoryId.startsWith("demo-")) {
    const store = getRecommendationStore();

    for (const existing of Array.from(store.values())) {
      if (existing.inventoryId === inventoryId) {
        store.delete(existing.id);
      }
    }

    for (const recommendation of nextRecommendations) {
      store.set(recommendation.id, recommendation);
    }

    return nextRecommendations;
  }

  const admin = getSupabaseAdminClient();
  const { error: deleteError } = await admin
    .from("movement_recommendations")
    .delete()
    .eq("inventory_id", inventoryId);

  if (deleteError) {
    throw new Error(`Failed to clear movement recommendations: ${deleteError.message}`);
  }

  if (nextRecommendations.length === 0) {
    return [];
  }

  const { data, error } = await admin
    .from("movement_recommendations")
    .insert(
      nextRecommendations.map((recommendation) => ({
        inventory_id: recommendation.inventoryId,
        target_district: recommendation.targetDistrict,
        target_state: recommendation.targetState,
        generated_by: recommendation.generatedBy,
        transport_distance_km: recommendation.transportDistanceKm,
        transport_cost_inr: recommendation.transportCostInr,
        net_profit_per_kg_inr: recommendation.netProfitPerKgInr,
        total_net_profit_inr: recommendation.totalNetProfitInr,
        confidence: recommendation.confidence,
        urgency: recommendation.urgency,
        reasoning: recommendation.reasoning,
        signals: recommendation.signals,
        expires_at: recommendation.expiresAt,
      })) as never,
    )
    .select("*");

  if (error) {
    throw new Error(`Failed to save movement recommendations: ${error.message}`);
  }

  return ((data ?? []) as PersistedRecommendationRow[]).map(mapRecommendationRow);
}
