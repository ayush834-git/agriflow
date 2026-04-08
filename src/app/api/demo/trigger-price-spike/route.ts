import { NextResponse } from "next/server";

import { triggerDemoPriceSpike } from "@/lib/demo/system";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = triggerDemoPriceSpike();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to trigger the demo price spike.",
      },
      { status: 500 },
    );
  }
}
