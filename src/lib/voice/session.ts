import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";

// ── Types ────────────────────────────────────────────────────────────────────

export type VoiceLang = "en-IN" | "hi-IN" | "te-IN" | "kn-IN";

export type VoiceSession = {
  callSid: string;
  from: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  lang: VoiceLang;
  turnCount: number;
  startedAt: number; // Date.now()
};

// ── Redis client (lazy singleton) ─────────────────────────────────────────────

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (redisClient) return redisClient;
  const env = getEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash Redis is not configured (missing URL or token).");
  }
  redisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 1800; // 30 minutes
const AUDIO_TTL_SECONDS = 120;    // 2 minutes

function sessionKey(callSid: string): string {
  return `voice:session:${callSid}`;
}

function audioKey(id: string): string {
  return `voice:audio:${id}`;
}

// ── Session helpers ───────────────────────────────────────────────────────────

export async function getOrCreateSession(
  callSid: string,
  from: string,
): Promise<VoiceSession> {
  const redis = getRedis();
  const existing = await redis.get<VoiceSession>(sessionKey(callSid));
  if (existing) return existing;

  const fresh: VoiceSession = {
    callSid,
    from,
    history: [],
    lang: "hi-IN", // safest default for Indian callers
    turnCount: 0,
    startedAt: Date.now(),
  };
  return fresh;
}

export async function saveSession(session: VoiceSession): Promise<void> {
  const redis = getRedis();
  await redis.set(sessionKey(session.callSid), session, {
    ex: SESSION_TTL_SECONDS,
  });
}

// ── Language detection ────────────────────────────────────────────────────────

export function detectLang(text: string): VoiceLang {
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";  // Telugu
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";  // Kannada
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";  // Devanagari / Hindi
  return "en-IN";
}

// ── Audio store (Redis, base64) ───────────────────────────────────────────────

export async function storeAudio(id: string, buffer: Buffer): Promise<void> {
  const redis = getRedis();
  await redis.set(audioKey(id), buffer.toString("base64"), {
    ex: AUDIO_TTL_SECONDS,
  });
}

export async function loadAudio(id: string): Promise<Buffer | null> {
  const redis = getRedis();
  const value = await redis.get<string>(audioKey(id));
  if (!value) return null;
  return Buffer.from(value, "base64");
}
