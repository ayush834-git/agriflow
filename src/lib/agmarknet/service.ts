import { hasSupabaseWriteConfig } from "@/lib/env";
import { listDemoMarketRecords, upsertDemoMarketRecords } from "@/lib/demo/market";
import { fetchLiveAgmarknetFeed } from "@/lib/agmarknet/client";
import { toPersistableMandiPrice } from "@/lib/agmarknet/normalize";
import type { NormalizedMandiPriceRecord, PriceFeedResult } from "@/lib/agmarknet/types";
import { getRedisClient } from "@/lib/redis";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type ResolveFeedOptions = {
  cropSlugs?: string[];
  historyDays?: number;
  mode?: "auto" | "live" | "mock";
};

type LiveFeedCacheEntry = {
  records: NormalizedMandiPriceRecord[];
  warnings: string[];
  cachedAt: string;
};

const LIVE_FEED_FRESH_TTL_SECONDS = 8 * 60;
const LIVE_FEED_STALE_TTL_SECONDS = 90 * 60;

declare global {
  var __agriflowLiveFeedCache: Map<string, LiveFeedCacheEntry> | undefined;
}

function getLiveFeedMemoryCache() {
  if (!globalThis.__agriflowLiveFeedCache) {
    globalThis.__agriflowLiveFeedCache = new Map<string, LiveFeedCacheEntry>();
  }

  return globalThis.__agriflowLiveFeedCache;
}

function normalizeResolveFeedOptions(options: ResolveFeedOptions) {
  return {
    cropSlugs: [...new Set(options.cropSlugs ?? [])].sort(),
    historyDays: Math.max(1, options.historyDays ?? 1),
  };
}

function buildLiveFeedCacheKey(options: ResolveFeedOptions) {
  const normalized = normalizeResolveFeedOptions(options);
  const cropPart = normalized.cropSlugs.length > 0 ? normalized.cropSlugs.join(",") : "all";

  return `agmarknet:live-feed:v1:${normalized.historyDays}:${cropPart}`;
}

function toCacheAgeSeconds(cachedAt: string) {
  return Math.max(0, Math.round((Date.now() - new Date(cachedAt).getTime()) / 1000));
}

async function readLiveFeedCache(cacheKey: string) {
  const redis = getRedisClient();

  if (redis) {
    const cached = await redis.get<LiveFeedCacheEntry>(cacheKey);

    if (cached?.records?.length) {
      return {
        entry: cached,
        ageSeconds: toCacheAgeSeconds(cached.cachedAt),
      };
    }
  }

  const memoryEntry = getLiveFeedMemoryCache().get(cacheKey);
  if (!memoryEntry?.records?.length) {
    return null;
  }

  return {
    entry: memoryEntry,
    ageSeconds: toCacheAgeSeconds(memoryEntry.cachedAt),
  };
}

async function writeLiveFeedCache(cacheKey: string, entry: LiveFeedCacheEntry) {
  getLiveFeedMemoryCache().set(cacheKey, entry);

  const redis = getRedisClient();
  if (redis) {
    await redis.set(cacheKey, entry, { ex: LIVE_FEED_STALE_TTL_SECONDS });
  }
}

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
  const normalizedOptions = normalizeResolveFeedOptions(options);
  const cacheKey = buildLiveFeedCacheKey(normalizedOptions);

  if (mode === "mock") {
    return {
      source: "mock",
      records: listDemoMarketRecords(options),
      warnings: ["Using seeded demo Agmarknet data because mock mode was requested."],
    };
  }

  const cached = await readLiveFeedCache(cacheKey);

  if (cached && cached.ageSeconds <= LIVE_FEED_FRESH_TTL_SECONDS) {
    return {
      source: "live",
      records: cached.entry.records,
      warnings: [
        ...cached.entry.warnings,
        `Using cached live Agmarknet feed (${Math.max(
          1,
          Math.round(cached.ageSeconds / 60),
        )} minute(s) old).`,
      ],
    };
  }

  try {
    const live = await fetchLiveAgmarknetFeed(normalizedOptions);

    if (live.records.length > 0) {
      await writeLiveFeedCache(cacheKey, {
        records: live.records,
        warnings: live.warnings,
        cachedAt: new Date().toISOString(),
      });

      return {
        source: "live",
        records: live.records,
        warnings: live.warnings,
      };
    }

    if (cached && cached.ageSeconds <= LIVE_FEED_STALE_TTL_SECONDS) {
      return {
        source: "live",
        records: cached.entry.records,
        warnings: [
          ...cached.entry.warnings,
          "Live Agmarknet returned no records, so stale live cache was used.",
        ],
      };
    }
  } catch (error) {
    if (cached && cached.ageSeconds <= LIVE_FEED_STALE_TTL_SECONDS) {
      return {
        source: "live",
        records: cached.entry.records,
        warnings: [
          ...cached.entry.warnings,
          error instanceof Error
            ? `Live Agmarknet failed, using stale cached feed: ${error.message}`
            : "Live Agmarknet failed, using stale cached feed.",
        ],
      };
    }

    if (mode === "live") {
      throw error;
    }

    return {
      source: "mock",
      records: listDemoMarketRecords(normalizedOptions),
      warnings: [
        error instanceof Error
          ? `Falling back to the seeded demo feed: ${error.message}`
          : "Falling back to the seeded demo feed because the live fetch failed.",
      ],
    };
  }

  if (mode === "live") {
    throw new Error("Live Agmarknet returned no records.");
  }

  return {
    source: "mock",
    records: listDemoMarketRecords(normalizedOptions),
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
