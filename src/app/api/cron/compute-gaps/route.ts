import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getRequestedMode,
  parseNumberParam,
  requireCronAuthorization,
} from "@/lib/api";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { computePriceGaps } from "@/lib/market/engine";
import { replaceStoredPriceGaps } from "@/lib/market/repository";

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
    const priceGaps = computePriceGaps(feed.records);
    const persistence = await replaceStoredPriceGaps(priceGaps);

    return NextResponse.json({
      ok: true,
      source: feed.source,
      cropCount: new Set(priceGaps.map((record) => record.cropSlug)).size,
      routeCount: priceGaps.length,
      persisted: persistence.persisted,
      insertedCount: persistence.insertedCount,
      warnings: feed.warnings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to compute price gaps.",
      },
      { status: 500 },
    );
  }
}
