import { generateMockAgmarknetFeed } from "@/lib/agmarknet/mock";
import type {
  NormalizedMandiPriceRecord,
  PriceGapRecord,
} from "@/lib/agmarknet/types";
import { computePriceGaps } from "@/lib/market/engine";

type DemoMarketState = {
  records: NormalizedMandiPriceRecord[];
  gaps: PriceGapRecord[];
  lastResetAt: string;
  activeTriggers: {
    tomatoPriceSpike: boolean;
  };
};

type ScenarioOptions = {
  tomatoPriceSpike?: boolean;
};

declare global {
  var __agriflowDemoMarketState: DemoMarketState | undefined;
}

const HISTORY_DAYS = 7;

function round(value: number) {
  return Number(value.toFixed(2));
}

function uniqueRecordKey(record: NormalizedMandiPriceRecord) {
  return [
    record.cropSlug,
    record.mandiName,
    record.district,
    record.state,
    record.marketDate,
    record.variety,
    record.grade,
  ].join(":");
}

function getLatestMarketDate(records: NormalizedMandiPriceRecord[]) {
  return [...new Set(records.map((record) => record.marketDate))]
    .sort((left, right) => right.localeCompare(left))[0];
}

function getTransportFeasibility(sourceState: string, targetState: string) {
  if (sourceState === targetState) {
    return 1.12;
  }

  if (sourceState === "Andhra Pradesh" && targetState === "Telangana") {
    return 1.04;
  }

  if (sourceState === "Andhra Pradesh" && targetState === "Karnataka") {
    return 0.98;
  }

  if (sourceState === "Telangana" && targetState === "Karnataka") {
    return 1.01;
  }

  return 0.95;
}

function updateLatestPriceRecord(
  records: NormalizedMandiPriceRecord[],
  input: {
    cropSlug: string;
    district: string;
    state: string;
    modalPrice: number;
    arrivalsTonnes: number;
    rationale: string;
  },
) {
  const latestMarketDate = getLatestMarketDate(records);

  if (!latestMarketDate) {
    return records;
  }

  return records.map((record) => {
    if (
      record.marketDate !== latestMarketDate ||
      record.cropSlug !== input.cropSlug ||
      record.district !== input.district ||
      record.state !== input.state
    ) {
      return record;
    }

    return {
      ...record,
      minPrice: round(input.modalPrice * 0.88),
      maxPrice: round(input.modalPrice * 1.12),
      modalPrice: input.modalPrice,
      arrivalsTonnes: input.arrivalsTonnes,
      rawPayload: {
        ...record.rawPayload,
        demo_override: input.rationale,
      },
    };
  });
}

function findLatestRecord(
  records: NormalizedMandiPriceRecord[],
  input: { cropSlug: string; district: string; state: string },
) {
  return [...records]
    .filter(
      (record) =>
        record.cropSlug === input.cropSlug &&
        record.district === input.district &&
        record.state === input.state,
    )
    .sort((left, right) => right.marketDate.localeCompare(left.marketDate))[0];
}

function buildSeededGap(
  records: NormalizedMandiPriceRecord[],
  input: {
    cropSlug: string;
    cropName: string;
    sourceDistrict: string;
    sourceState: string;
    targetDistrict: string;
    targetState: string;
    headline: string;
  },
): PriceGapRecord | null {
  const source = findLatestRecord(records, {
    cropSlug: input.cropSlug,
    district: input.sourceDistrict,
    state: input.sourceState,
  });
  const target = findLatestRecord(records, {
    cropSlug: input.cropSlug,
    district: input.targetDistrict,
    state: input.targetState,
  });

  if (!source || !target) {
    return null;
  }

  const priceGap = round(target.modalPrice - source.modalPrice);
  const averagePrice = round((source.modalPrice + target.modalPrice) / 2);
  const demandStrength = round(
    Math.min(1.8, Math.max(0.7, target.modalPrice / Math.max(averagePrice, 1))),
  );
  const transportFeasibility = round(
    getTransportFeasibility(source.state, target.state),
  );
  const opportunityScore = round(priceGap * demandStrength * transportFeasibility);
  const latestMarketDate = getLatestMarketDate(records);
  const windowEnd = latestMarketDate ? `${latestMarketDate}T00:00:00.000Z` : null;
  const windowStart = latestMarketDate
    ? `${new Date(
        new Date(`${latestMarketDate}T00:00:00.000Z`).getTime() -
          (HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10)}T00:00:00.000Z`
    : null;

  return {
    cropSlug: input.cropSlug,
    cropName: input.cropName,
    sourceDistrict: source.district,
    sourceState: source.state,
    sourceModalPrice: source.modalPrice,
    targetDistrict: target.district,
    targetState: target.state,
    targetModalPrice: target.modalPrice,
    priceGap,
    demandStrength,
    transportFeasibility,
    opportunityScore,
    distanceKm: null,
    dataWindowStartedAt: windowStart,
    dataWindowEndedAt: windowEnd,
    explanation: {
      source_arrivals_tonnes: source.arrivalsTonnes,
      target_arrivals_tonnes: target.arrivalsTonnes,
      average_price: averagePrice,
      rationale: [
        input.headline,
        `${target.district} is currently pricing above ${source.district} in the latest seeded demo snapshot.`,
        `The route remains intentionally seeded for the live demo path.`,
      ],
    },
    fetchedAt: new Date().toISOString(),
  } satisfies PriceGapRecord;
}

function buildPriorityGaps(
  records: NormalizedMandiPriceRecord[],
  options: ScenarioOptions,
): PriceGapRecord[] {
  const tomatoNarrative = options.tomatoPriceSpike
    ? "Hyderabad tomato demand tightened after the demo price-spike trigger."
    : "Kurnool to Hyderabad stays seeded as the primary tomato opportunity for the farmer demo.";
  const priority = [
    buildSeededGap(records, {
      cropSlug: "tomato",
      cropName: "Tomato",
      sourceDistrict: "Kurnool",
      sourceState: "Andhra Pradesh",
      targetDistrict: "Hyderabad",
      targetState: "Telangana",
      headline: tomatoNarrative,
    }),
    buildSeededGap(records, {
      cropSlug: "onion",
      cropName: "Onion",
      sourceDistrict: "Guntur",
      sourceState: "Andhra Pradesh",
      targetDistrict: "Bengaluru",
      targetState: "Karnataka",
      headline:
        "Guntur to Bengaluru remains seeded as the 40T onion movement recommendation for Suresh.",
    }),
  ];

  return priority.filter((gap): gap is PriceGapRecord => gap !== null);
}

function buildGaps(
  records: NormalizedMandiPriceRecord[],
  options: ScenarioOptions,
): PriceGapRecord[] {
  const computed = computePriceGaps(records, {
    maxSourceDistricts: 5,
    maxTargetDistricts: 5,
    maxPairsPerCrop: 8,
  });
  const priority = buildPriorityGaps(records, options);
  const seen = new Set<string>();

  return [...priority, ...computed].filter((gap) => {
    const key = [
      gap.cropSlug,
      gap.sourceDistrict,
      gap.targetDistrict,
      gap.priceGap,
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function applySeedScenario(
  records: NormalizedMandiPriceRecord[],
  options: ScenarioOptions,
) {
  let nextRecords = records;

  nextRecords = updateLatestPriceRecord(nextRecords, {
    cropSlug: "tomato",
    district: "Kurnool",
    state: "Andhra Pradesh",
    modalPrice: 1720,
    arrivalsTonnes: 86,
    rationale: "Seeded farmer-side tomato source pricing for Ramu in Kurnool.",
  });
  nextRecords = updateLatestPriceRecord(nextRecords, {
    cropSlug: "tomato",
    district: "Hyderabad",
    state: "Telangana",
    modalPrice: options.tomatoPriceSpike ? 3370 : 2820,
    arrivalsTonnes: options.tomatoPriceSpike ? 18 : 39,
    rationale: options.tomatoPriceSpike
      ? "Seeded Hyderabad tomato price spike for the live demo."
      : "Seeded Hyderabad tomato demand premium for the live demo.",
  });
  nextRecords = updateLatestPriceRecord(nextRecords, {
    cropSlug: "onion",
    district: "Guntur",
    state: "Andhra Pradesh",
    modalPrice: 2140,
    arrivalsTonnes: 112,
    rationale: "Seeded onion source pricing for the Guntur 40T lot.",
  });
  nextRecords = updateLatestPriceRecord(nextRecords, {
    cropSlug: "onion",
    district: "Bengaluru",
    state: "Karnataka",
    modalPrice: 3040,
    arrivalsTonnes: 34,
    rationale: "Seeded Bengaluru onion demand premium for the FPO demo.",
  });

  return nextRecords;
}

function buildSeededState(options: ScenarioOptions = {}): DemoMarketState {
  const seededAt = new Date().toISOString();
  const baselineRecords = generateMockAgmarknetFeed({
    historyDays: HISTORY_DAYS,
    fetchedAt: seededAt,
  });
  const records = applySeedScenario(baselineRecords, options);

  return {
    records,
    gaps: buildGaps(records, options),
    lastResetAt: seededAt,
    activeTriggers: {
      tomatoPriceSpike: options.tomatoPriceSpike ?? false,
    },
  };
}

function getDemoMarketState() {
  if (!globalThis.__agriflowDemoMarketState) {
    globalThis.__agriflowDemoMarketState = buildSeededState();
  }

  return globalThis.__agriflowDemoMarketState;
}

function filterRecordsByWindow(
  records: NormalizedMandiPriceRecord[],
  historyDays?: number,
) {
  if (!historyDays) {
    return records;
  }

  const latestMarketDate = getLatestMarketDate(records);

  if (!latestMarketDate) {
    return records;
  }

  const latest = new Date(`${latestMarketDate}T00:00:00.000Z`);
  const floor = new Date(latest);
  floor.setUTCDate(latest.getUTCDate() - Math.max(0, historyDays - 1));
  const floorValue = floor.toISOString().slice(0, 10);

  return records.filter((record) => record.marketDate >= floorValue);
}

export function listDemoMarketRecords(options: {
  cropSlugs?: string[];
  historyDays?: number;
} = {}) {
  const state = getDemoMarketState();
  let records = filterRecordsByWindow(state.records, options.historyDays);

  if (options.cropSlugs && options.cropSlugs.length > 0) {
    const cropSet = new Set(options.cropSlugs);
    records = records.filter((record) => cropSet.has(record.cropSlug));
  }

  return records;
}

export function listDemoPriceGaps(cropSlug: string, limit = 10) {
  return getDemoMarketState().gaps
    .filter((gap) => gap.cropSlug === cropSlug)
    .slice(0, limit);
}

export function resetDemoMarketState() {
  const nextState = buildSeededState();
  globalThis.__agriflowDemoMarketState = nextState;
  return nextState;
}

export function upsertDemoMarketRecords(records: NormalizedMandiPriceRecord[]) {
  const current = getDemoMarketState();
  const merged = new Map<string, NormalizedMandiPriceRecord>(
    current.records.map((record) => [uniqueRecordKey(record), record]),
  );

  for (const record of records) {
    merged.set(uniqueRecordKey(record), record);
  }

  const nextRecords = Array.from(merged.values()).sort((left, right) => {
    const dateDelta = right.marketDate.localeCompare(left.marketDate);

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return left.cropSlug.localeCompare(right.cropSlug);
  });
  const nextState: DemoMarketState = {
    ...current,
    records: nextRecords,
    gaps: buildGaps(nextRecords, current.activeTriggers),
  };

  globalThis.__agriflowDemoMarketState = nextState;
  return nextState;
}

export function replaceDemoPriceGaps(priceGaps: PriceGapRecord[]) {
  const current = getDemoMarketState();
  const affectedCropSlugs = new Set(priceGaps.map((gap) => gap.cropSlug));
  const nextState: DemoMarketState = {
    ...current,
    gaps: [
      ...priceGaps,
      ...current.gaps.filter((gap) => !affectedCropSlugs.has(gap.cropSlug)),
    ],
  };

  globalThis.__agriflowDemoMarketState = nextState;
  return nextState;
}

export function triggerDemoTomatoPriceSpike() {
  const nextState = buildSeededState({
    tomatoPriceSpike: true,
  });
  globalThis.__agriflowDemoMarketState = nextState;

  return {
    triggeredAt: new Date().toISOString(),
    latestTomatoPrices: listDemoMarketRecords({
      cropSlugs: ["tomato"],
      historyDays: 1,
    }),
    topTomatoRoute: listDemoPriceGaps("tomato", 1)[0] ?? null,
  };
}
