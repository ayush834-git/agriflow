import { NextRequest, NextResponse } from "next/server";

import { updateUserPreferredLanguage } from "@/lib/users/store";
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

    const user = await updateUserPreferredLanguage(body.userId, body.preferredLanguage);

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
