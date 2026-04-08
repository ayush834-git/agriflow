import { NextResponse } from "next/server";

import { triggerDemoSpoilageAlert } from "@/lib/demo/system";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await triggerDemoSpoilageAlert();

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
            : "Failed to trigger the spoilage demo flow.",
      },
      { status: 500 },
    );
  }
}
