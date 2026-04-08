import { NextRequest, NextResponse } from "next/server";

import { acceptPendingMatchForFarmer } from "@/lib/matches/engine";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      farmerUserId?: string;
      matchId?: string;
    };

    if (!body.farmerUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "farmerUserId is required.",
        },
        { status: 400 },
      );
    }

    const result = await acceptPendingMatchForFarmer(body.farmerUserId, body.matchId);

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "No pending match found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to accept match.",
      },
      { status: 500 },
    );
  }
}
