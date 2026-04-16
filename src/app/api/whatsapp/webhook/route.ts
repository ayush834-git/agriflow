import { NextResponse } from "next/server";

import { getRedisClient } from "@/lib/redis";
import { buildTwimlMessage, processWhatsAppMessage } from "@/lib/whatsapp/service";
import type { IncomingWhatsAppMessage } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGES_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

declare global {
  var __agriFlowWebhookRateLimitFallback:
    | Map<string, { count: number; expiresAt: number }>
    | undefined;
}

function getWebhookRateLimitFallbackStore() {
  if (!globalThis.__agriFlowWebhookRateLimitFallback) {
    globalThis.__agriFlowWebhookRateLimitFallback = new Map();
  }

  return globalThis.__agriFlowWebhookRateLimitFallback;
}

function normalizePhoneForRateLimit(from: string) {
  return from.replace(/^whatsapp:/i, "").trim().toLowerCase();
}

async function isWithinWebhookRateLimit(from: string) {
  const phone = normalizePhoneForRateLimit(from);
  if (!phone) {
    return true;
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      const key = `wa:webhook:rate:${phone}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
      }

      return count <= MAX_MESSAGES_PER_MINUTE;
    } catch (error) {
      console.warn(
        "[whatsapp-webhook] rate limiter fallback activated after Redis error",
        {
          phone,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  const store = getWebhookRateLimitFallbackStore();
  const now = Date.now();
  const existing = store.get(phone);

  if (!existing || existing.expiresAt <= now) {
    store.set(phone, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    });
    return true;
  }

  existing.count += 1;
  store.set(phone, existing);
  return existing.count <= MAX_MESSAGES_PER_MINUTE;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseIncomingMessage(formData: FormData): IncomingWhatsAppMessage {
  const numMedia = Number(getFormValue(formData, "NumMedia") || "0");

  return {
    from: getFormValue(formData, "From"),
    to: getFormValue(formData, "To") || undefined,
    body: getFormValue(formData, "Body"),
    profileName: getFormValue(formData, "ProfileName") || undefined,
    numMedia: Number.isFinite(numMedia) ? numMedia : 0,
    mediaUrl: getFormValue(formData, "MediaUrl0") || undefined,
    mediaContentType: getFormValue(formData, "MediaContentType0") || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const incomingMessage = parseIncomingMessage(formData);

    if (!incomingMessage.from) {
      return new NextResponse(buildTwimlMessage("Missing sender number."), {
        status: 400,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    const withinLimit = await isWithinWebhookRateLimit(incomingMessage.from);
    if (!withinLimit) {
      return new NextResponse(
        buildTwimlMessage(
          "You are sending messages too quickly. Please wait a minute and try again.",
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
          },
        },
      );
    }

    const response = await processWhatsAppMessage(incomingMessage);

    return new NextResponse(buildTwimlMessage(response.body), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new NextResponse(
      buildTwimlMessage(
        error instanceof Error
          ? `AgriFlow bot error: ${error.message}`
          : "AgriFlow bot error.",
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    );
  }
}
