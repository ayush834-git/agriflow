import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { transcribeAudioBufferWithGemini } from "@/lib/gemini-audio";
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
import {
  findUserByPhone,
  listFposForDistrict,
  upsertFarmerCropAlertThreshold,
} from "@/lib/users/store";
import type { AppUser } from "@/lib/users/types";
import { downloadTwilioMedia } from "@/lib/twilio";
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

const INVENTORY_STATES = new Set([
  "INVENTORY_AWAITING_CROP",
  "INVENTORY_AWAITING_QUANTITY",
  "INVENTORY_AWAITING_DATE",
  "INVENTORY_CONFIRM",
]);

const HELP_TEXT: Record<SupportedLanguage, string> = {
  te: "నేను ధరలు, ఉత్తమమైన మార్కెట్, అమ్మకపు సలహా, FPO తో కనెక్ట్ కావడం, 7 రోజుల అంచనా, మరియు లిస్టింగ్ సెటప్ చేయడంలో సహాయం చేస్తాను.\nఉదాహరణలు:\ntomato price\nbest market for onion",
  hi: "मैं आपको फसलों के दाम, बेहतरीन बाज़ार, बेचने की सलाह, FPO से जुड़ने, 7 दिन का अनुमान लगाने और लिस्टिंग सेटअप में मदद कर सकता हूँ।\nउदाहरण:\ntomato price\nbest market for onion",
  kn: "ನಾನು ಬೆಲೆಗಳು, ಉತ್ತಮ ಮಾರುಕಟ್ಟೆ, ಮಾರಾಟದ ಸಲಹೆ, FPO ಗೆ ಸಂಪರ್ಕಿಸಲು, 7 ದಿನದ ಭವಿಷ್ಯ ಮತ್ತು ಲಿಸ್ಟಿಂಗ್ ರಚಿಸುವಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.\nಉದಾಹರಣೆಗಳು:\ntomato price\nbest market for onion",
  en: "I can help with prices, best market, sell advice, FPO connect, 7-day forecast, and listing setup.\nExamples:\ntomato price\nbest market for onion",
};

const NEED_CROP_TEXT: Record<SupportedLanguage, string> = {
  te: "ఏ పంట గురించి తెలుసుకోవాలి? ఉదాహరణ: tomato, onion, chilli, paddy.",
  hi: "आप किस फसल के बारे में जानना चाहते हैं? उदाहरण: tomato, onion, chilli, paddy.",
  kn: "ಯಾವ ಬೆಳೆಯ ಬಗ್ಗೆ ತಿಳಿಯಬೇಕು? ಉದಾಹರಣೆ: tomato, onion, chilli, paddy.",
  en: "Which crop do you want to check? Example: tomato, onion, chilli, paddy.",
};

const VOICE_TEXT: Record<SupportedLanguage, string> = {
  te: "వాయిస్ నోట్ స్పష్టంగా అర్థం కాలేదు. దయచేసి మళ్లీ పంపండి లేదా టైప్ చేయండి.",
  hi: "आपका वॉयस नोट ठीक से सुनाई नहीं दिया। कृपया फिर से भेजें या टाइप करें।",
  kn: "ನಿಮ್ಮ ವಾಯ್ಸ್ ನೋಟ್ ಸರಿಯಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಕಳುಹಿಸಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.",
  en: "I could not understand that voice note clearly. Please try another voice note or send text.",
};

const MATCH_CONFIRM_TEXT: Record<SupportedLanguage, string> = {
  te: "ప్రస్తుతం ఏ పెండింగ్ మ్యాచ్ లేదు. మీకు మ్యాచ్ అలర్ట్ వచ్చినప్పుడు YES అని రిప్లై ఇవ్వండి.",
  hi: "अभी कोई पेंडिंग मैच नहीं है। मैच अलर्ट आने पर YES रिप्लाई करें।",
  kn: "ಈಗ ಯಾವುದೇ ಪೆಂಡಿಂಗ್ ಮ್ಯಾಚ್ ಇಲ್ಲ. ಮ್ಯಾಚ್ ಅಲರ್ಟ್ ಬಂದಾಗ YES ರಿಪ್ಲೈ ಮಾಡಿ.",
  en: "There is no pending match right now. Reply YES when a match alert arrives.",
};

const LISTING_CANCEL_TEXT: Record<SupportedLanguage, string> = {
  te: "లిస్టింగ్ సెటప్ క్యాన్సిల్ చేశాను. 'create listing' అని పంపించి మళ్ళీ ప్రారంభించండి.",
  hi: "मैंने लिस्टिंग का सेटअप रद्द कर दिया है। 'create listing' भेजकर दोबारा शुरू करें।",
  kn: "ನಾನು ಲಿಸ್ಟಿಂಗ್ ಸೆಟಪ್ ರದ್ದುಗೊಳಿಸಿದ್ದೇನೆ. 'create listing' ಕಳುಹಿಸಿ ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ.",
  en: "I cancelled the listing setup. Send 'create listing' when you want to start again.",
};

const LISTING_CONFIRM_TEXT: Record<SupportedLanguage, string> = {
  te: "లిస్టింగ్ క్రియేట్ చేయడానికి YES అని, మళ్ళీ ప్రారంభించడానికి NO అని రిప్లై ఇవ్వండి.",
  hi: "लिस्टिंग कन्फर्म करने के लिए YES दें, या दोबारा शुरू करने के लिए NO।",
  kn: "ಲಿಸ್ಟಿಂಗ್ ರಚಿಸಲು YES ಎಂದು ರಿಪ್ಲೈ ಮಾಡಿ, ಅಥವಾ ರದ್ದುಗೊಳಿಸಲು NO.",
  en: "Reply YES to create this listing, or NO to restart.",
};

const LISTING_PROFILE_TEXT: Record<SupportedLanguage, string> = {
  te: "లిస్టింగ్ క్రియేట్ చేయడానికి మీ ఫార్మర్ ప్రొఫైల్ లో జిల్లా మరియు రాష్ట్రం ఉండాలి. దయచేసి /register/farmer అప్‌డేట్ చేయండి.",
  hi: "लिस्टिंग के लिए आपकी प्रोफ़ाइल में जिला और राज्य होना ज़रूरी है। कृपया /register/farmer अपडेट करें।",
  kn: "ಲಿಸ್ಟಿಂಗ್ ರಚಿಸಲು ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ನಲ್ಲಿ ಜಿಲ್ಲೆ ಮತ್ತು ರಾಜ್ಯ ಇರಬೇಕು. ದಯವಿಟ್ಟು /register/farmer ಅಪ್‌ಡೇಟ್ ಮಾಡಿ.",
  en: "Your farmer profile needs a district and state before I can create a listing. Please update /register/farmer first.",
};

const MEDIA_TEXT: Record<SupportedLanguage, string> = {
  te: "దయచేసి ఆడియో వాయిస్ నోట్ పంపండి లేదా మెసేజ్ టైప్ చేయండి.",
  hi: "कृपया ऑडियो वॉयस नोट या संदेश भेजें।",
  kn: "ದಯವಿಟ್ಟು ಆಡಿಯೋ ವಾಯ್ಸ್ ನೋಟ್ ಅಥವಾ ಸಂದೇಶ ಕಳುಹಿಸಿ.",
  en: "Please send an audio voice note or just type your message.",
};

function normalizeIncomingMediaMimeType(mimeType?: string) {
  return mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isAudioMediaType(mimeType?: string) {
  return normalizeIncomingMediaMimeType(mimeType).startsWith("audio/");
}

async function resolveIncomingWhatsAppBody(
  incomingMessage: IncomingWhatsAppMessage,
  fallbackLanguage: SupportedLanguage,
) {
  const typedText = incomingMessage.body.trim();

  if (typedText) {
    return {
      body: typedText,
    };
  }

  if (incomingMessage.numMedia <= 0) {
    return {
      body: typedText,
    };
  }

  if (!incomingMessage.mediaUrl || !incomingMessage.mediaContentType) {
    return {
      errorBody: MEDIA_TEXT[fallbackLanguage],
    };
  }

  if (!isAudioMediaType(incomingMessage.mediaContentType)) {
    return {
      errorBody: MEDIA_TEXT[fallbackLanguage],
    };
  }

  try {
    const audioBuffer = await downloadTwilioMedia(incomingMessage.mediaUrl);
    const transcript = await transcribeAudioBufferWithGemini(
      audioBuffer,
      incomingMessage.mediaContentType,
    );

    if (!transcript) {
      return {
        errorBody: VOICE_TEXT[fallbackLanguage],
      };
    }

    return {
      body: transcript,
    };
  } catch (error) {
    const mediaUrlHost =
      incomingMessage.mediaUrl && URL.canParse(incomingMessage.mediaUrl)
        ? new URL(incomingMessage.mediaUrl).host
        : null;
    console.error("[whatsapp] audio transcription failed", {
      from: incomingMessage.from,
      mediaContentType: incomingMessage.mediaContentType,
      mediaUrlHost,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      errorBody: VOICE_TEXT[fallbackLanguage],
    };
  }
}

async function humanizeResponse(text: string, language: SupportedLanguage): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini) {
    return text; // Graceful degradation to template engine
  }

  try {
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const langMap = { te: "Telugu", hi: "Hindi", kn: "Kannada", en: "English" };
    const localeName = langMap[language] ?? "English";

    const prompt = `You are the AgriFlow WhatsApp Bot, an AI assistant for Indian farmers. 
Take the following raw system output and humanize it into a friendly, helpful, and natural sounding message in ${localeName}.
IMPORTANT: You MUST write your response in the NATIVE SCRIPT of ${localeName} (e.g. Telugu script for Telugu, Devanagari for Hindi). Do NOT use English transliteration.
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

function supportsGuestIntent(intent: WhatsAppIntent) {
  return intent === "PRICE_CHECK" || intent === "BEST_MARKET";
}

function isListingFlowActive(session: WhatsAppSession, intent: WhatsAppIntent) {
  return LISTING_STATES.has(session.state) || intent === "REGISTER_LISTING";
}

function isInventoryFlowActive(session: WhatsAppSession, intent: WhatsAppIntent) {
  return INVENTORY_STATES.has(session.state) || intent === "REGISTER_INVENTORY";
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

import { createInventory } from "@/lib/inventory/store";

async function handleInventoryConversation({
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
      body: "Inventory setup cancelled.",
      session: touchSession(session, {
        state: "IDLE",
        context: {
          listingDraft: undefined,
        },
      }),
    };
  }

  if (!INVENTORY_STATES.has(session.state)) {
    if (intentResult.cropSlug) {
      return {
        body: formatListingQuantityPrompt(
          getTargetCropOrThrow(intentResult.cropSlug).name,
          language,
        ),
        session: touchSession(session, {
          state: "INVENTORY_AWAITING_QUANTITY",
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
        state: "INVENTORY_AWAITING_CROP",
        context: {
          listingDraft: {},
        },
      }),
    };
  }

  switch (session.state) {
    case "INVENTORY_AWAITING_CROP": {
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
          state: "INVENTORY_AWAITING_QUANTITY",
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

    case "INVENTORY_AWAITING_QUANTITY": {
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
        body: formatListingDatePrompt(language),
        session: touchSession(session, {
          state: "INVENTORY_AWAITING_DATE",
          context: {
            listingDraft: {
              ...existingDraft,
              quantityKg,
            },
          },
        }),
      };
    }

    case "INVENTORY_AWAITING_DATE": {
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
        body: `Inventory ready: ${formatListingSummary(draft)}\nReply YES to confirm or NO to cancel.`,
        session: touchSession(session, {
          state: "INVENTORY_CONFIRM",
          context: {
            listingDraft: draft,
          },
        }),
      };
    }

    case "INVENTORY_CONFIRM": {
      if (isNegativeConfirmation(text)) {
        return {
          body: "Cancelled. Send 'add inventory' to start again.",
          session: touchSession(session, {
            state: "IDLE",
            context: {
              listingDraft: undefined,
            },
          }),
        };
      }

      if (!isPositiveConfirmation(text)) {
        return {
          body: `Please confirm. Reply YES or NO.`,
          session,
        };
      }

      if (!registeredUser.district || !registeredUser.state) {
        return {
          body: "Your profile needs a district and state before I can add inventory.",
          session: touchSession(session, {
            state: "IDLE",
            context: {
              listingDraft: undefined,
            },
          }),
        };
      }

      if (registeredUser.role !== "fpo") {
        return {
          body: "Only FPOs can add inventory. Try 'create listing' instead.",
          session: touchSession(session, {
            state: "IDLE",
            context: {
              listingDraft: undefined,
            },
          }),
        };
      }

      const item = await createInventory({
        ownerUserId: registeredUser.id,
        cropSlug: existingDraft.cropSlug ?? session.context.lastCropSlug ?? "tomato",
        quantityKg: existingDraft.quantityKg ?? 0,
        district: registeredUser.district,
        state: registeredUser.state,
        deadlineDate: existingDraft.availableUntil ?? new Date().toISOString().slice(0, 10),
        storageLocationName: "Added via WhatsApp",
      });

      return {
        body: [
          `Inventory added: ${formatListingSummary({
            cropSlug: item.cropSlug,
            quantityKg: item.quantityKg,
            availableUntil: item.deadlineDate,
          })}`,
          "You can manage it from the web dashboard.",
        ].join("\n"),
        session: touchSession(session, {
          state: "IDLE",
          context: {
            listingDraft: undefined,
            lastCropSlug: item.cropSlug,
          },
        }),
      };
    }

    default:
      return {
        body: formatListingCropPrompt(language),
        session: touchSession(session, {
          state: "INVENTORY_AWAITING_CROP",
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
  const resolvedIncomingBody = await resolveIncomingWhatsAppBody(
    incomingMessage,
    fallbackLanguage,
  );

  if (resolvedIncomingBody.body == null) {
    const mediaSession = touchSession(session, {
      ...(registeredUser
        ? {
            userId: registeredUser.id,
            language: registeredUser.preferredLanguage,
          }
        : {}),
      language: fallbackLanguage,
      state: "AWAITING_TEXT_AFTER_MEDIA",
    });
    await saveWhatsAppSession(mediaSession);

    return {
      body: resolvedIncomingBody.errorBody ?? VOICE_TEXT[fallbackLanguage],
      session: mediaSession,
    };
  }

  const normalizedIncomingMessage: IncomingWhatsAppMessage = {
    ...incomingMessage,
    body: resolvedIncomingBody.body,
  };
  const intentResult = await classifyIntent(
    normalizedIncomingMessage,
    fallbackLanguage,
  );
  const forcedLanguage = registeredUser?.preferredLanguage ?? intentResult.language;
  const enrichedIntent: IntentResult = {
    ...intentResult,
    language: forcedLanguage,
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
    if (!supportsGuestIntent(enrichedIntent.intent)) {
      nextSession = touchSession(nextSession, {
        state: "AWAITING_REGISTRATION",
        language: enrichedIntent.language,
      });
      await saveWhatsAppSession(nextSession);

      return {
        body: formatRegistrationPrompt(
          enrichedIntent.language,
          buildFarmerRegistrationUrl({
            phone: normalizedIncomingMessage.from,
            language: enrichedIntent.language,
            source: "whatsapp",
          }),
        ),
        session: nextSession,
      };
    }

    if (!enrichedIntent.cropSlug) {
      nextSession = touchSession(nextSession, { state: "AWAITING_CROP" });
      await saveWhatsAppSession(nextSession);

      return {
        body: NEED_CROP_TEXT[enrichedIntent.language],
        session: nextSession,
      };
    }

    let guestBody = HELP_TEXT[enrichedIntent.language];
    if (enrichedIntent.intent === "PRICE_CHECK") {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug);
      guestBody = formatPriceReply(
        snapshot,
        enrichedIntent.language,
        enrichedIntent.district,
      );
      nextSession = touchSession(nextSession, { state: "PRICE_SHARED" });
    } else {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug);
      guestBody = formatBestMarketReply(
        snapshot,
        enrichedIntent.language,
        enrichedIntent.district,
      );
      nextSession = touchSession(nextSession, { state: "BEST_MARKET_SHARED" });
    }

    await saveWhatsAppSession(nextSession);

    return {
      body: await humanizeResponse(guestBody, enrichedIntent.language),
      session: nextSession,
    };
  }

  const activeUser = registeredUser;

  if (isListingFlowActive(nextSession, enrichedIntent.intent)) {
    const listingResult = await handleListingConversation({
      message: normalizedIncomingMessage,
      session: nextSession,
      intentResult: enrichedIntent,
      registeredUser: activeUser,
    });
    await saveWhatsAppSession(listingResult.session);
    return listingResult;
  }

  if (isInventoryFlowActive(nextSession, enrichedIntent.intent)) {
    const inventoryResult = await handleInventoryConversation({
      message: normalizedIncomingMessage,
      session: nextSession,
      intentResult: enrichedIntent,
      registeredUser: activeUser,
    });
    await saveWhatsAppSession(inventoryResult.session);
    return inventoryResult;
  }

  if (looksLikeMatchAcceptance(normalizedIncomingMessage.body)) {
    const acceptedMatch = await acceptPendingMatchForFarmer(
      activeUser.id,
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
      await upsertFarmerCropAlertThreshold({
        userId: activeUser.id,
        cropSlug: crop.slug,
        threshold,
        district: enrichedIntent.district ?? activeUser.district,
      });
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
        district: enrichedIntent.district ?? activeUser.district,
        cropSlug: enrichedIntent.cropSlug,
      });
      body = formatConnectFpoReply({
        cropSlug: enrichedIntent.cropSlug,
        district: enrichedIntent.district ?? activeUser.district ?? undefined,
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
