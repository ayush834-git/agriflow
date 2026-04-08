import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { getGeminiClient } from "@/lib/gemini";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import type { NormalizedMandiPriceRecord } from "@/lib/agmarknet/types";
import { getEnv } from "@/lib/env";
import { createListing } from "@/lib/listings/store";
import { computePriceGaps, latestPricesForCrop } from "@/lib/market/engine";
import { loadStoredGapsForCrop, loadStoredPricesForCrop } from "@/lib/market/repository";
import { acceptPendingMatchForFarmer } from "@/lib/matches/engine";
import {
  buildFarmerRegistrationUrl,
  formatRegistrationPrompt,
} from "@/lib/users/registration";
import { findUserByPhone, listFposForDistrict } from "@/lib/users/store";
import type { AppUser } from "@/lib/users/types";
import { classifyIntent } from "@/lib/whatsapp/intents";
import {
  getWhatsAppSession,
  saveWhatsAppSession,
  touchSession,
} from "@/lib/whatsapp/session-store";
import type {
  IncomingWhatsAppMessage,
  IntentResult,
  ListingDraft,
  SupportedLanguage,
  WhatsAppIntent,
  WhatsAppSession,
} from "@/lib/whatsapp/types";

type MarketSnapshot = {
  cropName: string;
  source: "database" | "live" | "mock";
  prices: ReturnType<typeof latestPricesForCrop>;
  gaps: ReturnType<typeof computePriceGaps>;
};

type ForecastPoint = {
  marketDate: string;
  averageModalPrice: number;
  arrivalsTonnes: number | null;
  sampleCount: number;
};

type ForecastSnapshot = {
  cropName: string;
  source: "live" | "mock";
  district?: string;
  points: ForecastPoint[];
};

type BotResult = {
  body: string;
  session: WhatsAppSession;
};

type ListingConversationInput = {
  message: IncomingWhatsAppMessage;
  session: WhatsAppSession;
  intentResult: IntentResult;
  registeredUser: AppUser;
};

const LISTING_STATES = new Set([
  "LISTING_AWAITING_CROP",
  "LISTING_AWAITING_QUANTITY",
  "LISTING_AWAITING_PRICE",
  "LISTING_AWAITING_DATE",
  "LISTING_CONFIRM",
]);

const HELP_TEXT: Record<SupportedLanguage, string> = {
  te: [
    "Nenu prices, best market, sell advice, FPO connect, 7-day forecast, and listing setup lo help chestanu.",
    "Examples:",
    "tomato price",
    "best market for onion",
    "find fpo for tomato",
    "forecast tomato",
    "create listing",
  ].join("\n"),
  hi: [
    "Main prices, best market, sell advice, FPO connect, 7-day forecast, aur listing setup mein madad kar sakta hoon.",
    "Examples:",
    "tomato price",
    "best market for onion",
    "find fpo for tomato",
    "forecast tomato",
    "create listing",
  ].join("\n"),
  kn: [
    "Nanu prices, best market, sell advice, FPO connect, 7-day forecast, mattu listing setup nalli help maduttene.",
    "Examples:",
    "tomato price",
    "best market for onion",
    "find fpo for tomato",
    "forecast tomato",
    "create listing",
  ].join("\n"),
  en: [
    "I can help with prices, best market, sell advice, FPO connect, 7-day forecast, and listing setup.",
    "Examples:",
    "tomato price",
    "best market for onion",
    "find fpo for tomato",
    "forecast tomato",
    "create listing",
  ].join("\n"),
};

const NEED_CROP_TEXT: Record<SupportedLanguage, string> = {
  te: "Ye crop gurinchi cheppali? Example: tomato, onion, chilli, paddy.",
  hi: "Kis crop ke baare mein batana hai? Example: tomato, onion, chilli, paddy.",
  kn: "Yava crop bagge nodbeku? Example: tomato, onion, chilli, paddy.",
  en: "Which crop do you want to check? Example: tomato, onion, chilli, paddy.",
};

const VOICE_TEXT: Record<SupportedLanguage, string> = {
  te: "Voice note vachindi. Transcription wiring tarvata vastundi. Ippatiki crop peru type cheyyandi.",
  hi: "Voice note mila. Transcription baad mein wire karenge. Abhi crop ka naam type kijiye.",
  kn: "Voice note bandide. Transcription nantara wire madutteve. Iga crop hesaru type madi.",
  en: "I received your voice note. We will wire transcription later. For now, please type the crop name.",
};

const MATCH_CONFIRM_TEXT: Record<SupportedLanguage, string> = {
  te: "Ippudu pending match ledu. Match alert vachinappudu YES reply ivvandi.",
  hi: "Abhi koi pending match nahi hai. Match alert aane par YES reply kijiye.",
  kn: "Iga pending match illa. Match alert bandaga YES reply madi.",
  en: "There is no pending match right now. Reply YES when a match alert arrives.",
};

const LISTING_CANCEL_TEXT: Record<SupportedLanguage, string> = {
  te: "Listing setup cancel chesanu. Malla create listing ani pampandi appudu restart chestanu.",
  hi: "Listing setup cancel kar diya. Dobara create listing bhejenge to restart karunga.",
  kn: "Listing setup cancel madide. Matte create listing anta kalisidre restart maduttene.",
  en: "I cancelled the listing setup. Send 'create listing' when you want to start again.",
};

const LISTING_CONFIRM_TEXT: Record<SupportedLanguage, string> = {
  te: "Reply YES to create this listing, or NO to restart.",
  hi: "Is listing ko create karne ke liye YES reply kijiye, ya restart ke liye NO.",
  kn: "Ee listing create madalu YES reply madi, restart ge NO reply madi.",
  en: "Reply YES to create this listing, or NO to restart.",
};

const LISTING_PROFILE_TEXT: Record<SupportedLanguage, string> = {
  te: "Listing create cheyyadaniki mee farmer profile lo district and state undali. /register/farmer ni update cheyyandi.",
  hi: "Listing create karne ke liye aapke farmer profile mein district aur state hona chahiye. /register/farmer update kijiye.",
  kn: "Listing create madalu nimma farmer profile alli district mattu state irabeku. /register/farmer update madi.",
  en: "Your farmer profile needs a district and state before I can create a listing. Please update /register/farmer first.",
};

async function humanizeResponse(text: string, language: SupportedLanguage): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini) {
    return text; // Graceful degradation to template engine
  }

  try {
    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const langMap = { te: "Telugu", hi: "Hindi", kn: "Kannada", en: "English" };
    const localeName = langMap[language] ?? "English";

    const prompt = `You are the AgriFlow WhatsApp Bot, an AI assistant for Indian farmers. 
Take the following raw system output and humanize it into a friendly, helpful, and natural sounding message in ${localeName}.
Keep the data completely accurate (do not make up prices or quantities). Use appropriate emojis. 
If the response is an error or fallback, explain it kindly.

Raw Output:
"${text}"
`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.warn("Gemini humanize response failed, falling back to templates", error);
    return text;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00Z`));
}

function sourceSuffix(source: MarketSnapshot["source"] | ForecastSnapshot["source"]) {
  if (source === "database") {
    return "";
  }

  return source === "mock" ? "\n[demo data mode]" : "\n[live fetch mode]";
}

function isPositiveConfirmation(text: string) {
  const normalized = text.trim().toLowerCase();

  return ["yes", "y", "confirm", "create", "haan", "ha", "avunu", "haudu"].includes(
    normalized,
  );
}

function isNegativeConfirmation(text: string) {
  const normalized = text.trim().toLowerCase();

  return ["no", "n", "restart", "edit", "marpu", "beda"].includes(normalized);
}

function isCancelCommand(text: string) {
  const normalized = text.trim().toLowerCase();

  return ["cancel", "stop", "exit", "skip"].includes(normalized);
}

function looksLikeMatchAcceptance(text: string) {
  return isPositiveConfirmation(text);
}

function requiresCrop(intent: WhatsAppIntent) {
  return [
    "PRICE_CHECK",
    "BEST_MARKET",
    "SELL_ADVICE",
    "SETUP_ALERT",
    "FORECAST",
  ].includes(intent);
}

function isListingFlowActive(session: WhatsAppSession, intent: WhatsAppIntent) {
  return LISTING_STATES.has(session.state) || intent === "REGISTER_LISTING";
}

function buildFpoProfileUrl(fpoId: string) {
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${appUrl}/fpos/${fpoId}`;
}

function parseNumber(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function parseQuantityKg(text: string) {
  const value = parseNumber(text);
  if (!value || value <= 0) {
    return undefined;
  }

  return Math.round(value);
}

function parsePricePerKg(text: string) {
  const value = parseNumber(text);
  if (!value || value <= 0) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildDate(parts: { year: number; month: number; day: number }) {
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  if (
    candidate.getUTCFullYear() !== parts.year ||
    candidate.getUTCMonth() !== parts.month - 1 ||
    candidate.getUTCDate() !== parts.day
  ) {
    return undefined;
  }

  return toIsoDate(candidate);
}

function parseAvailabilityDate(text: string) {
  const normalized = text.trim().toLowerCase();
  const now = new Date();

  if (normalized.includes("today")) {
    return toIsoDate(now);
  }

  if (normalized.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return toIsoDate(tomorrow);
  }

  const isoMatch = normalized.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return buildDate({
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    });
  }

  const shortMatch = normalized.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
  if (!shortMatch) {
    return undefined;
  }

  const currentYear = now.getUTCFullYear();
  const parsedYear = shortMatch[3] ? Number(shortMatch[3]) : currentYear;
  const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

  return buildDate({
    year,
    month: Number(shortMatch[2]),
    day: Number(shortMatch[1]),
  });
}

function formatListingSummary(draft: ListingDraft) {
  const cropName = draft.cropSlug ? getTargetCropOrThrow(draft.cropSlug).name : "Crop";

  return [
    `${cropName}`,
    `${draft.quantityKg?.toLocaleString("en-IN") ?? "--"} kg`,
    `${draft.askingPricePerKg ? `${formatCurrency(draft.askingPricePerKg)}/kg` : "--"}`,
    `${draft.availableUntil ? formatDateLabel(draft.availableUntil) : "--"}`,
  ].join(" | ");
}

function formatListingCropPrompt(language: SupportedLanguage) {
  if (language === "te") {
    return "Listing setup start ayyindi. Mundu crop peru pampandi. Example: tomato.";
  }

  if (language === "hi") {
    return "Listing setup shuru ho gaya. Pehle crop ka naam bhejiye. Example: tomato.";
  }

  if (language === "kn") {
    return "Listing setup start aagide. Modalu crop hesaru kalisi. Example: tomato.";
  }

  return "Listing setup started. First send the crop name. Example: tomato.";
}

function formatListingQuantityPrompt(cropName: string, language: SupportedLanguage) {
  if (language === "te") {
    return `${cropName} noted. Quantity in kg pampandi. Example: 1200`;
  }

  if (language === "hi") {
    return `${cropName} noted. Quantity kg mein bhejiye. Example: 1200`;
  }

  if (language === "kn") {
    return `${cropName} noted. Quantity kg alli kalisi. Example: 1200`;
  }

  return `${cropName} noted. Send the quantity in kg. Example: 1200`;
}

function formatListingPricePrompt(language: SupportedLanguage) {
  if (language === "te") {
    return "Asking price per kg pampandi. Example: 12";
  }

  if (language === "hi") {
    return "Asking price per kg bhejiye. Example: 12";
  }

  if (language === "kn") {
    return "Asking price per kg kalisi. Example: 12";
  }

  return "Send the asking price per kg. Example: 12";
}

function formatListingDatePrompt(language: SupportedLanguage) {
  if (language === "te") {
    return "Available until date pampandi. Example: 2026-04-10 or tomorrow.";
  }

  if (language === "hi") {
    return "Available until date bhejiye. Example: 2026-04-10 or tomorrow.";
  }

  if (language === "kn") {
    return "Available until date kalisi. Example: 2026-04-10 or tomorrow.";
  }

  return "Send the available-until date. Example: 2026-04-10 or tomorrow.";
}

function formatListingConfirmation(draft: ListingDraft, language: SupportedLanguage) {
  return [`Listing ready: ${formatListingSummary(draft)}`, LISTING_CONFIRM_TEXT[language]].join(
    "\n",
  );
}

function formatPriceReply(
  snapshot: MarketSnapshot,
  _language: SupportedLanguage,
  district?: string,
) {
  const topPrices = snapshot.prices.slice(0, 3);
  const bestGap =
    snapshot.gaps.find((gap) => !district || gap.sourceDistrict === district) ??
    snapshot.gaps[0];
  const lines = [
    `${snapshot.cropName} prices (Rs/quintal)`,
    ...topPrices.map(
      (price, index) =>
        `${index + 1}) ${price.district}: ${formatCurrency(price.modalPrice)}`,
    ),
  ];

  if (bestGap) {
    lines.push(
      `Best gap: ${bestGap.sourceDistrict} -> ${bestGap.targetDistrict} (+${formatCurrency(bestGap.priceGap)})`,
    );
  }

  return `${lines.join("\n")}${sourceSuffix(snapshot.source)}`;
}

function formatBestMarketReply(
  snapshot: MarketSnapshot,
  language: SupportedLanguage,
  district?: string,
) {
  const routes = (
    district
      ? snapshot.gaps.filter((gap) => gap.sourceDistrict === district)
      : snapshot.gaps
  ).slice(0, 3);

  if (routes.length === 0) {
    return HELP_TEXT[language];
  }

  const lines = [`Best markets for ${snapshot.cropName}`];

  for (const [index, route] of routes.entries()) {
    lines.push(
      `${index + 1}) ${route.targetDistrict}, ${route.targetState} - ${formatCurrency(route.targetModalPrice)} | gap ${formatCurrency(route.priceGap)}`,
    );
  }

  return `${lines.join("\n")}${sourceSuffix(snapshot.source)}`;
}

function formatSellAdviceReply(
  snapshot: MarketSnapshot,
  language: SupportedLanguage,
  district?: string,
) {
  const route =
    snapshot.gaps.find((gap) => !district || gap.sourceDistrict === district) ??
    snapshot.gaps[0];

  if (!route) {
    return HELP_TEXT[language];
  }

  const action =
    route.priceGap >= route.sourceModalPrice * 0.12
      ? "SELL NOW"
      : route.priceGap >= route.sourceModalPrice * 0.05
        ? "TRACK DAILY"
        : "HOLD";

  return [
    `${snapshot.cropName} advice: ${action}`,
    `Local market ${route.sourceDistrict}: ${formatCurrency(route.sourceModalPrice)}`,
    `Best market ${route.targetDistrict}: ${formatCurrency(route.targetModalPrice)}`,
    `Extra upside: ${formatCurrency(route.priceGap)} / quintal`,
  ].join("\n") + sourceSuffix(snapshot.source);
}

function formatAlertReply(
  cropName: string,
  threshold: number,
  language: SupportedLanguage,
) {
  if (language === "te") {
    return `${cropName} ${formatCurrency(threshold)} cross ayite alert pampistanu.`;
  }

  if (language === "hi") {
    return `${cropName} ${formatCurrency(threshold)} cross karega to alert bhejunga.`;
  }

  if (language === "kn") {
    return `${cropName} ${formatCurrency(threshold)} cross aadre alert kaluhisuttene.`;
  }

  return `I will alert you when ${cropName} crosses ${formatCurrency(threshold)}.`;
}

function formatConnectFpoReply(options: {
  cropSlug?: string;
  district?: string;
  fpos: AppUser[];
}) {
  const cropLabel = options.cropSlug
    ? getTargetCropOrThrow(options.cropSlug).name
    : "your crop";

  if (options.fpos.length === 0) {
    return [
      `No FPO profiles are matched to ${options.district ?? "your district"} right now.`,
      "Try again after more organizations register or open the dashboard to browse all FPO profiles.",
    ].join("\n");
  }

  const lines = [
    `Nearby FPO support for ${cropLabel}${options.district ? ` around ${options.district}` : ""}`,
  ];

  for (const [index, fpo] of options.fpos.slice(0, 3).entries()) {
    lines.push(`${index + 1}) ${fpo.organizationName ?? fpo.fullName}`);
    lines.push(`Call: ${fpo.phone ?? "Phone pending"}`);
    lines.push(`Districts: ${fpo.districtsServed.join(", ")}`);
    lines.push(`Profile: ${buildFpoProfileUrl(fpo.id)}`);
  }

  return lines.join("\n");
}

function buildForecastPoints(records: NormalizedMandiPriceRecord[]) {
  const grouped = new Map<
    string,
    { modalPriceSum: number; arrivalsSum: number; arrivalsCount: number; sampleCount: number }
  >();

  for (const record of records) {
    const current = grouped.get(record.marketDate) ?? {
      modalPriceSum: 0,
      arrivalsSum: 0,
      arrivalsCount: 0,
      sampleCount: 0,
    };

    current.modalPriceSum += record.modalPrice;
    current.sampleCount += 1;

    if (typeof record.arrivalsTonnes === "number") {
      current.arrivalsSum += record.arrivalsTonnes;
      current.arrivalsCount += 1;
    }

    grouped.set(record.marketDate, current);
  }

  return Array.from(grouped.entries())
    .map(([marketDate, value]) => ({
      marketDate,
      averageModalPrice: value.modalPriceSum / value.sampleCount,
      arrivalsTonnes:
        value.arrivalsCount > 0 ? value.arrivalsSum / value.arrivalsCount : null,
      sampleCount: value.sampleCount,
    }))
    .sort((left, right) => left.marketDate.localeCompare(right.marketDate));
}

async function getForecastSnapshot(
  cropSlug: string,
  district?: string,
): Promise<ForecastSnapshot> {
  const targetCrop = getTargetCropOrThrow(cropSlug);
  const feed = await resolveAgmarknetFeed({
    cropSlugs: [targetCrop.slug],
    historyDays: 7,
    mode: "auto",
  });
  const cropRecords = feed.records.filter((record) => record.cropSlug === targetCrop.slug);
  const districtRecords = district
    ? cropRecords.filter((record) => record.district === district)
    : cropRecords;
  const records = districtRecords.length > 0 ? districtRecords : cropRecords;

  return {
    cropName: targetCrop.name,
    source: feed.source,
    district,
    points: buildForecastPoints(records),
  };
}

function formatForecastReply(snapshot: ForecastSnapshot, language: SupportedLanguage) {
  if (snapshot.points.length === 0) {
    return HELP_TEXT[language];
  }

  const first = snapshot.points[0];
  const last = snapshot.points[snapshot.points.length - 1];
  const observedLow = Math.min(...snapshot.points.map((point) => point.averageModalPrice));
  const observedHigh = Math.max(...snapshot.points.map((point) => point.averageModalPrice));
  const totalSwing = last.averageModalPrice - first.averageModalPrice;
  const dailySlope = totalSwing / Math.max(snapshot.points.length - 1, 1);
  const projectedMid = last.averageModalPrice + dailySlope * 3;
  const projectedBand = Math.max(Math.abs(totalSwing) * 0.4, last.averageModalPrice * 0.05);
  const projectedLow = Math.max(0, projectedMid - projectedBand);
  const projectedHigh = projectedMid + projectedBand;
  const arrivals = snapshot.points
    .map((point) => point.arrivalsTonnes)
    .filter((value): value is number => typeof value === "number");
  const averageArrivals =
    arrivals.length > 0
      ? arrivals.reduce((sum, value) => sum + value, 0) / arrivals.length
      : null;
  const bias =
    totalSwing >= last.averageModalPrice * 0.04
      ? "upward"
      : totalSwing <= -last.averageModalPrice * 0.04
        ? "softening"
        : "stable";

  return [
    `7-day forecast for ${snapshot.cropName}${snapshot.district ? ` near ${snapshot.district}` : ""}`,
    `Bias: ${bias}`,
    `Latest average: ${formatCurrency(last.averageModalPrice)}`,
    `Observed range: ${formatCurrency(observedLow)} to ${formatCurrency(observedHigh)}`,
    `Next-week working range: ${formatCurrency(projectedLow)} to ${formatCurrency(projectedHigh)}`,
    averageArrivals
      ? `Why: recent arrivals averaged ${averageArrivals.toFixed(1)} tonnes and price momentum moved ${formatCurrency(totalSwing)} over the last 7 days.`
      : `Why: price momentum moved ${formatCurrency(totalSwing)} over the last 7 days.`,
  ].join("\n") + sourceSuffix(snapshot.source);
}

async function getMarketSnapshot(cropSlug: string): Promise<MarketSnapshot> {
  const targetCrop = getTargetCropOrThrow(cropSlug);
  let prices = await loadStoredPricesForCrop(targetCrop.slug);
  let gaps = await loadStoredGapsForCrop(targetCrop.slug, 10);
  let source: MarketSnapshot["source"] = "database";

  if (prices.length === 0 || gaps.length === 0) {
    const feed = await resolveAgmarknetFeed({
      cropSlugs: [targetCrop.slug],
      historyDays: 7,
      mode: "auto",
    });

    prices = feed.records;
    gaps = computePriceGaps(feed.records).filter(
      (record) => record.cropSlug === targetCrop.slug,
    );
    source = feed.source;
  }

  return {
    cropName: targetCrop.name,
    source,
    prices: latestPricesForCrop(prices, targetCrop.slug),
    gaps,
  };
}

function applyIntentContext(session: WhatsAppSession, intentResult: IntentResult) {
  return touchSession(session, {
    language: intentResult.language,
    lastIntent: intentResult.intent,
    context: {
      ...(intentResult.cropSlug ? { lastCropSlug: intentResult.cropSlug } : {}),
      ...(intentResult.district ? { lastDistrict: intentResult.district } : {}),
      ...(intentResult.threshold ? { alertThreshold: intentResult.threshold } : {}),
    },
  });
}

function escapeTwiml(body: string) {
  return body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function handleListingConversation({
  message,
  session,
  intentResult,
  registeredUser,
}: ListingConversationInput): Promise<BotResult> {
  const language = intentResult.language;
  const existingDraft = session.context.listingDraft ?? {};
  const text = message.body.trim();

  if (isCancelCommand(text)) {
    return {
      body: LISTING_CANCEL_TEXT[language],
      session: touchSession(session, {
        state: "IDLE",
        context: {
          listingDraft: undefined,
        },
      }),
    };
  }

  if (!LISTING_STATES.has(session.state)) {
    if (intentResult.cropSlug) {
      return {
        body: formatListingQuantityPrompt(
          getTargetCropOrThrow(intentResult.cropSlug).name,
          language,
        ),
        session: touchSession(session, {
          state: "LISTING_AWAITING_QUANTITY",
          context: {
            listingDraft: {
              cropSlug: intentResult.cropSlug,
            },
          },
        }),
      };
    }

    return {
      body: formatListingCropPrompt(language),
      session: touchSession(session, {
        state: "LISTING_AWAITING_CROP",
        context: {
          listingDraft: {},
        },
      }),
    };
  }

  switch (session.state) {
    case "LISTING_AWAITING_CROP": {
      if (!intentResult.cropSlug) {
        return {
          body: NEED_CROP_TEXT[language],
          session,
        };
      }

      return {
        body: formatListingQuantityPrompt(
          getTargetCropOrThrow(intentResult.cropSlug).name,
          language,
        ),
        session: touchSession(session, {
          state: "LISTING_AWAITING_QUANTITY",
          context: {
            listingDraft: {
              ...existingDraft,
              cropSlug: intentResult.cropSlug,
            },
            lastCropSlug: intentResult.cropSlug,
          },
        }),
      };
    }

    case "LISTING_AWAITING_QUANTITY": {
      const quantityKg = parseQuantityKg(text);
      if (!quantityKg) {
        return {
          body: formatListingQuantityPrompt(
            getTargetCropOrThrow(existingDraft.cropSlug ?? "tomato").name,
            language,
          ),
          session,
        };
      }

      return {
        body: formatListingPricePrompt(language),
        session: touchSession(session, {
          state: "LISTING_AWAITING_PRICE",
          context: {
            listingDraft: {
              ...existingDraft,
              quantityKg,
            },
          },
        }),
      };
    }

    case "LISTING_AWAITING_PRICE": {
      const askingPricePerKg = parsePricePerKg(text);
      if (!askingPricePerKg) {
        return {
          body: formatListingPricePrompt(language),
          session,
        };
      }

      return {
        body: formatListingDatePrompt(language),
        session: touchSession(session, {
          state: "LISTING_AWAITING_DATE",
          context: {
            listingDraft: {
              ...existingDraft,
              askingPricePerKg,
            },
          },
        }),
      };
    }

    case "LISTING_AWAITING_DATE": {
      const availableUntil = parseAvailabilityDate(text);
      if (!availableUntil) {
        return {
          body: formatListingDatePrompt(language),
          session,
        };
      }

      const draft: ListingDraft = {
        ...existingDraft,
        availableUntil,
      };

      return {
        body: formatListingConfirmation(draft, language),
        session: touchSession(session, {
          state: "LISTING_CONFIRM",
          context: {
            listingDraft: draft,
          },
        }),
      };
    }

    case "LISTING_CONFIRM": {
      if (isNegativeConfirmation(text)) {
        return {
          body: formatListingCropPrompt(language),
          session: touchSession(session, {
            state: "LISTING_AWAITING_CROP",
            context: {
              listingDraft: {},
            },
          }),
        };
      }

      if (!isPositiveConfirmation(text)) {
        return {
          body: formatListingConfirmation(existingDraft, language),
          session,
        };
      }

      if (!registeredUser.district || !registeredUser.state) {
        return {
          body: LISTING_PROFILE_TEXT[language],
          session: touchSession(session, {
            state: "IDLE",
            context: {
              listingDraft: undefined,
            },
          }),
        };
      }

      const listing = await createListing({
        farmerUserId: registeredUser.id,
        cropSlug: existingDraft.cropSlug ?? session.context.lastCropSlug ?? "tomato",
        quantityKg: existingDraft.quantityKg ?? 0,
        askingPricePerKg: existingDraft.askingPricePerKg,
        qualityGrade: "A",
        district: registeredUser.district,
        state: registeredUser.state,
        availableUntil: existingDraft.availableUntil,
        notes: "Created from WhatsApp bot",
      });

      return {
        body: [
          `Listing created: ${formatListingSummary({
            cropSlug: listing.cropSlug,
            quantityKg: listing.quantityKg,
            askingPricePerKg: listing.askingPricePerKg ?? undefined,
            availableUntil: listing.availableUntil ?? undefined,
          })}`,
          "This lot is now visible to FPO matching.",
        ].join("\n"),
        session: touchSession(session, {
          state: "LISTING_CREATED",
          context: {
            listingDraft: undefined,
            lastCropSlug: listing.cropSlug,
          },
        }),
      };
    }

    default:
      return {
        body: formatListingCropPrompt(language),
        session: touchSession(session, {
          state: "LISTING_AWAITING_CROP",
          context: {
            listingDraft: {},
          },
        }),
      };
  }
}

export function buildTwimlMessage(body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeTwiml(body)}</Message></Response>`;
}

export async function processWhatsAppMessage(
  incomingMessage: IncomingWhatsAppMessage,
): Promise<BotResult> {
  const session = await getWhatsAppSession(incomingMessage.from);
  const registeredUser = await findUserByPhone(incomingMessage.from);
  const fallbackLanguage =
    registeredUser?.preferredLanguage ?? session.language ?? "te";
  const intentResult = await classifyIntent(incomingMessage, fallbackLanguage);
  const enrichedIntent: IntentResult = {
    ...intentResult,
    cropSlug: intentResult.cropSlug ?? session.context.lastCropSlug,
    district:
      intentResult.district ??
      session.context.lastDistrict ??
      registeredUser?.district ??
      undefined,
  };
  let nextSession = applyIntentContext(
    touchSession(session, {
      ...(registeredUser
        ? {
            userId: registeredUser.id,
            language: registeredUser.preferredLanguage,
          }
        : {}),
    }),
    enrichedIntent,
  );

  if (!registeredUser) {
    nextSession = touchSession(nextSession, {
      state: "AWAITING_REGISTRATION",
      language: enrichedIntent.language,
    });
    await saveWhatsAppSession(nextSession);

    return {
      body: formatRegistrationPrompt(
        enrichedIntent.language,
        buildFarmerRegistrationUrl({
          phone: incomingMessage.from,
          language: enrichedIntent.language,
          source: "whatsapp",
        }),
      ),
      session: nextSession,
    };
  }

  if (incomingMessage.numMedia > 0 && !incomingMessage.body.trim()) {
    nextSession = touchSession(nextSession, {
      language: fallbackLanguage,
      state: "AWAITING_TEXT_AFTER_MEDIA",
    });
    await saveWhatsAppSession(nextSession);

    return {
      body: VOICE_TEXT[fallbackLanguage],
      session: nextSession,
    };
  }

  if (isListingFlowActive(nextSession, enrichedIntent.intent)) {
    const listingResult = await handleListingConversation({
      message: incomingMessage,
      session: nextSession,
      intentResult: enrichedIntent,
      registeredUser,
    });
    await saveWhatsAppSession(listingResult.session);
    return listingResult;
  }

  if (looksLikeMatchAcceptance(incomingMessage.body)) {
    const acceptedMatch = await acceptPendingMatchForFarmer(
      registeredUser.id,
      session.context.pendingMatchId,
    );

    nextSession = touchSession(nextSession, {
      state: acceptedMatch ? "MATCH_ACCEPTED" : "IDLE",
      context: {
        pendingMatchId: undefined,
      },
    });
    await saveWhatsAppSession(nextSession);

    return {
      body: acceptedMatch?.farmerMessage ?? MATCH_CONFIRM_TEXT[fallbackLanguage],
      session: nextSession,
    };
  }

  if (!enrichedIntent.cropSlug && requiresCrop(enrichedIntent.intent)) {
    nextSession = touchSession(nextSession, { state: "AWAITING_CROP" });
    await saveWhatsAppSession(nextSession);

    return {
      body: NEED_CROP_TEXT[enrichedIntent.language],
      session: nextSession,
    };
  }

  let body = HELP_TEXT[enrichedIntent.language];

  switch (enrichedIntent.intent) {
    case "PRICE_CHECK": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      body = formatPriceReply(snapshot, enrichedIntent.language, enrichedIntent.district);
      nextSession = touchSession(nextSession, { state: "PRICE_SHARED" });
      break;
    }
    case "BEST_MARKET": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      body = formatBestMarketReply(
        snapshot,
        enrichedIntent.language,
        enrichedIntent.district,
      );
      nextSession = touchSession(nextSession, { state: "BEST_MARKET_SHARED" });
      break;
    }
    case "SELL_ADVICE": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      body = formatSellAdviceReply(
        snapshot,
        enrichedIntent.language,
        enrichedIntent.district,
      );
      nextSession = touchSession(nextSession, { state: "SELL_ADVICE_SHARED" });
      break;
    }
    case "SETUP_ALERT": {
      const crop = getTargetCropOrThrow(enrichedIntent.cropSlug!);
      const threshold = enrichedIntent.threshold ?? 2200;
      body = formatAlertReply(crop.name, threshold, enrichedIntent.language);
      nextSession = touchSession(nextSession, {
        state: "ALERT_CONFIGURED",
        context: {
          alertCropSlug: crop.slug,
          alertThreshold: threshold,
        },
      });
      break;
    }
    case "CONNECT_FPO": {
      const fpos = await listFposForDistrict({
        district: enrichedIntent.district ?? registeredUser.district,
        cropSlug: enrichedIntent.cropSlug,
      });
      body = formatConnectFpoReply({
        cropSlug: enrichedIntent.cropSlug,
        district: enrichedIntent.district ?? registeredUser.district ?? undefined,
        fpos,
      });
      nextSession = touchSession(nextSession, { state: "FPO_DIRECTORY_SHARED" });
      break;
    }
    case "FORECAST": {
      const snapshot = await getForecastSnapshot(
        enrichedIntent.cropSlug!,
        enrichedIntent.district,
      );
      body = formatForecastReply(snapshot, enrichedIntent.language);
      nextSession = touchSession(nextSession, { state: "FORECAST_SHARED" });
      break;
    }
    case "OTHER":
    default:
      nextSession = touchSession(nextSession, { state: "IDLE" });
      body = HELP_TEXT[enrichedIntent.language];
      break;
  }

  await saveWhatsAppSession(nextSession);

  return {
    body: await humanizeResponse(body, enrichedIntent.language),
    session: nextSession,
  };
}
