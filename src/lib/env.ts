import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  TWILIO_SMS_NUMBER: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_STYLE_ID: z.string().optional(),
  AGMARKNET_API_KEY: z.string().optional(),
  AGMARKNET_RESOURCE_ID: z.string().optional(),
  AGMARKNET_BASE_URL: z.string().url().optional(),
  IMD_WEATHER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}

export function getIntegrationReadiness() {
  const env = getEnv();

  return {
    supabase:
      Boolean(env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    clerk:
      Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
      Boolean(env.CLERK_SECRET_KEY),
    twilio:
      Boolean(env.TWILIO_ACCOUNT_SID) &&
      Boolean(env.TWILIO_AUTH_TOKEN) &&
      Boolean(env.TWILIO_WHATSAPP_NUMBER),
    upstash:
      Boolean(env.UPSTASH_REDIS_REST_URL) &&
      Boolean(env.UPSTASH_REDIS_REST_TOKEN),
    gemini: Boolean(env.GEMINI_API_KEY),
    maps:
      Boolean(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) &&
      Boolean(env.GOOGLE_MAPS_API_KEY),
    agmarknet: Boolean(env.AGMARKNET_API_KEY),
    resend: Boolean(env.RESEND_API_KEY),
  };
}

export function hasSupabaseReadConfig() {
  const env = getEnv();

  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseWriteConfig() {
  const env = getEnv();

  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getRequiredSupabaseEnv() {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getRequiredSupabaseAdminEnv() {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getAgmarknetConfig() {
  const env = getEnv();

  return {
    apiKey: env.AGMARKNET_API_KEY,
    resourceId: env.AGMARKNET_RESOURCE_ID,
    baseUrl: env.AGMARKNET_BASE_URL ?? "https://api.data.gov.in/resource",
  };
}
