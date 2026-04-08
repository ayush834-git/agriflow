import { NextRequest, NextResponse } from "next/server";

import { parseNumberParam } from "@/lib/api";
import { createListing, listListings } from "@/lib/listings/store";

export async function GET(request: NextRequest) {
  try {
    const listings = await listListings({
      cropSlug: request.nextUrl.searchParams.get("crop") ?? undefined,
      district: request.nextUrl.searchParams.get("district") ?? undefined,
      minQuantityKg: request.nextUrl.searchParams.has("minQty")
        ? parseNumberParam(request.nextUrl.searchParams.get("minQty"), 1)
        : undefined,
      maxQuantityKg: request.nextUrl.searchParams.has("maxQty")
        ? parseNumberParam(request.nextUrl.searchParams.get("maxQty"), 100000)
        : undefined,
      farmerUserId: request.nextUrl.searchParams.get("farmerUserId") ?? undefined,
      statuses: request.nextUrl.searchParams.get("status")
        ? request.nextUrl.searchParams.get("status")!.split(",") as never
        : undefined,
    });

    return NextResponse.json({
      ok: true,
      listings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list listings.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Parameters<typeof createListing>[0];
    const listing = await createListing(body);

    return NextResponse.json({
      ok: true,
      listing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create listing.",
      },
      { status: 500 },
    );
  }
}
