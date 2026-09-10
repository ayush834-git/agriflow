import { NextRequest, NextResponse } from "next/server";

import { connectListingMatch } from "@/lib/matches/engine";
import {
  listMatchesForCounterparty,
  listMatchesForFarmer,
} from "@/lib/matches/store";

export async function GET(request: NextRequest) {
  try {
    let farmerUserId = request.nextUrl.searchParams.get("farmerUserId");
    let counterpartyUserId = request.nextUrl.searchParams.get("counterpartyUserId");

    if (farmerUserId === "demo-farmer-ramu") {
      farmerUserId = "00000000-0000-0000-0000-000000000001";
    }
    if (counterpartyUserId === "demo-fpo-suresh") {
      counterpartyUserId = "00000000-0000-0000-0000-000000000011";
    }

    if (!farmerUserId && !counterpartyUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Provide farmerUserId or counterpartyUserId.",
        },
        { status: 400 },
      );
    }

    const matches = farmerUserId
      ? await listMatchesForFarmer(farmerUserId)
      : await listMatchesForCounterparty(counterpartyUserId!);

    return NextResponse.json({
      ok: true,
      matches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load matches.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      listingId?: string;
      inventoryId?: string;
      counterpartyUserId?: string;
    };

    if (!body.listingId) {
      return NextResponse.json(
        {
          ok: false,
          error: "listingId is required.",
        },
        { status: 400 },
      );
    }

    const result = await connectListingMatch({
      listingId: body.listingId,
      inventoryId: body.inventoryId,
      counterpartyUserId: body.counterpartyUserId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create match.",
      },
      { status: 500 },
    );
  }
}
