import { hasSupabaseWriteConfig } from "@/lib/env";
import { listDemoMarketRecords, upsertDemoMarketRecords } from "@/lib/demo/market";
import { fetchLiveAgmarknetFeed } from "@/lib/agmarknet/client";
import { toPersistableMandiPrice } from "@/lib/agmarknet/normalize";
import type { NormalizedMandiPriceRecord, PriceFeedResult } from "@/lib/agmarknet/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ResolveFeedOptions = {
  cropSlugs?: string[];
  historyDays?: number;
  mode?: "auto" | "live" | "mock";
};

function dedupeNormalizedRecords(records: NormalizedMandiPriceRecord[]) {
  const unique = new Map<string, NormalizedMandiPriceRecord>();

  for (const record of records) {
    unique.set(
      [
        record.cropSlug,
        record.mandiName,
        record.district,
        record.state,
        record.marketDate,
        record.variety,
        record.grade,
      ].join(":"),
      record,
    );
  }

  return Array.from(unique.values());
}

export async function resolveAgmarknetFeed(
  options: ResolveFeedOptions = {},
): Promise<PriceFeedResult> {
  const mode = options.mode ?? "auto";

  if (mode === "mock") {
    return {
      source: "mock",
      records: listDemoMarketRecords(options),
      warnings: ["Using seeded demo Agmarknet data because mock mode was requested."],
    };
  }

  if (mode === "live") {
    const live = await fetchLiveAgmarknetFeed(options);

    return {
      source: "live",
      records: live.records,
      warnings: live.warnings,
    };
  }

  try {
    const live = await fetchLiveAgmarknetFeed(options);

    if (live.records.length > 0) {
      return {
        source: "live",
        records: live.records,
        warnings: live.warnings,
      };
    }
  } catch (error) {
    return {
      source: "mock",
      records: listDemoMarketRecords(options),
      warnings: [
        error instanceof Error
          ? `Falling back to the seeded demo feed: ${error.message}`
          : "Falling back to the seeded demo feed because the live fetch failed.",
      ],
    };
  }

  return {
    source: "mock",
    records: listDemoMarketRecords(options),
    warnings: [
      "Live Agmarknet returned no records, so the seeded demo feed was used instead.",
    ],
  };
}

export async function persistMandiPriceFeed(records: NormalizedMandiPriceRecord[]) {
  if (!hasSupabaseWriteConfig()) {
    const nextState = upsertDemoMarketRecords(records);

    return {
      persisted: false,
      insertedCount: nextState.records.length,
    };
  }

  const uniqueRecords = dedupeNormalizedRecords(records).map(toPersistableMandiPrice);

  if (uniqueRecords.length === 0) {
    return {
      persisted: true,
      insertedCount: 0,
    };
  }

  const admin = getSupabaseAdminClient();

  for (let index = 0; index < uniqueRecords.length; index += 250) {
    const chunk = uniqueRecords.slice(index, index + 250);
    const { error } = await admin.from("mandi_prices").upsert(chunk as never, {
      onConflict: "crop_slug,mandi_name,district,state,market_date,variety,grade",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to persist mandi prices: ${error.message}`);
    }
  }

  return {
    persisted: true,
    insertedCount: uniqueRecords.length,
  };
}
