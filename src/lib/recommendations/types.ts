import type { RiskLevel } from "@/lib/inventory/types";

export type MovementRecommendation = {
  id: string;
  inventoryId: string;
  targetDistrict: string;
  targetState: string;
  generatedBy: string;
  transportDistanceKm?: number | null;
  transportCostInr?: number | null;
  netProfitPerKgInr?: number | null;
  totalNetProfitInr?: number | null;
  confidence?: number | null;
  urgency: RiskLevel;
  reasoning?: string | null;
  signals: Record<string, unknown>;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecommendationPayload = {
  inventoryId: string;
  targetDistrict: string;
  targetState: string;
  generatedBy?: string;
  transportDistanceKm?: number;
  transportCostInr?: number;
  netProfitPerKgInr?: number;
  totalNetProfitInr?: number;
  confidence?: number;
  urgency: RiskLevel;
  reasoning?: string;
  signals?: Record<string, unknown>;
  expiresAt?: string;
};
