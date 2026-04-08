import { NextRequest, NextResponse } from "next/server";

import { acceptPendingMatchForFarmer } from "@/lib/matches/engine";
import { findMatchById } from "@/lib/matches/store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      matchId: string;
    };

    if (!body.matchId) {
      return NextResponse.json(
        {
          ok: false,
          error: "matchId is required.",
        },
        { status: 400 },
      );
    }

    const match = await findMatchById(body.matchId);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: "Match not found." },
        { status: 404 }
      );
    }

    if (!match.farmerUserId) {
      return NextResponse.json(
        { ok: false, error: "Match has no farmer assigned." },
        { status: 400 }
      );
    }

    const result = await acceptPendingMatchForFarmer(match.farmerUserId, match.id);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to simulate match acceptance.",
      },
      { status: 500 },
    );
  }
}
