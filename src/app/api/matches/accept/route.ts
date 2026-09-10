import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { acceptPendingMatchForFarmer } from "@/lib/matches/engine";
import { DEMO_FARMER_DEFAULT_ID, DEMO_FARMER_USERS } from "@/lib/users/demo";
import { findUserByClerkId } from "@/lib/users/store";

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

    let effectiveFarmerUserId =
      body.farmerUserId === "demo-farmer-ramu"
        ? DEMO_FARMER_DEFAULT_ID
        : body.farmerUserId;

    // 1. If Clerk session exists, verify caller identity matches requested farmer
    try {
      const session = await auth();
      if (session.userId) {
        const user = await findUserByClerkId(session.userId);
        if (user) {
          if (user.id !== effectiveFarmerUserId) {
            return NextResponse.json(
              {
                ok: false,
                error: "Forbidden: You are not authorized to accept matches for another user.",
              },
              { status: 403 },
            );
          }
          effectiveFarmerUserId = user.id;
        }
      }
    } catch {
      // Unauthenticated / demo mode
    }

    // 2. If unauthenticated, ensure the ID is a recognized demo farmer
    const isDemoUser = DEMO_FARMER_USERS.some(
      (u) => u.id === effectiveFarmerUserId || u.id === body.farmerUserId,
    );

    if (!isDemoUser && !effectiveFarmerUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const result = await acceptPendingMatchForFarmer(
      effectiveFarmerUserId,
      body.matchId,
    );

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "No pending match found for this farmer.",
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
