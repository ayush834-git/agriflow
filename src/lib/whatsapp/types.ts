export type SupportedLanguage = "te" | "hi" | "kn" | "en";

export type WhatsAppIntent =
  | "PRICE_CHECK"
  | "BEST_MARKET"
  | "SELL_ADVICE"
  | "SETUP_ALERT"
  | "CONNECT_FPO"
  | "REGISTER_LISTING"
  | "REGISTER_INVENTORY"
  | "FORECAST"
  | "OTHER";

export type ListingDraft = {
  cropSlug?: string;
  quantityKg?: number;
  askingPricePerKg?: number;
  availableUntil?: string;
  storageType?: string;
};

export type SessionContext = {
  lastCropSlug?: string;
  lastDistrict?: string;
  alertThreshold?: number;
  alertCropSlug?: string;
  pendingMatchId?: string;
  listingDraft?: ListingDraft;
  notes?: string[];
};

export type WhatsAppSession = {
  phone: string;
  userId?: string | null;
  language: SupportedLanguage;
  state: string;
  lastIntent?: WhatsAppIntent | null;
  context: SessionContext;
  lastMessageAt: string;
  sessionExpiresAt: string;
};

export type IncomingWhatsAppMessage = {
  from: string;
  to?: string;
  body: string;
  profileName?: string;
  numMedia: number;
  mediaUrl?: string;
  mediaContentType?: string;
};

export type IntentResult = {
  intent: WhatsAppIntent;
  cropSlug?: string;
  district?: string;
  threshold?: number;
  language: SupportedLanguage;
};
