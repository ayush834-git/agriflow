import type { AppUser, FarmerCropPreference } from "@/lib/users/types";

export const DEMO_FPO_OWNER_ID = "demo-fpo-suresh";

const DEMO_TIMESTAMP = "2026-04-01T06:00:00.000Z";

export const DEMO_FPO_CONTACT = {
  id: DEMO_FPO_OWNER_ID,
  fullName: "Suresh Reddy",
  organizationName: "Rayalaseema Fresh Aggregators",
  phone: "+919900000401",
  email: "ops@rayalaseema-fresh.demo",
  district: "Guntur",
  state: "Andhra Pradesh",
};

export const DEMO_FARMER_USERS: AppUser[] = [
  {
    id: "demo-farmer-ramu",
    role: "FARMER",
    fullName: "Ramu Naik",
    phone: "+919900000101",
    email: null,
    preferredLanguage: "te",
    district: "Kurnool",
    state: "Andhra Pradesh",
    organizationName: null,
    districtsServed: [],
    cropsHandled: [],
    serviceRadiusKm: null,
    serviceSummary: null,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
  {
    id: "demo-farmer-ramesh",
    role: "FARMER",
    fullName: "Ramesh Gowda",
    phone: "+919900000102",
    email: null,
    preferredLanguage: "kn",
    district: "Ballari",
    state: "Karnataka",
    organizationName: null,
    districtsServed: [],
    cropsHandled: [],
    serviceRadiusKm: null,
    serviceSummary: null,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
  {
    id: "demo-farmer-saritha",
    role: "FARMER",
    fullName: "Saritha Rani",
    phone: "+919900000103",
    email: null,
    preferredLanguage: "hi",
    district: "Khammam",
    state: "Telangana",
    organizationName: null,
    districtsServed: [],
    cropsHandled: [],
    serviceRadiusKm: null,
    serviceSummary: null,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
];

export const DEMO_FPO_USERS: AppUser[] = [
  {
    id: DEMO_FPO_OWNER_ID,
    role: "FPO",
    fullName: DEMO_FPO_CONTACT.fullName,
    phone: DEMO_FPO_CONTACT.phone,
    email: DEMO_FPO_CONTACT.email,
    preferredLanguage: "en",
    district: DEMO_FPO_CONTACT.district,
    state: DEMO_FPO_CONTACT.state,
    organizationName: DEMO_FPO_CONTACT.organizationName,
    districtsServed: ["Guntur", "Kurnool", "Khammam", "Hyderabad"],
    cropsHandled: ["tomato", "onion", "green-chilli", "maize"],
    serviceRadiusKm: 180,
    serviceSummary:
      "Aggregation, reefer dispatch, and mandi-side negotiation for perishables across AP and Telangana.",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
  {
    id: "demo-fpo-warangal-link",
    role: "FPO",
    fullName: "Meena Rao",
    phone: "+919900000402",
    email: "team@warangal-link.demo",
    preferredLanguage: "te",
    district: "Warangal",
    state: "Telangana",
    organizationName: "Warangal Crop Link",
    districtsServed: ["Warangal", "Khammam", "Karimnagar"],
    cropsHandled: ["green-chilli", "turmeric", "paddy"],
    serviceRadiusKm: 140,
    serviceSummary:
      "Fresh-market dispatch and aggregation support for chilli, turmeric, and paddy growers.",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
  {
    id: "demo-fpo-ballari-fresh",
    role: "FPO",
    fullName: "Naveen Patil",
    phone: "+919900000403",
    email: "hello@ballari-fresh.demo",
    preferredLanguage: "kn",
    district: "Ballari",
    state: "Karnataka",
    organizationName: "Ballari Fresh Routes",
    districtsServed: ["Ballari", "Anantapur", "Bengaluru"],
    cropsHandled: ["onion", "maize", "tomato"],
    serviceRadiusKm: 200,
    serviceSummary:
      "Cross-border haulage and storage coordination for onion and maize lots into Karnataka buyers.",
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  },
];

export const DEMO_FARMER_CROPS: Record<string, FarmerCropPreference[]> = {
  "demo-farmer-ramu": [
    {
      cropSlug: "tomato",
      cropName: "Tomato",
      district: "Kurnool",
      alertThreshold: 300,
    },
    {
      cropSlug: "onion",
      cropName: "Onion",
      district: "Kurnool",
      alertThreshold: 260,
    },
  ],
  "demo-farmer-ramesh": [
    {
      cropSlug: "onion",
      cropName: "Onion",
      district: "Ballari",
      alertThreshold: 280,
    },
    {
      cropSlug: "maize",
      cropName: "Maize",
      district: "Ballari",
      alertThreshold: 180,
    },
  ],
  "demo-farmer-saritha": [
    {
      cropSlug: "green-chilli",
      cropName: "Green Chilli",
      district: "Khammam",
      alertThreshold: 450,
    },
  ],
};

export const DEMO_FARMER_DEFAULT_ID = DEMO_FARMER_USERS[0].id;
