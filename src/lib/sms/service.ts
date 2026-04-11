import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { computePriceGaps, latestPricesForCrop } from "@/lib/market/engine";
import { loadStoredGapsForCrop, loadStoredPricesForCrop } from "@/lib/market/repository";
import {
  buildFarmerRegistrationUrl,
  formatRegistrationPrompt,
} from "@/lib/users/registration";
import { findUserByPhone } from "@/lib/users/store";
import { classifyIntent } from "@/lib/whatsapp/intents";
import { buildTwimlMessage } from "@/lib/whatsapp/service";
import type { IntentResult, SupportedLanguage } from "@/lib/whatsapp/types";

export type IncomingSmsMessage = {
  from: string;
  to?: string;
  body: string;
};

type MarketSnapshot = {
  cropName: string;
  source: "database" | "live" | "mock";
  prices: ReturnType<typeof latestPricesForCrop>;
  gaps: ReturnType<typeof computePriceGaps>;
};

type SmsBotResult = {
  body: string;
  language: SupportedLanguage;
};

const HELP_TEXT: Record<SupportedLanguage, string> = {
  te: "Price, best market, alert, leka sell advice adagandi. Udaharana: tomato price",
  hi: "Price, best market, alert ya sell advice puchhiye. Udaharan: tomato price",
  kn: "Price, best market, alert athava sell advice keli. Udaharane: tomato price",
  en: "Ask for price, best market, alert, or sell advice. Example: tomato price",
};

const NEED_CROP_TEXT: Record<SupportedLanguage, string> = {
  te: "Ye crop kavalo cheppandi. Example: tomato, onion, chilli.",
  hi: "Kaunsi fasal chahiye batayiye. Example: tomato, onion, chilli.",
  kn: "Yava bele beku heli. Example: tomato, onion, chilli.",
  en: "Tell me the crop. Example: tomato, onion, chilli.",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSourceSuffix(source: MarketSnapshot["source"]) {
  if (source === "database") {
    return "";
  }

  return source === "mock" ? " [demo]" : " [live]";
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

function formatPriceReply(
  snapshot: MarketSnapshot,
  district: string | undefined,
  language: SupportedLanguage,
) {
  const topPrice = snapshot.prices[0];
  const localPrice = district
    ? snapshot.prices.find((price) => price.district === district)
    : undefined;
  const bestGap =
    snapshot.gaps.find((gap) => !district || gap.sourceDistrict === district) ??
    snapshot.gaps[0];

  if (!topPrice) {
    return HELP_TEXT[language];
  }

  const parts = [
    `${snapshot.cropName}: top ${topPrice.district} ${formatCurrency(topPrice.modalPrice)}`,
  ];

  if (localPrice) {
    parts.push(`local ${localPrice.district} ${formatCurrency(localPrice.modalPrice)}`);
  }

  if (bestGap) {
    parts.push(
      `best route ${bestGap.sourceDistrict}->${bestGap.targetDistrict} gap ${formatCurrency(bestGap.priceGap)}`,
    );
  }

  return `${parts.join(" | ")}${formatSourceSuffix(snapshot.source)}`;
}

function formatBestMarketReply(
  snapshot: MarketSnapshot,
  district: string | undefined,
  language: SupportedLanguage,
) {
  const route =
    snapshot.gaps.find((gap) => !district || gap.sourceDistrict === district) ??
    snapshot.gaps[0];

  if (!route) {
    return HELP_TEXT[language];
  }

  return `${snapshot.cropName}: sell from ${route.sourceDistrict} to ${route.targetDistrict}, ${route.targetState}. Gap ${formatCurrency(route.priceGap)}${formatSourceSuffix(snapshot.source)}`;
}

function formatSellAdviceReply(
  snapshot: MarketSnapshot,
  district: string | undefined,
  language: SupportedLanguage,
) {
  const route =
    snapshot.gaps.find((gap) => !district || gap.sourceDistrict === district) ??
    snapshot.gaps[0];

  if (!route) {
    return HELP_TEXT[language];
  }

  const action =
    route.priceGap >= route.sourceModalPrice * 0.12
      ? "SELL"
      : route.priceGap >= route.sourceModalPrice * 0.05
        ? "TRACK"
        : "HOLD";

  return `${snapshot.cropName}: ${action}. Local ${route.sourceDistrict} ${formatCurrency(route.sourceModalPrice)}. Best ${route.targetDistrict} ${formatCurrency(route.targetModalPrice)}.${formatSourceSuffix(snapshot.source)}`;
}

function formatAlertReply(
  cropSlug: string,
  threshold: number,
  language: SupportedLanguage,
) {
  const crop = getTargetCropOrThrow(cropSlug);

  if (language === "te") {
    return `${crop.name} ${formatCurrency(threshold)} datite alert pampistanu.`;
  }

  if (language === "hi") {
    return `${crop.name} ${formatCurrency(threshold)} paar karega to alert bhejunga.`;
  }

  if (language === "kn") {
    return `${crop.name} ${formatCurrency(threshold)} mele hodare alert kaluhisuttene.`;
  }

  return `I will alert you when ${crop.name} crosses ${formatCurrency(threshold)}.`;
}

export function buildSmsTwiml(body: string) {
  return buildTwimlMessage(body);
}

export async function processSmsMessage(
  incomingMessage: IncomingSmsMessage,
): Promise<SmsBotResult> {
  const registeredUser = await findUserByPhone(incomingMessage.from);
  const fallbackLanguage = registeredUser?.preferredLanguage ?? "en";
  const intentResult = await classifyIntent(
    {
      from: incomingMessage.from,
      body: incomingMessage.body,
      numMedia: 0,
    },
    fallbackLanguage,
  );
  const enrichedIntent: IntentResult = {
    ...intentResult,
    district: intentResult.district ?? registeredUser?.district ?? undefined,
  };

  if (!registeredUser) {
    return {
      body: formatRegistrationPrompt(
        enrichedIntent.language,
        buildFarmerRegistrationUrl({
          phone: incomingMessage.from,
          language: enrichedIntent.language,
          source: "sms",
        }),
      ),
      language: enrichedIntent.language,
    };
  }

  if (!enrichedIntent.cropSlug && enrichedIntent.intent !== "OTHER") {
    return {
      body: NEED_CROP_TEXT[enrichedIntent.language],
      language: enrichedIntent.language,
    };
  }

  switch (enrichedIntent.intent) {
    case "PRICE_CHECK": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      return {
        body: formatPriceReply(
          snapshot,
          enrichedIntent.district,
          enrichedIntent.language,
        ),
        language: enrichedIntent.language,
      };
    }
    case "BEST_MARKET": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      return {
        body: formatBestMarketReply(
          snapshot,
          enrichedIntent.district,
          enrichedIntent.language,
        ),
        language: enrichedIntent.language,
      };
    }
    case "SELL_ADVICE": {
      const snapshot = await getMarketSnapshot(enrichedIntent.cropSlug!);
      return {
        body: formatSellAdviceReply(
          snapshot,
          enrichedIntent.district,
          enrichedIntent.language,
        ),
        language: enrichedIntent.language,
      };
    }
    case "SETUP_ALERT":
      return {
        body: formatAlertReply(
          enrichedIntent.cropSlug!,
          enrichedIntent.threshold ?? 2200,
          enrichedIntent.language,
        ),
        language: enrichedIntent.language,
      };
    case "OTHER":
    default:
      return {
        body: HELP_TEXT[enrichedIntent.language],
        language: enrichedIntent.language,
      };
  }
}
