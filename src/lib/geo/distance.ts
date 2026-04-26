import { DISTRICT_COORDINATES, TARGET_REGIONS } from "@/lib/agmarknet/catalog";

const ALL_CATALOG_DISTRICTS = TARGET_REGIONS.flatMap((r) => r.districts);

/** Haversine great-circle distance between two lat/lng pairs, in km. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Returns all catalog districts within `radiusKm` of `sourceDistrict`.
 * Always includes `sourceDistrict` itself.
 * Falls back to returning all catalog districts if coordinates are unknown.
 */
export function getDistrictsWithinKm(
  sourceDistrict: string,
  radiusKm: number,
): string[] {
  const origin = DISTRICT_COORDINATES[sourceDistrict];

  if (!origin) {
    // Unknown district — return all so we don't blank the UI
    return ALL_CATALOG_DISTRICTS;
  }

  const nearby: string[] = [];

  for (const district of ALL_CATALOG_DISTRICTS) {
    const coords = DISTRICT_COORDINATES[district];
    if (!coords) continue;

    const distKm = haversineKm(origin.lat, origin.lng, coords.lat, coords.lng);
    if (distKm <= radiusKm) {
      nearby.push(district);
    }
  }

  // Always include the source itself
  if (!nearby.includes(sourceDistrict)) {
    nearby.push(sourceDistrict);
  }

  return nearby;
}

/**
 * Returns the distance in km between two named districts.
 * Returns null if either district's coordinates are not in the catalog.
 */
export function distanceBetweenDistrictsKm(
  districtA: string,
  districtB: string,
): number | null {
  const a = DISTRICT_COORDINATES[districtA];
  const b = DISTRICT_COORDINATES[districtB];
  if (!a || !b) return null;
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}
