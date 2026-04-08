import { NextRequest, NextResponse } from "next/server";

import { requireCronAuthorization } from "@/lib/api";
import { runDailyAlerts } from "@/lib/alerts/service";

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireCronAuthorization(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const result = await runDailyAlerts();

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to send daily alerts.",
      },
      { status: 500 },
    );
  }
}
