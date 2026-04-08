import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getRequestedMode,
  parseNumberParam,
  requireCronAuthorization,
} from "@/lib/api";
import { persistMandiPriceFeed, resolveAgmarknetFeed } from "@/lib/agmarknet/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireCronAuthorization(request);

    if (unauthorized) {
      return unauthorized;
    }

    const mode = getRequestedMode(request);
    const historyDays = parseNumberParam(
      request.nextUrl.searchParams.get("historyDays"),
      mode === "mock" ? 7 : 1,
    );
    const cropSlugs = request.nextUrl.searchParams
      .get("crops")
      ?.split(",")
      .filter((value): value is string => Boolean(value));
    const feed = await resolveAgmarknetFeed({
      cropSlugs,
      historyDays,
      mode,
    });
    const persistence = await persistMandiPriceFeed(feed.records);

    return NextResponse.json({
      ok: true,
      source: feed.source,
      historyDays,
      cropCount: new Set(feed.records.map((record) => record.cropSlug)).size,
      recordCount: feed.records.length,
      persisted: persistence.persisted,
      insertedCount: persistence.insertedCount,
      warnings: feed.warnings,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch mandi prices.",
      },
      { status: 500 },
    );
  }
}
