import type { NotificationChannel } from "@/lib/notifications/types";

export type MatchStatus =
  | "OPEN"
  | "CONTACTED"
  | "ACCEPTED"
  | "COMPLETED"
  | "CANCELLED";

export type MarketMatch = {
  id: string;
  listingId?: string | null;
  inventoryId?: string | null;
  farmerUserId?: string | null;
  counterpartyUserId?: string | null;
  cropSlug: string;
  cropName: string;
  quantityKg?: number | null;
  offeredPricePerKg?: number | null;
  matchScore?: number | null;
  status: MatchStatus;
  conversationChannel?: NotificationChannel | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMatchPayload = {
  listingId?: string;
  inventoryId?: string;
  farmerUserId?: string;
  counterpartyUserId?: string;
  cropSlug: string;
  cropName: string;
  quantityKg?: number;
  offeredPricePerKg?: number;
  matchScore?: number;
  conversationChannel?: NotificationChannel;
  notes?: string;
};

export type DirectoryCandidate = {
  listingId: string;
  farmerUserId: string;
  farmerName: string;
  farmerPhone?: string | null;
  cropSlug: string;
  cropName: string;
  quantityKg: number;
  askingPricePerKg?: number | null;
  qualityGrade?: string | null;
  district: string;
  state: string;
  freshnessLabel: string;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    quantityFit: number;
    freshnessFit: number;
    priceAlignment: number;
    distanceFit: number;
  };
  notes?: string | null;
};
