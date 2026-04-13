import { NextRequest, NextResponse } from "next/server";

import { updateUserSettings } from "@/lib/users/store";
import { syncWhatsAppSessionLanguage } from "@/lib/whatsapp/session-store";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["te", "hi", "kn", "en"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      preferredLanguage?: SupportedLanguage;
    };

    if (!body.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing userId.",
        },
        { status: 400 },
      );
    }

    if (!body.preferredLanguage || !SUPPORTED_LANGUAGES.includes(body.preferredLanguage)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported preferredLanguage.",
        },
        { status: 400 },
      );
    }

    const { user } = await updateUserSettings({
      userId: body.userId,
      preferredLanguage: body.preferredLanguage,
      whatsappBotLanguage: body.preferredLanguage,
    });

    if (user.phone) {
      await syncWhatsAppSessionLanguage({
        phone: user.phone,
        language: user.whatsappBotLanguage ?? user.preferredLanguage,
        userId: user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update user preferences.",
      },
      { status: 500 },
    );
  }
}
