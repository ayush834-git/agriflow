import { getAgmarknetConfig } from "@/lib/env";
import { getDistrictsForState, resolveRequestedCrops } from "@/lib/agmarknet/catalog";
import { normalizeAgmarknetRecord } from "@/lib/agmarknet/normalize";
import type {
  AgmarknetApiResponse,
  AgmarknetRawRecord,
  NormalizedMandiPriceRecord,
} from "@/lib/agmarknet/types";

type LiveFetchOptions = {
  cropSlugs?: string[];
  historyDays?: number;
  limit?: number;
  maxPages?: number;
};

function buildUrl(baseUrl: string, resourceId: string, searchParams: URLSearchParams) {
  return `${baseUrl.replace(/\/$/, "")}/${resourceId}?${searchParams.toString()}`;
}

async function requestAgmarknetRecords(params: URLSearchParams, init?: RequestInit) {
  const { apiKey, resourceId, baseUrl } = getAgmarknetConfig();

  if (!apiKey || !resourceId) {
    throw new Error(
      "Missing AGMARKNET_API_KEY or AGMARKNET_RESOURCE_ID for live Agmarknet fetches.",
    );
  }

  params.set("api-key", apiKey);
  params.set("format", "json");

  const response = await fetch(buildUrl(baseUrl, resourceId, params), {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Agmarknet request failed with status ${response.status}.`);
  }

  return (await response.json()) as AgmarknetApiResponse;
}

function dedupeRawRecords(records: AgmarknetRawRecord[]) {
  const unique = new Map<string, AgmarknetRawRecord>();

  for (const record of records) {
    unique.set(JSON.stringify(record), record);
  }

  return Array.from(unique.values());
}

export async function fetchLiveAgmarknetFeed(options: LiveFetchOptions = {}) {
  const fetchedAt = new Date().toISOString();
  const historyDays = Math.max(1, options.historyDays ?? 1);
  const limit = options.limit ?? 500;
  const maxPages = options.maxPages ?? 1;
  const crops = resolveRequestedCrops(options.cropSlugs);
  const warnings: string[] = [];
  const normalizedRecords: NormalizedMandiPriceRecord[] = [];

  const STATES = ["Andhra Pradesh", "Telangana", "Karnataka"];

  // Fetch all crop×state combinations in parallel
  const fetchTasks = crops.flatMap((crop) =>
    STATES.map(async (state) => {
      const districts = new Set(getDistrictsForState(state));
      let stateRecords: AgmarknetRawRecord[] = [];

      for (const commodityFilter of crop.commodityFilters) {
        const commodityRecords: AgmarknetRawRecord[] = [];

        for (let page = 0; page < maxPages; page += 1) {
          const params = new URLSearchParams({
            limit: String(limit),
            offset: String(page * limit),
          });
          params.set("filters[state]", state);
          params.set("filters[commodity]", commodityFilter);

          try {
            const payload = await requestAgmarknetRecords(params);
            const records = payload.records ?? [];
            commodityRecords.push(...records);
            if (records.length < limit) break;
          } catch {
            break;
          }
        }

        if (commodityRecords.length > 0) {
          stateRecords = commodityRecords;
          break;
        }
      }

      if (stateRecords.length === 0) {
        warnings.push(`No live records returned for ${crop.name} in ${state}.`);
        return;
      }

      const lowerBoundDate = new Date();
      lowerBoundDate.setUTCDate(lowerBoundDate.getUTCDate() - (historyDays - 1));

      for (const record of dedupeRawRecords(stateRecords)) {
        const normalized = normalizeAgmarknetRecord(record, fetchedAt, {
          slug: crop.slug,
          name: crop.name,
        });

        if (!normalized || !districts.has(normalized.district)) continue;
        if (new Date(`${normalized.marketDate}T00:00:00Z`) < lowerBoundDate) continue;

        normalizedRecords.push(normalized);
      }
    }),
  );

  await Promise.all(fetchTasks);

  return {
    records: normalizedRecords,
    warnings,
  };
}
