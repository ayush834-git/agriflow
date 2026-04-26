import { TARGET_REGIONS, findTargetCrop } from "@/lib/agmarknet/catalog";
import type {
  IncomingWhatsAppMessage,
  IntentResult,
  SupportedLanguage,
  WhatsAppIntent,
} from "@/lib/whatsapp/types";

const PRICE_HINTS = [
  "price",
  "rate",
  "market price",
  "ధర",
  "భావం",
  "ಬೆಲೆ",
  "कीमत",
];
const BEST_MARKET_HINTS = [
  "best market",
  "where sell",
  "where to sell",
  "best place",
  "ఏ మార్కెట్",
  "ఎక్కడ అమ్మ",
  "ಯಾವ ಮಾರುಕಟ್ಟೆ",
  "कहाँ बेच",
];
const SELL_ADVICE_HINTS = [
  "sell advice",
  "should i sell",
  "sell now",
  "hold",
  "అమ్మాలా",
  "ఇప్పుడు అమ్మ",
  "ಮಾರಾಟ",
  "बेचूं",
];
const ALERT_HINTS = [
  "alert",
  "notify",
  "notification",
  "అలర్ట్",
  "తెలియజేయి",
  "సూచన",
  "ಅಲರ್ಟ್",
  "सूचना",
];
const CONNECT_FPO_HINTS = [
  "connect fpo",
  "find fpo",
  "nearby fpo",
  "call fpo",
  "buyer connect",
  "fpo",
];
const REGISTER_LISTING_HINTS = [
  "register listing",
  "create listing",
  "post listing",
  "list crop",
  "sell lot",
  "new listing",
];
const REGISTER_INVENTORY_HINTS = [
  "add inventory",
  "new inventory",
  "add stock",
  "store crop",
  "fpo stock",
];
const FORECAST_HINTS = [
  "forecast",
  "next 7 days",
  "next week",
  "7 day",
  "trend",
  "price outlook",
];

const INVENTORY_QUERY_HINTS = [
  "my inventory",
  "my stock",
  "how much do i have",
  "how much stock",
  "mera stock",
  "meri inventory",
  "నా నిల్వ",
  "నా స్టాక్",
  "ನನ್ನ ದಾಸ್ತಾನು",
  "my lot",
  "my tomato",
  "my onion",
  "current stock",
];

const CROP_ALIASES: Record<string, string> = {
  tomato: "tomato",
  tomatoes: "tomato",
  "టమోటా": "tomato",
  "టమాటా": "tomato",
  onion: "onion",
  onions: "onion",
  "ఉల్లిపాయ": "onion",
  "ఉల్లిగడ్డ": "onion",
  potato: "potato",
  potatoes: "potato",
  "బంగాళాదుంప": "potato",
  chilli: "green-chilli",
  chillies: "green-chilli",
  chili: "green-chilli",
  "మిరప": "green-chilli",
  "మిర్చి": "green-chilli",
  paddy: "paddy",
  rice: "paddy",
  "వరి": "paddy",
  maize: "maize",
  corn: "maize",
  "మొక్కజొన్న": "maize",
  cotton: "cotton",
  "పత్తి": "cotton",
  turmeric: "turmeric",
  "పసుపు": "turmeric",
};

export function includesAny(text: string, hints: string[]) {
  const normalized = text.toLowerCase();
  return hints.some((hint) => normalized.includes(hint.toLowerCase()));
}

export function detectLanguage(text: string, fallback: SupportedLanguage = "te") {
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return "te";
  }

  if (/[\u0C80-\u0CFF]/.test(text)) {
    return "kn";
  }

  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  return fallback;
}

export function extractCropSlug(text: string) {
  const normalized = text.toLowerCase();

  for (const [alias, slug] of Object.entries(CROP_ALIASES)) {
    if (normalized.includes(alias.toLowerCase())) {
      return slug;
    }
  }

  const words = normalized.split(/[\s,.;:!?]+/);

  for (const word of words) {
    const crop = findTargetCrop(word);
    if (crop) {
      return crop.slug;
    }
  }

  return undefined;
}

export function extractDistrict(text: string) {
  const normalized = text.toLowerCase();

  for (const region of TARGET_REGIONS) {
    for (const district of region.districts) {
      if (normalized.includes(district.toLowerCase())) {
        return district;
      }
    }
  }

  return undefined;
}

export function extractThreshold(text: string) {
  const match = text.match(/(?:₹|rs\.?|rupees)?\s*(\d{2,5})/i);
  if (!match) {
    return undefined;
  }

  const threshold = Number(match[1]);
  return Number.isFinite(threshold) ? threshold : undefined;
}

import { getGeminiClient } from "@/lib/gemini";

export async function classifyIntent(
  message: IncomingWhatsAppMessage,
  fallbackLanguage: SupportedLanguage,
): Promise<IntentResult> {
  const text = message.body.trim();
  const language = detectLanguage(text, fallbackLanguage);
  const cropSlug = extractCropSlug(text);
  const district = extractDistrict(text);
  const threshold = extractThreshold(text);
  
  const gemini = getGeminiClient();
  if (gemini && text.length > 2) {
    try {
      const model = gemini.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      const prompt = `
You are an agricultural intent classifier for India.
Message: "${text}"

Determine the user's intent. Possible values:
- PRICE_CHECK (asks for current price)
- BEST_MARKET (where to sell)
- SELL_ADVICE (when to sell/hold)
- SETUP_ALERT (wants price alert)
- CONNECT_FPO (connect to buyer/fpo)
- REGISTER_LISTING (want to sell inventory)
- REGISTER_INVENTORY (FPO wants to add stock)
- FORECAST (future prediction)
- INVENTORY_QUERY (asking about their own stored stock, "my inventory", "how much do I have")
- OTHER

Output JSON: { "intent": "INTENT_NAME" }
`;
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      
      const validIntents = ["PRICE_CHECK", "BEST_MARKET", "SELL_ADVICE", "SETUP_ALERT", "CONNECT_FPO", "REGISTER_LISTING", "REGISTER_INVENTORY", "FORECAST", "INVENTORY_QUERY", "OTHER"];
      
      if (parsed.intent && validIntents.includes(parsed.intent)) {
        return {
          intent: parsed.intent as WhatsAppIntent,
          cropSlug,
          district,
          language,
          threshold,
        };
      }
    } catch (e) {
      console.warn("Gemini intent setup failed, using fallback regex matcher", e);
    }
  }

  const normalized = text.toLowerCase();

  if (includesAny(normalized, INVENTORY_QUERY_HINTS)) {
    return {
      intent: "INVENTORY_QUERY",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, ALERT_HINTS)) {
    return {
      intent: "SETUP_ALERT",
      cropSlug,
      district,
      threshold,
      language,
    };
  }

  if (includesAny(normalized, REGISTER_LISTING_HINTS)) {
    return {
      intent: "REGISTER_LISTING",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, REGISTER_INVENTORY_HINTS)) {
    return {
      intent: "REGISTER_INVENTORY",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, CONNECT_FPO_HINTS)) {
    return {
      intent: "CONNECT_FPO",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, FORECAST_HINTS)) {
    return {
      intent: "FORECAST",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, BEST_MARKET_HINTS)) {
    return {
      intent: "BEST_MARKET",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, SELL_ADVICE_HINTS)) {
    return {
      intent: "SELL_ADVICE",
      cropSlug,
      district,
      language,
    };
  }

  if (includesAny(normalized, PRICE_HINTS) || Boolean(cropSlug)) {
    return {
      intent: "PRICE_CHECK",
      cropSlug,
      district,
      language,
    };
  }

  return {
    intent: "OTHER",
    cropSlug,
    district,
    language,
  };
}
