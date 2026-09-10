import type { MandiMarket } from "./types";
import { haversineKm } from "@/lib/geo/distance";

/**
 * Verified Mandi Markets Directory
 * Real geographic coordinates for mandis across Andhra Pradesh, Telangana, Karnataka, and Maharashtra.
 */
export const VERIFIED_MANDI_MARKETS: MandiMarket[] = [
  // --- ANDHRA PRADESH ---
  // Kurnool District (Farmer's Home District)
  {
    id: "mandi-ap-kurnool-yard",
    name: "Kurnool Market Yard",
    district: "Kurnool",
    state: "Andhra Pradesh",
    lat: 15.8281,
    lng: 78.0373,
    isAPMC: true,
  },
  {
    id: "mandi-ap-kurnool-apmc",
    name: "Kurnool APMC",
    district: "Kurnool",
    state: "Andhra Pradesh",
    lat: 15.8340,
    lng: 78.0410,
    isAPMC: true,
  },
  {
    id: "mandi-ap-adoni-apmc",
    name: "Adoni APMC",
    district: "Kurnool",
    state: "Andhra Pradesh",
    lat: 15.6322,
    lng: 77.2728,
    isAPMC: true,
  },
  // Anantapur (Adjacent to Kurnool)
  {
    id: "mandi-ap-anantapur-yard",
    name: "Anantapur Market Yard",
    district: "Anantapur",
    state: "Andhra Pradesh",
    lat: 14.6819,
    lng: 77.6006,
    isAPMC: true,
  },
  // Guntur
  {
    id: "mandi-ap-guntur-yard",
    name: "Guntur Market Yard",
    district: "Guntur",
    state: "Andhra Pradesh",
    lat: 16.3067,
    lng: 80.4365,
    isAPMC: true,
  },
  {
    id: "mandi-ap-ponnur-apmc",
    name: "Ponnur APMC",
    district: "Guntur",
    state: "Andhra Pradesh",
    lat: 16.0667,
    lng: 80.5500,
    isAPMC: true,
  },
  {
    id: "mandi-ap-tadikonda-apmc",
    name: "Tadikonda APMC",
    district: "Guntur",
    state: "Andhra Pradesh",
    lat: 16.4167,
    lng: 80.4500,
    isAPMC: true,
  },
  // Chittoor
  {
    id: "mandi-ap-chittoor-yard",
    name: "Chittoor Market Yard",
    district: "Chittoor",
    state: "Andhra Pradesh",
    lat: 13.2172,
    lng: 79.1003,
    isAPMC: true,
  },
  // Visakhapatnam
  {
    id: "mandi-ap-visakhapatnam-yard",
    name: "Visakhapatnam Market Yard",
    district: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.6868,
    lng: 83.2185,
    isAPMC: true,
  },
  {
    id: "mandi-ap-pendurthi-apmc",
    name: "Pendurthi APMC",
    district: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.8333,
    lng: 83.2000,
    isAPMC: true,
  },
  {
    id: "mandi-ap-chintapally-apmc",
    name: "Chintapally APMC",
    district: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.8667,
    lng: 82.3500,
    isAPMC: true,
  },

  // --- TELANGANA ---
  // Hyderabad (Key destination hub ~210 km north of Kurnool)
  {
    id: "mandi-tg-bowenpally-apmc",
    name: "Bowenpally APMC",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.4725,
    lng: 78.4727,
    isAPMC: true,
  },
  {
    id: "mandi-tg-gudimalkapur-apmc",
    name: "Gudimalkapur APMC",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3812,
    lng: 78.4357,
    isAPMC: true,
  },
  {
    id: "mandi-tg-hyderabad-yard",
    name: "Hyderabad Market Yard",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3850,
    lng: 78.4867,
    isAPMC: true,
  },
  {
    id: "mandi-tg-lbnagar-apmc",
    name: "L B Nagar APMC",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3457,
    lng: 78.5522,
    isAPMC: true,
  },
  {
    id: "mandi-tg-gaddiannaram-apmc",
    name: "Gaddiannaram APMC",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3620,
    lng: 78.5140,
    isAPMC: true,
  },
  {
    id: "mandi-tg-mahboob-mansion-apmc",
    name: "Mahboob Mansion APMC",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3689,
    lng: 78.5028,
    isAPMC: true,
  },
  {
    id: "mandi-tg-rbz-erragadda",
    name: "RYTHU BAZAR ERRAGADDA",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.4528,
    lng: 78.4322,
    isAPMC: false,
  },
  {
    id: "mandi-tg-rbz-mehdipatnam",
    name: "RYTHU BAZAR MEHDIPATNAM",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3916,
    lng: 78.4385,
    isAPMC: false,
  },
  // Warangal
  {
    id: "mandi-tg-warangal-apmc",
    name: "Warangal APMC",
    district: "Warangal",
    state: "Telangana",
    lat: 17.9689,
    lng: 79.5941,
    isAPMC: true,
  },
  {
    id: "mandi-tg-warangal-yard",
    name: "Warangal Market Yard",
    district: "Warangal",
    state: "Telangana",
    lat: 17.9784,
    lng: 79.6000,
    isAPMC: true,
  },
  {
    id: "mandi-tg-jangaon-apmc",
    name: "Jangaon APMC",
    district: "Warangal",
    state: "Telangana",
    lat: 17.7214,
    lng: 79.1578,
    isAPMC: true,
  },
  {
    id: "mandi-tg-kesamudram-apmc",
    name: "Kesamudram APMC",
    district: "Warangal",
    state: "Telangana",
    lat: 17.5833,
    lng: 79.9167,
    isAPMC: true,
  },
  // Karimnagar
  {
    id: "mandi-tg-karimnagar-yard",
    name: "Karimnagar Market Yard",
    district: "Karimnagar",
    state: "Telangana",
    lat: 18.4386,
    lng: 79.1288,
    isAPMC: true,
  },
  {
    id: "mandi-tg-jagtial-apmc",
    name: "Jagtial APMC",
    district: "Karimnagar",
    state: "Telangana",
    lat: 18.7944,
    lng: 78.9122,
    isAPMC: true,
  },
  {
    id: "mandi-tg-choppadandi-apmc",
    name: "Choppadandi APMC",
    district: "Karimnagar",
    state: "Telangana",
    lat: 18.5833,
    lng: 79.1667,
    isAPMC: true,
  },
  // Khammam
  {
    id: "mandi-tg-khammam-yard",
    name: "Khammam Market Yard",
    district: "Khammam",
    state: "Telangana",
    lat: 17.2473,
    lng: 80.1514,
    isAPMC: true,
  },
  {
    id: "mandi-tg-khammam-apmc",
    name: "Khammam APMC",
    district: "Khammam",
    state: "Telangana",
    lat: 17.2520,
    lng: 80.1480,
    isAPMC: true,
  },
  // Nizamabad
  {
    id: "mandi-tg-nizamabad-yard",
    name: "Nizamabad Market Yard",
    district: "Nizamabad",
    state: "Telangana",
    lat: 18.6725,
    lng: 78.0941,
    isAPMC: true,
  },
  {
    id: "mandi-tg-nizamabad-apmc",
    name: "Nizamabad APMC",
    district: "Nizamabad",
    state: "Telangana",
    lat: 18.6780,
    lng: 78.0990,
    isAPMC: true,
  },

  // --- KARNATAKA ---
  // Ballari (Adjacent to Kurnool ~95 km west)
  {
    id: "mandi-ka-ballari-yard",
    name: "Ballari Market Yard",
    district: "Ballari",
    state: "Karnataka",
    lat: 15.1394,
    lng: 76.9214,
    isAPMC: true,
  },
  // Bengaluru
  {
    id: "mandi-ka-bengaluru-yard",
    name: "Bengaluru Market Yard",
    district: "Bengaluru",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    isAPMC: true,
  },
  {
    id: "mandi-ka-binny-mill-apmc",
    name: "Binny Mill (F&V), Bengaluru APMC",
    district: "Bengaluru",
    state: "Karnataka",
    lat: 12.9660,
    lng: 77.5680,
    isAPMC: true,
  },
  {
    id: "mandi-ka-yeshwanthpur-apmc",
    name: "Yeshwanthpur APMC",
    district: "Bengaluru",
    state: "Karnataka",
    lat: 13.0285,
    lng: 77.5409,
    isAPMC: true,
  },
  // Belagavi
  {
    id: "mandi-ka-belagavi-yard",
    name: "Belagavi Market Yard",
    district: "Belagavi",
    state: "Karnataka",
    lat: 15.8497,
    lng: 74.4977,
    isAPMC: true,
  },
  {
    id: "mandi-ka-bailahongal-apmc",
    name: "Bailahongal APMC",
    district: "Belagavi",
    state: "Karnataka",
    lat: 15.8167,
    lng: 74.8667,
    isAPMC: true,
  },
  {
    id: "mandi-ka-ramdurga-apmc",
    name: "Ramdurga APMC",
    district: "Belagavi",
    state: "Karnataka",
    lat: 15.9500,
    lng: 75.3000,
    isAPMC: true,
  },
  {
    id: "mandi-ka-soundati-apmc",
    name: "Soundati APMC",
    district: "Belagavi",
    state: "Karnataka",
    lat: 15.7667,
    lng: 75.1167,
    isAPMC: true,
  },
  // Hubballi
  {
    id: "mandi-ka-hubballi-yard",
    name: "Hubballi Market Yard",
    district: "Hubballi",
    state: "Karnataka",
    lat: 15.3647,
    lng: 75.1240,
    isAPMC: true,
  },
  // Mysuru
  {
    id: "mandi-ka-mysuru-apmc",
    name: "Mysuru APMC",
    district: "Mysuru",
    state: "Karnataka",
    lat: 12.3118,
    lng: 76.6529,
    isAPMC: true,
  },
  {
    id: "mandi-ka-mysuru-yard",
    name: "Mysuru Market Yard",
    district: "Mysuru",
    state: "Karnataka",
    lat: 12.2958,
    lng: 76.6394,
    isAPMC: true,
  },
  {
    id: "mandi-ka-nanjangud-apmc",
    name: "Nanjangud APMC",
    district: "Mysuru",
    state: "Karnataka",
    lat: 12.1167,
    lng: 76.6833,
    isAPMC: true,
  },
  {
    id: "mandi-ka-tnarasipura-apmc",
    name: "T. Narasipura APMC",
    district: "Mysuru",
    state: "Karnataka",
    lat: 12.2167,
    lng: 76.9000,
    isAPMC: true,
  },

  // --- MAHARASHTRA ---
  {
    id: "mandi-mh-pune-apmc",
    name: "Pune APMC",
    district: "Pune",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    isAPMC: true,
  },
  {
    id: "mandi-mh-nashik-apmc",
    name: "Nashik APMC",
    district: "Nashik",
    state: "Maharashtra",
    lat: 20.0110,
    lng: 73.7903,
    isAPMC: true,
  },
  {
    id: "mandi-mh-vashi-apmc",
    name: "Vashi APMC (Navi Mumbai)",
    district: "Mumbai",
    state: "Maharashtra",
    lat: 19.0770,
    lng: 73.0033,
    isAPMC: true,
  },
];

/**
 * Headquarters coordinates for reference districts.
 */
export const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Kurnool: { lat: 15.8281, lng: 78.0373 },
  Anantapur: { lat: 14.6819, lng: 77.6006 },
  Ballari: { lat: 15.1394, lng: 76.9214 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Guntur: { lat: 16.3067, lng: 80.4365 },
  Chittoor: { lat: 13.2172, lng: 79.1003 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Warangal: { lat: 17.9784, lng: 79.6000 },
  Karimnagar: { lat: 18.4386, lng: 79.1288 },
  Khammam: { lat: 17.2473, lng: 80.1514 },
  Nizamabad: { lat: 18.6725, lng: 78.0941 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Belagavi: { lat: 15.8497, lng: 74.4977 },
  Hubballi: { lat: 15.3647, lng: 75.1240 },
  Mysuru: { lat: 12.2958, lng: 76.6394 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Nashik: { lat: 20.0110, lng: 73.7903 },
};

/**
 * Returns mandis filtered by state, and calculates distance to reference district.
 */
export function getMandis({
  state,
  nearDistrict = "Kurnool",
  radiusKm,
}: {
  state?: string | null;
  nearDistrict?: string | null;
  radiusKm?: number | null;
} = {}): (MandiMarket & { distanceKm: number })[] {
  const origin = (nearDistrict && DISTRICT_COORDINATES[nearDistrict]) || DISTRICT_COORDINATES["Kurnool"];

  let list = VERIFIED_MANDI_MARKETS;

  if (state && state.toLowerCase() !== "all") {
    list = list.filter((m) => m.state.toLowerCase() === state.toLowerCase());
  }

  const withDistances = list.map((m) => {
    const distanceKm = origin
      ? Math.round(haversineKm(origin.lat, origin.lng, m.lat, m.lng))
      : 0;

    return {
      ...m,
      distanceKm,
    };
  });

  if (radiusKm && radiusKm > 0) {
    return withDistances.filter((m) => m.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return withDistances.sort((a, b) => a.distanceKm - b.distanceKm);
}
