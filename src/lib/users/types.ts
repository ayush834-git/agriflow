import type { SupportedLanguage } from "@/lib/whatsapp/types";

export type AppUserRole = "FARMER" | "FPO" | "SUPPLIER" | "RETAILER";

export type FarmerCropPreference = {
  cropSlug: string;
  cropName: string;
  district?: string;
  alertThreshold?: number;
};

export type AppUser = {
  id: string;
  clerkUserId?: string | null;
  role: AppUserRole;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  preferredLanguage: SupportedLanguage;
  district?: string | null;
  state?: string | null;
  organizationName?: string | null;
  districtsServed: string[];
  cropsHandled: string[];
  serviceRadiusKm?: number | null;
  serviceSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FarmerRegistrationPayload = {
  fullName: string;
  phone: string;
  district: string;
  state: string;
  preferredLanguage: SupportedLanguage;
  crops: FarmerCropPreference[];
  clerkUserId?: string;
};

export type FpoRegistrationPayload = {
  fullName: string;
  email: string;
  phone?: string;
  organizationName: string;
  districtsServed: string[];
  cropsHandled: string[];
  preferredLanguage: SupportedLanguage;
  state?: string;
  serviceRadiusKm?: number;
  serviceSummary?: string;
  clerkUserId?: string;
};
