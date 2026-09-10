import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getTargetCropOrThrow, TARGET_CROPS } from "@/lib/agmarknet/catalog";
import { loadStoredPricesForCrop } from "@/lib/market/repository";
import { getMandis } from "@/lib/mandis/catalog";
import type { MandiMarketWithPrice } from "@/lib/mandis/types";
import { normalizeMandiPriceToPerKg } from "@/lib/financial/units";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stateFilter = searchParams.get("state");
    const cropQuery = searchParams.get("crop") || searchParams.get("commodity") || "tomato";
    const nearDistrict = searchParams.get("nearDistrict") || "Kurnool";
    const radiusParam = searchParams.get("radiusKm");
    const radiusKm = radiusParam ? Number(radiusParam) : null;

    // Resolve target crop safely
    let targetCrop = TARGET_CROPS[0];
    try {
      targetCrop = getTargetCropOrThrow(cropQuery);
    } catch {
      targetCrop = TARGET_CROPS.find((c) => c.name.toLowerCase() === cropQuery.toLowerCase()) ?? TARGET_CROPS[0];
    }

    // 1. Discover all verified mandis matching geographical constraints
    const baseMandis = getMandis({
      state: stateFilter,
      nearDistrict,
      radiusKm,
    });

    // 2. Load stored price snapshot for the requested crop (using non-blocking in-memory cache)
    const storedPrices = await loadStoredPricesForCrop(targetCrop.slug).catch(() => []);

    // 3. Map prices onto mandis using name/district correlation
    const mandisWithPrices: MandiMarketWithPrice[] = baseMandis.map((mandi) => {
      // Find matching price record for this mandi or district
      const matchingRecord =
        storedPrices.find(
          (p) =>
            p.district.toLowerCase() === mandi.district.toLowerCase() &&
            (p.mandiName.toLowerCase().includes(mandi.name.toLowerCase()) ||
              mandi.name.toLowerCase().includes(p.mandiName.toLowerCase())),
        ) ??
        storedPrices.find(
          (p) => p.district.toLowerCase() === mandi.district.toLowerCase(),
        );

      if (!matchingRecord) {
        return {
          ...mandi,
          price: null,
          dataFreshness: "NO_DATA",
        };
      }

      const modalPricePerKg = normalizeMandiPriceToPerKg(matchingRecord.modalPrice);

      return {
        ...mandi,
        price: {
          commodity: targetCrop.name,
          cropSlug: targetCrop.slug,
          marketDate: matchingRecord.marketDate,
          minPrice: matchingRecord.minPrice,
          maxPrice: matchingRecord.maxPrice,
          modalPrice: matchingRecord.modalPrice,
          modalPricePerKg,
          arrivalsTonnes: matchingRecord.arrivalsTonnes,
          variety: matchingRecord.variety,
          grade: matchingRecord.grade,
          source: "STALE",
        },
        dataFreshness: "STALE",
      };
    });

    // Compute stats
    const withPrices = mandisWithPrices.filter((m) => m.price !== null);
    const nearestMandi = mandisWithPrices[0] ?? null;
    const bestPriceMandi =
      withPrices.length > 0
        ? [...withPrices].sort((a, b) => (b.price?.modalPrice ?? 0) - (a.price?.modalPrice ?? 0))[0]
        : null;

    return NextResponse.json(
      {
        count: mandisWithPrices.length,
        crop: {
          slug: targetCrop.slug,
          name: targetCrop.name,
        },
        nearDistrict,
        filters: {
          state: stateFilter ?? "all",
          crop: targetCrop.slug,
        },
        stats: {
          totalMarkets: mandisWithPrices.length,
          marketsWithPrices: withPrices.length,
          nearestMandiId: nearestMandi?.id ?? null,
          bestPriceMandiId: bestPriceMandi?.id ?? null,
        },
        mandis: mandisWithPrices,
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
        error: error instanceof Error ? error.message : "Failed to load mandi directory.",
      },
      { status: 500 },
    );
  }
}
