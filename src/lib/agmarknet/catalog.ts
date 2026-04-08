export type TargetCrop = {
  slug: string;
  name: string;
  commodityFilters: string[];
  basePrice: number;
};

export type TargetRegion = {
  state: string;
  districts: string[];
};

export const TARGET_CROPS: TargetCrop[] = [
  { slug: "tomato", name: "Tomato", commodityFilters: ["Tomato"], basePrice: 1800 },
  { slug: "onion", name: "Onion", commodityFilters: ["Onion"], basePrice: 2200 },
  { slug: "potato", name: "Potato", commodityFilters: ["Potato"], basePrice: 1700 },
  {
    slug: "green-chilli",
    name: "Green Chilli",
    commodityFilters: ["Green Chilli", "Chillies"],
    basePrice: 4200,
  },
  { slug: "brinjal", name: "Brinjal", commodityFilters: ["Brinjal"], basePrice: 1600 },
  { slug: "okra", name: "Okra", commodityFilters: ["Bhindi", "Ladies Finger"], basePrice: 2100 },
  { slug: "cabbage", name: "Cabbage", commodityFilters: ["Cabbage"], basePrice: 1200 },
  {
    slug: "cauliflower",
    name: "Cauliflower",
    commodityFilters: ["Cauliflower"],
    basePrice: 1700,
  },
  { slug: "banana", name: "Banana", commodityFilters: ["Banana"], basePrice: 2400 },
  { slug: "mango", name: "Mango", commodityFilters: ["Mango"], basePrice: 3800 },
  { slug: "lemon", name: "Lemon", commodityFilters: ["Lemon"], basePrice: 3600 },
  {
    slug: "paddy",
    name: "Paddy",
    commodityFilters: ["Paddy(Dhan)(Common)", "Paddy(Dhan)"],
    basePrice: 2600,
  },
  { slug: "maize", name: "Maize", commodityFilters: ["Maize"], basePrice: 2100 },
  {
    slug: "groundnut",
    name: "Groundnut",
    commodityFilters: ["Groundnut", "Ground Nut Seed"],
    basePrice: 5200,
  },
  { slug: "cotton", name: "Cotton", commodityFilters: ["Cotton"], basePrice: 6800 },
  { slug: "turmeric", name: "Turmeric", commodityFilters: ["Turmeric"], basePrice: 8400 },
  {
    slug: "bengal-gram",
    name: "Bengal Gram",
    commodityFilters: ["Bengal Gram(Gram)(Whole)", "Gram"],
    basePrice: 6100,
  },
  {
    slug: "green-gram",
    name: "Green Gram",
    commodityFilters: ["Green Gram (Moong)(Whole)", "Green Gram"],
    basePrice: 7600,
  },
  {
    slug: "black-gram",
    name: "Black Gram",
    commodityFilters: ["Black Gram (Urd Beans)(Whole)", "Black Gram"],
    basePrice: 7200,
  },
  {
    slug: "red-chilli",
    name: "Red Chilli",
    commodityFilters: ["Chillies", "Dry Chillies"],
    basePrice: 9100,
  },
];

export const TARGET_REGIONS: TargetRegion[] = [
  {
    state: "Andhra Pradesh",
    districts: ["Kurnool", "Guntur", "Anantapur", "Chittoor", "Visakhapatnam"],
  },
  {
    state: "Telangana",
    districts: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
  },
  {
    state: "Karnataka",
    districts: ["Bengaluru", "Mysuru", "Belagavi", "Hubballi", "Ballari"],
  },
];

export const TARGET_STATE_NAMES = TARGET_REGIONS.map((region) => region.state);

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

export function findTargetCrop(slugOrName: string) {
  const normalized = normalizeToken(slugOrName);

  return TARGET_CROPS.find(
    (crop) =>
      crop.slug === normalized ||
      normalizeToken(crop.name) === normalized ||
      crop.commodityFilters.some((filter) => normalizeToken(filter) === normalized),
  );
}

export function getTargetCropOrThrow(slugOrName: string) {
  const crop = findTargetCrop(slugOrName);

  if (!crop) {
    throw new Error(`Unsupported crop "${slugOrName}".`);
  }

  return crop;
}

export function resolveRequestedCrops(cropSlugs?: string[]) {
  if (!cropSlugs || cropSlugs.length === 0) {
    return TARGET_CROPS;
  }

  return cropSlugs.map((cropSlug) => getTargetCropOrThrow(cropSlug));
}

export function getDistrictsForState(state: string) {
  return TARGET_REGIONS.find((region) => region.state === state)?.districts ?? [];
}
