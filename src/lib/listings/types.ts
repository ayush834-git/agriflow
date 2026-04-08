export type ListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "MATCHED"
  | "SOLD"
  | "CANCELLED";

export type ListingItem = {
  id: string;
  farmerUserId: string;
  cropSlug: string;
  cropName: string;
  quantityKg: number;
  askingPricePerKg?: number | null;
  qualityGrade?: string | null;
  district: string;
  state: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  status: ListingStatus;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AddListingPayload = {
  farmerUserId: string;
  cropSlug: string;
  quantityKg: number;
  askingPricePerKg?: number;
  qualityGrade?: string;
  district: string;
  state: string;
  availableFrom?: string;
  availableUntil?: string;
  notes?: string;
};

export type ListingSearchFilters = {
  cropSlug?: string;
  district?: string;
  minQuantityKg?: number;
  maxQuantityKg?: number;
  farmerUserId?: string;
  statuses?: ListingStatus[];
};
