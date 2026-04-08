export type InventoryStatus = "ACTIVE" | "IN_TRANSIT" | "SOLD" | "EXPIRED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type InventoryItem = {
  id: string;
  ownerUserId: string;
  cropSlug: string;
  cropName: string;
  quantityKg: number;
  storageLocationName?: string | null;
  district: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  storageType?: string | null;
  deadlineDate: string;
  temperatureCelsius?: number | null;
  humidityPercent?: number | null;
  spoilageScore: number;
  spoilageLevel: RiskLevel;
  status: InventoryStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AddInventoryPayload = {
  ownerUserId?: string;
  cropSlug: string;
  quantityKg: number;
  storageLocationName?: string;
  district: string;
  state: string;
  storageType?: string;
  deadlineDate: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
};

export type SpoilageScoreInput = {
  cropSlug: string;
  district: string;
  state: string;
  deadlineDate: string;
  storageType?: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
};

export type SpoilageScoreResult = {
  score: number;
  level: RiskLevel;
  weatherPressure: number;
  deadlinePressure: number;
  cropSensitivity: number;
  storageAdjustment: number;
  temperaturePressure: number;
  humidityPressure: number;
  confidence: number;
  summary: string;
  reasoning: string[];
};
