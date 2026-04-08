import { NextRequest, NextResponse } from "next/server";

import {
  createInventory,
  DEMO_FPO_OWNER_ID,
  listInventory,
} from "@/lib/inventory/store";
import type { AddInventoryPayload } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ownerUserId =
      request.nextUrl.searchParams.get("ownerUserId") ?? DEMO_FPO_OWNER_ID;
    const inventory = await listInventory(ownerUserId);

    return NextResponse.json({
      ok: true,
      inventory,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load inventory.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AddInventoryPayload;
    const inventory = await createInventory(payload);

    return NextResponse.json({
      ok: true,
      inventory,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create inventory.",
      },
      { status: 500 },
    );
  }
}
