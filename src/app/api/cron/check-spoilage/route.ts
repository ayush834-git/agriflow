import { NextRequest, NextResponse } from "next/server";

import { requireCronAuthorization } from "@/lib/api";
import { runSpoilageChecks } from "@/lib/alerts/service";

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireCronAuthorization(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const result = await runSpoilageChecks();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to run spoilage checks.",
      },
      { status: 500 },
    );
  }
}
