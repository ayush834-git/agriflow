import { NextResponse } from "next/server";

import { triggerDemoMatch } from "@/lib/demo/system";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await triggerDemoMatch();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to trigger the demo match.",
      },
      { status: 500 },
    );
  }
}
