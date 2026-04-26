/**
 * Exotel Voice Webhook — AgriFlow
 *
 * Exotel Dashboard Setup:
 *   → ExoPhones → select number → App Settings
 *   → Passthru URL = https://yourdomain.com/api/voice/webhook
 *   → Method: POST
 *   → Enable: Recording on all legs
 *
 * Free-tier call flow:
 *   TURN 1  — No RecordingUrl  → Greet + <Record>
 *   TURN 2+ — RecordingUrl set → Download → STT → Gemini → TTS → <Play> + <Record>
 */

export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { transcribeAudioBufferWithGemini } from "@/lib/gemini-audio";
import { getGeminiClient } from "@/lib/gemini";
import { getEnv } from "@/lib/env";
import {
  getOrCreateSession,
  saveSession,
  detectLang,
  storeAudio,
  type VoiceLang,
} from "@/lib/voice/session";
import { buildGreeting, buildVoicePrompt } from "@/lib/voice/prompt";
import { synthesizeSpeech } from "@/lib/voice/tts";

// ── Exotel IP allowlist (free tier uses IP allowlisting, not HMAC) ────────────
// Source: https://developer.exotel.com/api/#ip-whitelisting

const EXOTEL_IP_RANGES = [
  "52.172.10.32/27",
  "13.235.147.64/26",
  "65.0.234.240/28",
] as const;

// ── CIDR helpers ──────────────────────────────────────────────────────────────

function ipToInt(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split("/");
  if (!network || !prefixStr) return false;
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToInt(ip) & mask) >>> 0 === (ipToInt(network) & mask) >>> 0;
}

function isExotelIp(request: NextRequest): boolean {
  // Skip IP check in development so you can test locally
  if (process.env.NODE_ENV === "development") return true;

  const forwarded = request.headers.get("x-forwarded-for");
  const cfIp = request.headers.get("cf-connecting-ip");
  const raw = (forwarded ? forwarded.split(",")[0] : cfIp) ?? "";
  const ip = raw.trim();

  if (!ip) return false;
  return EXOTEL_IP_RANGES.some((range) => isIpInCidr(ip, range));
}

// ── ExoML helpers ─────────────────────────────────────────────────────────────

function buildExoML(innerXml: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${innerXml}</Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}

function recordTag(): string {
  return `<Record action="/api/voice/webhook" method="POST" maxLength="12" transcribe="false" />`;
}

const FALLBACK_MESSAGES: Record<VoiceLang, string> = {
  "hi-IN": "Kshama karein, kuch takneeki samasya aayi hai. Kripya dobara boliye.",
  "te-IN": "Maafi cheyandi, technical samasya vacchindi. Meeru malli cheppandi.",
  "kn-IN": "Kshamisiri, technical samasya aagide. Dayavittu matte helidiru.",
  "en-IN": "Sorry, a technical issue occurred. Please speak again.",
};

function fallbackExoML(lang: VoiceLang): Response {
  const msg = FALLBACK_MESSAGES[lang];
  return buildExoML(
    `<Say voice="woman" language="${lang}">${msg}</Say>${recordTag()}`,
  );
}

const FAREWELL_MESSAGES: Record<VoiceLang, string> = {
  "hi-IN": "Shukriya AgriFlow istemal karne ke liye. Khyal rakhiye!",
  "te-IN": "AgriFlow upayoginchinduku dhanyavaadaalu. Jagratta!",
  "kn-IN": "AgriFlow upayogisiddakke dhanyavaada. Jaagruta vaagiri!",
  "en-IN": "Thank you for using AgriFlow. Take care!",
};

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 1. IP validation
    if (!isExotelIp(request)) {
      console.warn("[voice:webhook] blocked request from non-Exotel IP");
      return new Response("Forbidden", { status: 403 });
    }

    // 2. Parse body
    const text = await request.text();
    const params = Object.fromEntries(new URLSearchParams(text));
    const { CallSid, From, RecordingUrl } = params;

    if (!CallSid) {
      console.warn("[voice:webhook] missing CallSid in request");
      return fallbackExoML("hi-IN");
    }

    // 3. Load / create session
    const session = await getOrCreateSession(CallSid, From ?? "unknown");

    // 4. First turn — no recording yet
    if (!RecordingUrl) {
      await saveSession(session);
      const greeting = buildGreeting(session.lang);
      return buildExoML(
        `<Say voice="woman" language="${session.lang}">${greeting}</Say>${recordTag()}`,
      );
    }

    // 5. Subsequent turns — recording available
    const env = getEnv();

    // 5a. Download recording from Exotel (requires Basic Auth)
    if (!env.EXOTEL_API_KEY || !env.EXOTEL_API_TOKEN) {
      console.error("[voice:webhook] EXOTEL_API_KEY or EXOTEL_API_TOKEN not set");
      return fallbackExoML(session.lang);
    }

    const authHeader = Buffer.from(
      `${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}`,
    ).toString("base64");

    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const audioRes = await fetch(RecordingUrl, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      if (!audioRes.ok) {
        console.error(
          `[voice:webhook] failed to download recording: ${audioRes.status} ${audioRes.statusText}`,
        );
        return fallbackExoML(session.lang);
      }
      audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      mimeType = audioRes.headers.get("content-type") ?? "audio/wav";
    } catch (err) {
      console.error("[voice:webhook] recording download error:", err);
      return fallbackExoML(session.lang);
    }

    // 5b. Transcribe using existing function (DO NOT rewrite)
    const transcript = await transcribeAudioBufferWithGemini(audioBuffer, mimeType);
    if (!transcript) {
      console.warn("[voice:webhook] transcription returned null");
      return fallbackExoML(session.lang);
    }

    // 5c. Detect language & update session history
    session.lang = detectLang(transcript);
    session.history.push({ role: "user", text: transcript });
    if (session.history.length > 8) {
      session.history = session.history.slice(-8);
    }

    // 5d. Generate Gemini response
    const gemini = getGeminiClient();
    if (!gemini) {
      console.error("[voice:webhook] Gemini client unavailable");
      return fallbackExoML(session.lang);
    }

    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.4, maxOutputTokens: 120 },
    });

    const systemPrompt = buildVoicePrompt(session);
    let responseText: string;
    try {
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: transcript },
      ]);
      responseText = result.response.text().trim();
    } catch (err) {
      console.error("[voice:webhook] Gemini generation error:", err);
      return fallbackExoML(session.lang);
    }

    if (!responseText) {
      console.warn("[voice:webhook] Gemini returned empty response");
      return fallbackExoML(session.lang);
    }

    // 5e. TTS — synthesize and store MP3 in Redis
    let audioId: string | null = null;
    try {
      const mp3 = await synthesizeSpeech(responseText, session.lang);
      audioId = randomUUID();
      await storeAudio(audioId, mp3);
    } catch (err) {
      console.error("[voice:tts]", err);
      // audioId stays null → fall through to <Say>
    }

    // 5f. Update session
    session.history.push({ role: "assistant", text: responseText });
    session.turnCount += 1;
    await saveSession(session);

    // 5g. Build ExoML response
    if (session.turnCount >= 15) {
      const bye = FAREWELL_MESSAGES[session.lang];
      return buildExoML(
        `<Say voice="woman" language="${session.lang}">${bye}</Say><Hangup/>`,
      );
    }

    const audioUrl = `${env.NEXT_PUBLIC_APP_URL}/api/voice/audio/${audioId}`;
    const playOrSay = audioId
      ? `<Play>${audioUrl}</Play>`
      : `<Say voice="woman" language="${session.lang}">${responseText}</Say>`;

    return buildExoML(`${playOrSay}${recordTag()}`);
  } catch (error) {
    // 6. Catch-all — never return a non-2xx to Exotel (it drops the call)
    console.error("[voice:webhook] unhandled error:", error);
    return fallbackExoML("hi-IN");
  }
}
