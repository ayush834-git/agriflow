import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import type { InventoryItem } from "@/lib/inventory/types";
import type { ListingItem } from "@/lib/listings/types";
import { DISTRICT_POSITIONS } from "@/lib/regions-map";

function round(value: number) {
  return Number(value.toFixed(2));
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function daysUntil(dateValue?: string | null) {
  if (!dateValue) {
    return 4;
  }

  const diff = new Date(`${dateValue}T23:59:59.000Z`).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function estimateDistanceKm(sourceDistrict: string, targetDistrict: string) {
  const source = DISTRICT_POSITIONS[sourceDistrict];
  const target = DISTRICT_POSITIONS[targetDistrict];

  if (!source || !target) {
    return 240;
  }

  const dx = target.x - source.x;
  const dy = target.y - source.y;

  return round(Math.max(60, Math.sqrt(dx * dx + dy * dy) * 3.2));
}

export function getFreshnessLabel(listing: ListingItem) {
  const days = daysUntil(listing.availableUntil ?? listing.availableFrom);

  if (days <= 1) {
    return "dispatch in 24h";
  }

  if (days <= 3) {
    return "fresh 3-day window";
  }

  return "stable 5-day window";
}

export function scoreListingAgainstInventory(listing: ListingItem, inventory: InventoryItem) {
  const crop = getTargetCropOrThrow(listing.cropSlug);
  const distanceKm = estimateDistanceKm(inventory.district, listing.district);
  const quantityFit = clamp(
    1 -
      Math.abs(inventory.quantityKg - listing.quantityKg) /
        Math.max(inventory.quantityKg, listing.quantityKg),
    0.35,
    1,
  );
  const freshnessDays = daysUntil(listing.availableUntil ?? listing.availableFrom);
  const freshnessFit = freshnessDays <= 1 ? 1 : freshnessDays <= 3 ? 0.88 : 0.72;
  const benchmarkPricePerKg = crop.basePrice / 100;
  const priceAlignment = clamp(
    1 -
      Math.max(0, (listing.askingPricePerKg ?? benchmarkPricePerKg) - benchmarkPricePerKg) /
        Math.max(benchmarkPricePerKg, 1),
    0.35,
    1,
  );
  const distanceFit = clamp(1 - distanceKm / 480, 0.28, 1);
  const matchScore = round(
    (quantityFit * 0.3 +
      freshnessFit * 0.24 +
      priceAlignment * 0.24 +
      distanceFit * 0.22) *
      100,
  );

  return {
    distanceKm,
    matchScore,
    scoreBreakdown: {
      quantityFit: round(quantityFit),
      freshnessFit: round(freshnessFit),
      priceAlignment: round(priceAlignment),
      distanceFit: round(distanceFit),
    },
  };
}
