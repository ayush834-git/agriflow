import { z } from "zod";

import { findTargetCrop } from "@/lib/agmarknet/catalog";
import { getEnv } from "@/lib/env";
import { normalizePhone } from "@/lib/users/store";
import type {
  FarmerRegistrationPayload,
  FpoRegistrationPayload,
} from "@/lib/users/types";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

const supportedLanguageSchema = z.enum(["te", "hi", "kn", "en"]);

const farmerCropInputSchema = z.object({
  cropSlug: z.string().trim().min(1, "Select at least one crop."),
  district: z.string().trim().min(2).optional(),
  alertThreshold: z.number().positive().optional(),
});

const farmerRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the farmer's full name."),
  phone: z.string().trim().min(8, "Enter a valid phone number."),
  district: z.string().trim().min(2, "Enter a district."),
  state: z.string().trim().min(2, "Enter a state."),
  preferredLanguage: supportedLanguageSchema,
  crops: z.array(farmerCropInputSchema).min(1, "Select at least one crop."),
  clerkUserId: z.string().trim().optional(),
});

const fpoRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the contact person's name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(8).optional(),
  organizationName: z.string().trim().min(2, "Enter an organization name."),
  districtsServed: z
    .array(z.string().trim().min(2))
    .min(1, "Enter at least one district."),
  cropsHandled: z.array(z.string().trim().min(1)).min(1, "Select at least one crop."),
  preferredLanguage: supportedLanguageSchema,
  state: z.string().trim().optional(),
  serviceRadiusKm: z.number().positive().optional(),
  serviceSummary: z.string().trim().max(500).optional(),
  clerkUserId: z.string().trim().optional(),
});

export const supportedLanguageOptions: Array<{
  value: SupportedLanguage;
  label: string;
}> = [
  { value: "te", label: "Telugu" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "en", label: "English" },
];

export class RegistrationValidationError extends Error {}

export function parseFarmerRegistration(
  input: unknown,
): FarmerRegistrationPayload {
  const parsed = farmerRegistrationSchema.parse(input);
  const normalizedPhone = normalizePhone(parsed.phone);

  if (!normalizedPhone) {
    throw new RegistrationValidationError("Enter a valid phone number.");
  }

  const crops = parsed.crops.map((crop) => {
    const targetCrop = findTargetCrop(crop.cropSlug);

    if (!targetCrop) {
      throw new RegistrationValidationError(
        `Unsupported crop "${crop.cropSlug}".`,
      );
    }

    return {
      cropSlug: targetCrop.slug,
      cropName: targetCrop.name,
      district: crop.district ?? parsed.district,
      alertThreshold: crop.alertThreshold,
    };
  });

  return {
    fullName: parsed.fullName,
    phone: normalizedPhone,
    district: parsed.district,
    state: parsed.state,
    preferredLanguage: parsed.preferredLanguage,
    crops,
    clerkUserId: parsed.clerkUserId,
  };
}

export function parseFpoRegistration(input: unknown): FpoRegistrationPayload {
  const parsed = fpoRegistrationSchema.parse(input);
  const normalizedPhone = parsed.phone ? normalizePhone(parsed.phone) : undefined;

  if (parsed.phone && !normalizedPhone) {
    throw new RegistrationValidationError("Enter a valid phone number.");
  }

  return {
    fullName: parsed.fullName,
    email: parsed.email.trim().toLowerCase(),
    phone: normalizedPhone,
    organizationName: parsed.organizationName,
    districtsServed: parsed.districtsServed,
    cropsHandled: parsed.cropsHandled.map((cropSlug) => {
      const crop = findTargetCrop(cropSlug);

      if (!crop) {
        throw new RegistrationValidationError(`Unsupported crop "${cropSlug}".`);
      }

      return crop.slug;
    }),
    preferredLanguage: parsed.preferredLanguage,
    state: parsed.state || undefined,
    serviceRadiusKm: parsed.serviceRadiusKm,
    serviceSummary: parsed.serviceSummary || undefined,
    clerkUserId: parsed.clerkUserId,
  };
}

export function buildFarmerRegistrationUrl(options: {
  language: SupportedLanguage;
  phone?: string;
  source?: "whatsapp" | "sms" | "web";
}) {
  const env = getEnv();
  const url = new URL("/register/farmer", env.NEXT_PUBLIC_APP_URL);
  const normalizedPhone = options.phone ? normalizePhone(options.phone) : "";

  url.searchParams.set("language", options.language);
  url.searchParams.set("source", options.source ?? "web");

  if (normalizedPhone) {
    url.searchParams.set("phone", normalizedPhone);
  }

  return url.toString();
}

export function formatRegistrationPrompt(
  language: SupportedLanguage,
  registrationUrl: string,
) {
  const prompts: Record<SupportedLanguage, string> = {
    te: `Mundu register avvandi so I can save your crops and alerts.\nRegister: ${registrationUrl}\nTarvata "tomato price" ani pampandi.`,
    hi: `Pehle register kijiye taaki main aapki fasal aur alerts save kar sakun.\nRegister: ${registrationUrl}\nUske baad "tomato price" bhejiye.`,
    kn: `Modalu register madi, nimma bele mattu alerts save maadalu.\nRegister: ${registrationUrl}\nAamele "tomato price" endu kalisi.`,
    en: `Please register first so I can save your crops and alerts.\nRegister: ${registrationUrl}\nThen send "tomato price".`,
  };

  return prompts[language];
}
