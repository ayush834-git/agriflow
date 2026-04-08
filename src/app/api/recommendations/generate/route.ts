import { NextRequest, NextResponse } from "next/server";

import { generateRecommendationsForInventory } from "@/lib/recommendations/engine";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      inventoryId?: string;
      force?: boolean;
    };

    if (!body.inventoryId) {
      return NextResponse.json(
        { ok: false, error: "inventoryId is required." },
        { status: 400 },
      );
    }

    const recommendations = await generateRecommendationsForInventory(body.inventoryId, {
      force: body.force ?? false,
    });

    return NextResponse.json({
      ok: true,
      recommendations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to generate recommendations.",
      },
      { status: 500 },
    );
  }
}
