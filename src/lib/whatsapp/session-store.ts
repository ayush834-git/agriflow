import { hasSupabaseWriteConfig } from "@/lib/env";
import { getRedisClient } from "@/lib/redis";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppIntent, WhatsAppSession } from "@/lib/whatsapp/types";

const SESSION_TTL_HOURS = 24;

declare global {
  var __agriflowWhatsappSessions: Map<string, WhatsAppSession> | undefined;
}

type PersistedWhatsAppSessionRow = {
  phone: string;
  user_id: string | null;
  language: WhatsAppSession["language"];
  state: string;
  last_intent: WhatsAppIntent | null;
  context: WhatsAppSession["context"];
  last_message_at: string;
  session_expires_at: string;
};

function getFallbackStore() {
  if (!globalThis.__agriflowWhatsappSessions) {
    globalThis.__agriflowWhatsappSessions = new Map<string, WhatsAppSession>();
  }

  return globalThis.__agriflowWhatsappSessions;
}

export function resetFallbackWhatsAppSessions() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowWhatsappSessions = new Map<string, WhatsAppSession>();
}

function buildDefaultSession(phone: string): WhatsAppSession {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

  return {
    phone,
    language: "te",
    state: "IDLE",
    lastIntent: null,
    context: {},
    lastMessageAt: now.toISOString(),
    sessionExpiresAt: expiresAt.toISOString(),
  };
}

export async function getWhatsAppSession(phone: string) {
  const redis = getRedisClient();
  if (redis) {
    const cached = await redis.get<WhatsAppSession>(`wa_sess:${phone}`);
    if (cached) {
      return cached;
    }
  }

  if (!hasSupabaseWriteConfig()) {
    return getFallbackStore().get(phone) ?? buildDefaultSession(phone);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load WhatsApp session: ${error.message}`);
  }

  if (!data) {
    return buildDefaultSession(phone);
  }

  const row = data as unknown as PersistedWhatsAppSessionRow;

  return {
    phone: row.phone,
    userId: row.user_id ?? null,
    language: row.language,
    state: row.state,
    lastIntent: row.last_intent ?? null,
    context: row.context ?? {},
    lastMessageAt: row.last_message_at,
    sessionExpiresAt: row.session_expires_at,
  } satisfies WhatsAppSession;
}

export async function saveWhatsAppSession(session: WhatsAppSession) {
  const redis = getRedisClient();
  if (redis) {
    await redis.set(`wa_sess:${session.phone}`, session, { ex: SESSION_TTL_HOURS * 3600 });
  }

  if (!hasSupabaseWriteConfig()) {
    if (!redis) {
      getFallbackStore().set(session.phone, session);
    }
    return;
  }

  // Backup to Supabase
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("whatsapp_sessions").upsert(
    {
      phone: session.phone,
      user_id: session.userId ?? null,
      language: session.language,
      state: session.state,
      last_intent: session.lastIntent ?? null,
      context: session.context,
      last_message_at: session.lastMessageAt,
      session_expires_at: session.sessionExpiresAt,
    } as never,
    {
      onConflict: "phone",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    throw new Error(`Failed to save WhatsApp session to database: ${error.message}`);
  }
}

export function touchSession(
  session: WhatsAppSession,
  updates: Partial<WhatsAppSession>,
): WhatsAppSession {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

  return {
    ...session,
    ...updates,
    context: {
      ...session.context,
      ...(updates.context ?? {}),
    },
    lastMessageAt: now.toISOString(),
    sessionExpiresAt: expiresAt.toISOString(),
  };
}
