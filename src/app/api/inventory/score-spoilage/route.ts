import { NextResponse } from "next/server";

import { scoreSpoilageRisk } from "@/lib/inventory/scoring";
import type { SpoilageScoreInput } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SpoilageScoreInput;
    const result = scoreSpoilageRisk(payload);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to score spoilage risk.",
      },
      { status: 500 },
    );
  }
}
