import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";

export function parseBooleanFlag(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

export function parseNumberParam(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRequestedMode(
  request: NextRequest,
): "auto" | "live" | "mock" {
  const rawMode = request.nextUrl.searchParams.get("mode");

  if (rawMode === "live" || rawMode === "mock") {
    return rawMode;
  }

  return "auto";
}

export function requireCronAuthorization(request: NextRequest) {
  const env = getEnv();

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    // In local dev and testing, allow testing cron endpoints without secret if not configured
    if (!env.CRON_SECRET) {
      return null;
    }
  }

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      {
        error: "CRON_SECRET is not configured on the server.",
      },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        error: "Unauthorized cron request. Bearer token mismatch.",
      },
      { status: 401 },
    );
  }

  return null;
}
