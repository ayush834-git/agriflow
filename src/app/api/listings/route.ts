import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { parseNumberParam } from "@/lib/api";
import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { createListing, listListings } from "@/lib/listings/store";
import { DEMO_FARMER_DEFAULT_ID, DEMO_FARMER_USERS } from "@/lib/users/demo";
import { findUserByClerkId } from "@/lib/users/store";

export async function GET(request: NextRequest) {
  try {
    const rawFarmerUserId = request.nextUrl.searchParams.get("farmerUserId") ?? undefined;
    const farmerUserId =
      rawFarmerUserId === "demo-farmer-ramu" ? DEMO_FARMER_DEFAULT_ID : rawFarmerUserId;

    const listings = await listListings({
      cropSlug: request.nextUrl.searchParams.get("crop") ?? undefined,
      district: request.nextUrl.searchParams.get("district") ?? undefined,
      minQuantityKg: request.nextUrl.searchParams.has("minQty")
        ? parseNumberParam(request.nextUrl.searchParams.get("minQty"), 1)
        : undefined,
      maxQuantityKg: request.nextUrl.searchParams.has("maxQty")
        ? parseNumberParam(request.nextUrl.searchParams.get("maxQty"), 100000)
        : undefined,
      farmerUserId,
      statuses: request.nextUrl.searchParams.get("status")
        ? (request.nextUrl.searchParams.get("status")!.split(",") as never)
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
    const body = (await request.json()) as {
      farmerUserId?: string;
      cropSlug?: string;
      quantityKg?: number;
      askingPricePerKg?: number;
      qualityGrade?: string;
      district?: string;
      state?: string;
      availableUntil?: string;
      notes?: string;
    };

    let effectiveFarmerUserId: string | null = null;

    // 1. Verify authenticated user identity via Clerk
    try {
      const session = await auth();
      if (session.userId) {
        const user = await findUserByClerkId(session.userId);
        if (user) {
          effectiveFarmerUserId = user.id;
        }
      }
    } catch {
      // Clerk not configured or unauthenticated
    }

    // 2. If unauthenticated, allow only verified demo users
    if (!effectiveFarmerUserId) {
      if (body.farmerUserId) {
        const requestedId =
          body.farmerUserId === "demo-farmer-ramu"
            ? DEMO_FARMER_DEFAULT_ID
            : body.farmerUserId;

        const isDemoUser = DEMO_FARMER_USERS.some(
          (u) => u.id === requestedId || u.id === body.farmerUserId,
        );

        if (isDemoUser) {
          effectiveFarmerUserId = requestedId;
        }
      }
    }

    if (!effectiveFarmerUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized: You must be logged in to create a listing.",
        },
        { status: 401 },
      );
    }

    if (!body.cropSlug) {
      return NextResponse.json(
        { ok: false, error: "Crop is required." },
        { status: 400 },
      );
    }

    // Validate crop exists
    getTargetCropOrThrow(body.cropSlug);

    const quantityKg = Number(body.quantityKg);
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      return NextResponse.json(
        { ok: false, error: "Quantity must be greater than 0 kg." },
        { status: 400 },
      );
    }

    if (!body.district || !body.state) {
      return NextResponse.json(
        { ok: false, error: "District and state are required." },
        { status: 400 },
      );
    }

    const listing = await createListing({
      farmerUserId: effectiveFarmerUserId,
      cropSlug: body.cropSlug,
      quantityKg,
      askingPricePerKg: body.askingPricePerKg ? Number(body.askingPricePerKg) : undefined,
      qualityGrade: body.qualityGrade ?? "A",
      district: body.district,
      state: body.state,
      availableUntil: body.availableUntil,
      notes: body.notes,
    });

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
