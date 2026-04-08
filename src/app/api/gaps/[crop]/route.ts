import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getRequestedMode, parseNumberParam } from "@/lib/api";
import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { hasSupabaseWriteConfig } from "@/lib/env";
import { computePriceGaps } from "@/lib/market/engine";
import { loadStoredGapsForCrop } from "@/lib/market/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ crop: string }> },
) {
  try {
    const { crop } = await context.params;
    const targetCrop = getTargetCropOrThrow(crop);
    const limit = parseNumberParam(request.nextUrl.searchParams.get("limit"), 10);
    const mode = getRequestedMode(request);
    let gaps = await loadStoredGapsForCrop(targetCrop.slug, limit);
    let source: "database" | "live" | "mock" = hasSupabaseWriteConfig()
      ? "database"
      : "mock";
    const warnings: string[] = [];

    if (gaps.length === 0 || mode !== "auto") {
      const feed = await resolveAgmarknetFeed({
        cropSlugs: [targetCrop.slug],
        historyDays: 7,
        mode,
      });

      gaps = computePriceGaps(feed.records)
        .filter((record) => record.cropSlug === targetCrop.slug)
        .slice(0, limit);
      source = feed.source;
      warnings.push(...feed.warnings);
    } else if (!hasSupabaseWriteConfig()) {
      warnings.push("Using the seeded demo opportunity routes.");
    }

    return NextResponse.json({
      crop: {
        slug: targetCrop.slug,
        name: targetCrop.name,
      },
      source,
      count: gaps.length,
      routes: gaps.map((gap) => ({
        sourceDistrict: gap.sourceDistrict,
        sourceState: gap.sourceState,
        sourceModalPrice: gap.sourceModalPrice,
        targetDistrict: gap.targetDistrict,
        targetState: gap.targetState,
        targetModalPrice: gap.targetModalPrice,
        priceGap: gap.priceGap,
        demandStrength: gap.demandStrength,
        transportFeasibility: gap.transportFeasibility,
        opportunityScore: gap.opportunityScore,
        fetchedAt: gap.fetchedAt,
        explanation: gap.explanation,
      })),
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load crop gaps.",
      },
      { status: 400 },
    );
  }
}
