import { NextResponse } from "next/server";

import { resetDemoSystem } from "@/lib/demo/system";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await resetDemoSystem();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to reset demo state.",
      },
      { status: 500 },
    );
  }
}
