import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import type { PriceGapRecord } from "@/lib/agmarknet/types";
import { getEnv } from "@/lib/env";
import { getGeminiClient } from "@/lib/gemini";
import {
  findInventoryById,
  listInventory,
} from "@/lib/inventory/store";
import type { InventoryItem, RiskLevel } from "@/lib/inventory/types";
import { computePriceGaps } from "@/lib/market/engine";
import { loadStoredGapsForCrop } from "@/lib/market/repository";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";
import {
  listRecommendationsForInventory,
  replaceRecommendationsForInventory,
} from "@/lib/recommendations/store";
import type {
  CreateRecommendationPayload,
  MovementRecommendation,
} from "@/lib/recommendations/types";
import { getRedisClient } from "@/lib/redis";
import { getWeatherForLocation } from "@/lib/weather/service";
import { z } from "zod";

const TRANSPORT_RATE_PER_KM_INR = 24;
const STORAGE_COST_PER_KG_PER_DAY_INR = 0.35;

function round(value: number) {
  return Number(value.toFixed(2));
}

function daysUntil(dateValue: string) {
  const start = new Date();
  const end = new Date(`${dateValue}T23:59:59.000Z`);
  const diff = end.getTime() - start.getTime();

  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function deriveUrgency(item: InventoryItem): RiskLevel {
  const daysLeft = daysUntil(item.deadlineDate);

  if (item.spoilageLevel === "CRITICAL" || daysLeft <= 1) {
    return "CRITICAL";
  }

  if (item.spoilageLevel === "HIGH" || daysLeft <= 3) {
    return "HIGH";
  }

  if (item.spoilageLevel === "MEDIUM" || daysLeft <= 5) {
    return "MEDIUM";
  }

  return "LOW";
}

function estimateDistanceKm(sourceDistrict: string, targetDistrict: string) {
  const source = DISTRICT_POSITIONS[sourceDistrict];
  const target = DISTRICT_POSITIONS[targetDistrict];

  if (!source || !target) {
    return 240;
  }

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const euclidean = Math.sqrt(dx * dx + dy * dy);

  return round(Math.max(70, euclidean * 3.4));
}

async function fetchDistanceKmGoogle(sourceDistrict: string, targetDistrict: string): Promise<number> {
  const env = getEnv();
  const redis = getRedisClient();
  const cacheKey = `maps:distance:${sourceDistrict}:${targetDistrict}`;

  if (redis) {
    const cached = await redis.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  if (!env.GOOGLE_MAPS_API_KEY) {
    return estimateDistanceKm(sourceDistrict, targetDistrict);
  }

  try {
    const origins = encodeURIComponent(`${sourceDistrict}, India`);
    const destinations = encodeURIComponent(`${targetDistrict}, India`);
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
       throw new Error(`Google Maps API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
      const meters = data.rows[0].elements[0].distance.value;
      const distance = round(meters / 1000);
      
      if (redis) {
        // Cache for 30 days to heavily limit API cost surface area
        await redis.setex(cacheKey, 60 * 60 * 24 * 30, distance);
      }
      return distance;
    }
  } catch (error) {
    console.error("Distance matrix fetch failed, falling back to heuristics.", error);
  }

  return estimateDistanceKm(sourceDistrict, targetDistrict);
}

async function getWeatherSignal(item: InventoryItem) {
  const w = await getWeatherForLocation(item.district, item.state);
  return {
    weatherPressure: round(w.pressureFactor),
    summary: w.description,
    temperatureCelsius: w.temperatureCelsius,
    humidityPercent: w.humidityPercent,
  };
}

async function getRouteCandidates(cropSlug: string, sourceDistrict: string) {
  let routes = await loadStoredGapsForCrop(cropSlug, 12);

  if (routes.length === 0) {
    const feed = await resolveAgmarknetFeed({
      cropSlugs: [cropSlug],
      historyDays: 7,
      mode: "mock",
    });
    routes = computePriceGaps(feed.records, {
      maxSourceDistricts: 5,
      maxTargetDistricts: 5,
      maxPairsPerCrop: 8,
    }).filter((record) => record.cropSlug === cropSlug);
  }

  const sourceFirst = routes.filter((route) => route.sourceDistrict === sourceDistrict);

  return (sourceFirst.length > 0 ? sourceFirst : routes).slice(0, 3);
}

async function buildReasoning(item: InventoryItem, route: PriceGapRecord) {
  const daysLeft = daysUntil(item.deadlineDate);
  const arrivalsSignal = Number(route.explanation.source_arrivals_tonnes ?? 0);
  const targetArrivals = Number(route.explanation.target_arrivals_tonnes ?? 0);
  const weather = await getWeatherSignal(item);

  return [
    `${route.targetDistrict} is pricing ${item.cropName} ${Math.round(route.priceGap)} rupees per quintal above ${route.sourceDistrict}.`,
    arrivalsSignal > targetArrivals
      ? `Source arrivals are fuller than the destination, which supports moving stock out now.`
      : `Destination arrivals stay tighter than the source snapshot, which protects margins.`,
    daysLeft <= 3
      ? `Only ${daysLeft} day(s) remain before the cold-storage deadline, so waiting increases spoilage pressure.`
      : `There are ${daysLeft} days before the deadline, giving enough time for a planned dispatch.`,
    weather.summary,
  ];
}

const GeminiEngineOutputSchema = z.object({
  reasoningLines: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  whatCouldChange: z.string(),
});

async function buildRecommendationPayload(
  item: InventoryItem,
  route: PriceGapRecord,
): Promise<CreateRecommendationPayload> {
  const distanceKm = await fetchDistanceKmGoogle(item.district, route.targetDistrict);
  const transportCostInr = round(distanceKm * TRANSPORT_RATE_PER_KM_INR);
  const daysLeft = daysUntil(item.deadlineDate);
  const storageCostPerKgInr = round(daysLeft * STORAGE_COST_PER_KG_PER_DAY_INR);
  const priceGapPerKgInr = round(route.priceGap / 100);
  const transportPerKgInr = round(transportCostInr / Math.max(item.quantityKg, 1));
  const netProfitPerKgInr = round(
    priceGapPerKgInr - transportPerKgInr - storageCostPerKgInr,
  );
  const totalNetProfitInr = round(netProfitPerKgInr * item.quantityKg);
  const weather = await getWeatherSignal(item);
  
  const urgencyFallback = deriveUrgency(item);
  const confidenceFallback = round(
    Math.min(
      0.94,
      0.46 +
        route.transportFeasibility * 0.14 +
        route.demandStrength * 0.16 +
        weather.weatherPressure * 0.08,
    ),
  );
  const staticReasoning = await buildReasoning(item, route);

  let finalReasoning = staticReasoning;
  let finalConfidence = confidenceFallback;
  let finalUrgency = urgencyFallback;
  let finalWhatCouldChange = "A sudden arrivals spike in the destination mandi or new rain around the source district could lower the margin.";

  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      });
      const prompt = `
You are AgriFlow's proprietary logistics movement agent.
Task: Evaluate the logistics of moving agricultural inventory.

Context:
- Item: ${item.quantityKg}kg of ${item.cropName} currently stored in ${item.district}.
- Local Spoilage Risk: ${item.spoilageLevel} (Deadline in ${daysLeft} days).
- Market Spread: Moving to ${route.targetDistrict} yields a premium of ₹${priceGapPerKgInr}/kg over local pricing.
- Logistics: Transport via road takes roughly ${distanceKm}km, costing estimated ₹${transportPerKgInr}/kg.
- Weather Effect: ${weather.summary} (${weather.temperatureCelsius}°C, ${weather.humidityPercent}% humidity)
- Destination Market Strength: ${route.demandStrength} (0..1, where 1 is roaring demand)
- Overall Estimated Net Profit: ₹${totalNetProfitInr}

Provide JSON conforming strictly to this format:
{
  "reasoningLines": ["list of 3 to 4 short, highly actionable and contextual sentences explaining why to dispatch or hold. Sound like a sharp operations manager analyzing the margins, truck costs, and spoilage risks."],
  "confidence": <float 0.0 to 1.0 based on route feasibility, weather, and net profit cushion>,
  "urgency": <one of "LOW", "MEDIUM", "HIGH", "CRITICAL">,
  "whatCouldChange": "<1 short sentence on what market risk exists>"
}
      `.trim();
      
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      const validated = GeminiEngineOutputSchema.parse(parsed);
      
      finalReasoning = validated.reasoningLines;
      finalConfidence = Math.max(0, Math.min(1, round(validated.confidence)));
      finalUrgency = validated.urgency as RiskLevel;
      finalWhatCouldChange = validated.whatCouldChange;
    } catch (error) {
      console.warn("Gemini Engine payload generation failed, falling back to local formulas.", error);
    }
  }

  return {
    inventoryId: item.id,
    targetDistrict: route.targetDistrict,
    targetState: route.targetState,
    generatedBy: "agriflow-ai-engine",
    transportDistanceKm: distanceKm,
    transportCostInr,
    netProfitPerKgInr,
    totalNetProfitInr,
    confidence: finalConfidence,
    urgency: finalUrgency,
    reasoning: finalReasoning.join(" "),
    signals: {
      sourceDistrict: route.sourceDistrict,
      sourceState: route.sourceState,
      sourceModalPrice: route.sourceModalPrice,
      targetModalPrice: route.targetModalPrice,
      priceGapPerQuintal: route.priceGap,
      priceGapPerKgInr,
      storageCostPerKgInr,
      transportPerKgInr,
      routeScore: route.opportunityScore,
      demandStrength: route.demandStrength,
      transportFeasibility: route.transportFeasibility,
      daysLeft,
      weatherPressure: weather.weatherPressure,
      whatCouldChange: finalWhatCouldChange,
      reasoningLines: finalReasoning,
    },
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  };
}

export async function generateRecommendationsForInventory(
  inventoryId: string,
  options?: { force?: boolean },
) {
  if (!options?.force) {
    const current = await listRecommendationsForInventory(inventoryId);

    if (current.length > 0) {
      return current;
    }
  }

  const item = await findInventoryById(inventoryId);

  if (!item) {
    throw new Error(`Inventory ${inventoryId} was not found.`);
  }

  const routes = await getRouteCandidates(item.cropSlug, item.district);
  
  // Using Promise.all here allows Gemini and Google Maps API requests to fire
  // entirely in parallel. This shrinks the overall recommendation execution latency
  // by preventing sequential blocking when generating the 3 payload variants.
  const payloads = await Promise.all(
    routes.map((route) => buildRecommendationPayload(item, route))
  );

  return replaceRecommendationsForInventory(item.id, payloads);
}

export async function generateRecommendationsForOwner(ownerUserId: string) {
  const inventory = await listInventory(ownerUserId);
  const activeItems = inventory.filter((item) => item.status === "ACTIVE");

  // Process items 3 at a time — each item fires up to 3 Gemini + Maps calls
  // in parallel internally, so 3 items = up to 9 concurrent outbound requests,
  // which is the safe ceiling before rate limits or event-loop saturation hit.
  const CONCURRENCY = 3;
  const results: MovementRecommendation[][] = [];

  for (let i = 0; i < activeItems.length; i += CONCURRENCY) {
    const batch = activeItems.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((item) => generateRecommendationsForInventory(item.id)),
    );
    results.push(...batchResults);
  }

  return results.flat().sort(
    (left, right) => (right.totalNetProfitInr ?? 0) - (left.totalNetProfitInr ?? 0),
  );
}

export function sortRecommendationsByProfit(
  recommendations: MovementRecommendation[],
) {
  return [...recommendations].sort(
    (left, right) => (right.totalNetProfitInr ?? 0) - (left.totalNetProfitInr ?? 0),
  );
}
