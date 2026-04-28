import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  updateUserSettings,
  type UpdateUserSettingsInput,
} from "@/lib/users/store";
import { syncWhatsAppSessionLanguage } from "@/lib/whatsapp/session-store";

const supportedLanguageSchema = z.enum(["te", "hi", "kn", "en"]);

const settingsSchema = z.object({
  userId: z.string().trim().min(1, "Missing userId."),
  role: z.enum(["FARMER", "FPO"]),
  fullName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  preferredLanguage: supportedLanguageSchema,
  whatsappBotLanguage: supportedLanguageSchema.optional(),
  address: z.string().trim().max(300).optional().nullable(),
  district: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  farmerCropSlugs: z.array(z.string().trim().min(1)).optional(),
  organizationName: z.string().trim().max(180).optional().nullable(),
  districtsServed: z.array(z.string().trim().min(2)).optional(),
  cropsHandled: z.array(z.string().trim().min(1)).optional(),
  serviceRadiusKm: z.number().positive().max(10000).optional().nullable(),
  serviceSummary: z.string().trim().max(500).optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = settingsSchema.parse(await request.json());

    if (
      payload.role === "FARMER" &&
      payload.farmerCropSlugs &&
      payload.farmerCropSlugs.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Select at least one crop preference for farmer settings.",
        },
        { status: 400 },
      );
    }

    const updateInput: UpdateUserSettingsInput = {
      userId: payload.userId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      preferredLanguage: payload.preferredLanguage,
      whatsappBotLanguage: payload.whatsappBotLanguage,
      address: payload.address,
      district: payload.district,
      state: payload.state,
      farmerCropSlugs:
        payload.role === "FARMER" ? payload.farmerCropSlugs : undefined,
      organizationName:
        payload.role === "FPO" ? payload.organizationName : undefined,
      districtsServed:
        payload.role === "FPO" ? payload.districtsServed : undefined,
      cropsHandled: payload.role === "FPO" ? payload.cropsHandled : undefined,
      serviceRadiusKm:
        payload.role === "FPO" ? payload.serviceRadiusKm : undefined,
      serviceSummary:
        payload.role === "FPO" ? payload.serviceSummary : undefined,
    };

    const result = await updateUserSettings(updateInput);

    if (result.user.phone) {
      await syncWhatsAppSessionLanguage({
        phone: result.user.phone,
        language:
          result.user.whatsappBotLanguage ?? result.user.preferredLanguage,
        userId: result.user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
      cropPreferences: result.cropPreferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please fix invalid settings fields.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to save settings.",
      },
      { status: 500 },
    );
  }
}
