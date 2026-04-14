import { Buffer } from "node:buffer";

import twilio from "twilio";

import { getEnv } from "@/lib/env";
import { normalizePhone } from "@/lib/users/store";

let twilioClient: twilio.Twilio | null = null;

function normalizeWhatsAppAddress(value: string) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("whatsapp:")
    ? normalized
    : `whatsapp:${normalized}`;
}

export function isTwilioMessagingConfigured() {
  const env = getEnv();

  return Boolean(env.TWILIO_ACCOUNT_SID) &&
    Boolean(env.TWILIO_AUTH_TOKEN) &&
    Boolean(env.TWILIO_WHATSAPP_NUMBER);
}

export function getTwilioClient() {
  if (twilioClient) {
    return twilioClient;
  }

  const env = getEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export function buildAbsoluteAppUrl(pathname: string) {
  const env = getEnv();
  return new URL(pathname, env.NEXT_PUBLIC_APP_URL).toString();
}

export async function downloadTwilioMedia(mediaUrl: string) {
  const env = getEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are missing for media download.");
  }

  const authorization = Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
  ).toString("base64");

  let response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Basic ${authorization}`,
    },
    cache: "no-store",
    redirect: "manual",
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Twilio redirect missing location header (status: ${response.status}).`);
    }

    response = await fetch(location, {
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(
      `Twilio media download failed with ${response.status} ${response.statusText}.`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function sendWhatsAppText(params: { to: string; body: string }) {
  const env = getEnv();
  const client = getTwilioClient();

  if (!client || !env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("Twilio WhatsApp delivery is not configured.");
  }

  const from = env.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")
    ? env.TWILIO_WHATSAPP_NUMBER
    : normalizeWhatsAppAddress(env.TWILIO_WHATSAPP_NUMBER);
  const to = normalizeWhatsAppAddress(params.to);

  if (!from || !to) {
    throw new Error("A valid WhatsApp from/to number is required.");
  }

  const message = await client.messages.create({
    from,
    to,
    body: params.body,
  });

  return {
    sid: message.sid,
    status: message.status ?? null,
  };
}
