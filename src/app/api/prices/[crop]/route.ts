import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRequestedMode, parseBooleanFlag, parseNumberParam } from "@/lib/api";
import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { latestPricesForCrop } from "@/lib/market/engine";
import { computeMarketForecast } from "@/lib/market/forecast";
import { loadStoredPricesForCrop } from "@/lib/market/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ crop: string }> },
) {
  try {
    const { crop } = await context.params;
    const targetCrop = getTargetCropOrThrow(crop);
    const limit = parseNumberParam(request.nextUrl.searchParams.get("limit"), 15);
    const districtFilter = request.nextUrl.searchParams.get("district");
    const wantForecast = parseBooleanFlag(request.nextUrl.searchParams.get("forecast"));
    const mode = getRequestedMode(request);
    let prices = await loadStoredPricesForCrop(targetCrop.slug);
    let source: "database" | "live" | "mock" = hasSupabaseWriteConfig()
      ? "database"
      : "mock";
    const warnings: string[] = [];

    if (prices.length === 0 || mode !== "auto") {
      const feed = await resolveAgmarknetFeed({
        cropSlugs: [targetCrop.slug],
        historyDays: 7,
        mode,
      });

      prices = feed.records;
      source = feed.source;
      warnings.push(...feed.warnings);
    } else if (!hasSupabaseWriteConfig()) {
      warnings.push("Using the seeded demo market snapshot.");
    }

    let matchingRecords = prices;
    if (districtFilter) {
      const filteredByDistrict = prices.filter(
        (p) => p.district.toLowerCase() === districtFilter.toLowerCase(),
      );
      if (filteredByDistrict.length > 0) {
        matchingRecords = filteredByDistrict;
      }
    }

    const latest = latestPricesForCrop(matchingRecords, targetCrop.slug).slice(0, limit);

    const forecast = wantForecast
      ? computeMarketForecast(prices, {
          cropName: targetCrop.name,
          cropSlug: targetCrop.slug,
          district: districtFilter ?? undefined,
          source,
        })
      : undefined;

    return NextResponse.json(
      {
        crop: {
          slug: targetCrop.slug,
          name: targetCrop.name,
        },
        source,
        dataFreshness: source === "live" ? "LIVE" : source === "database" ? "STALE" : "DEMO",
        count: latest.length,
        prices: latest.map((record) => ({
          district: record.district,
          state: record.state,
          mandiName: record.mandiName,
          marketDate: record.marketDate,
          minPrice: record.minPrice,
          maxPrice: record.maxPrice,
          modalPrice: record.modalPrice,
          arrivalsTonnes: record.arrivalsTonnes,
          fetchedAt: record.fetchedAt,
        })),
        forecast,
        warnings,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load crop prices.",
      },
      { status: 400 },
    );
  }
}
