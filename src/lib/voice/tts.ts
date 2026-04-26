import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { getEnv } from "@/lib/env";
import type { VoiceLang } from "./session";

// ── Voice map ─────────────────────────────────────────────────────────────────

type VoiceConfig = {
  languageCode: string;
  name: string;
  ssmlGender: "FEMALE" | "MALE" | "NEUTRAL";
};

const VOICE_MAP: Record<VoiceLang, VoiceConfig> = {
  "en-IN": { languageCode: "en-IN", name: "en-IN-Wavenet-D", ssmlGender: "FEMALE" },
  "hi-IN": { languageCode: "hi-IN", name: "hi-IN-Wavenet-A", ssmlGender: "FEMALE" },
  "te-IN": { languageCode: "te-IN", name: "te-IN-Standard-A", ssmlGender: "FEMALE" },
  "kn-IN": { languageCode: "kn-IN", name: "kn-IN-Wavenet-A", ssmlGender: "FEMALE" },
};

// ── Lazy client ───────────────────────────────────────────────────────────────

let ttsClient: TextToSpeechClient | null = null;

function getTtsClient(): TextToSpeechClient {
  if (ttsClient) return ttsClient;

  const env = getEnv();
  if (!env.GOOGLE_TTS_CREDENTIALS_JSON) {
    throw new Error("GOOGLE_TTS_CREDENTIALS_JSON is not set.");
  }

  const creds = JSON.parse(
    Buffer.from(env.GOOGLE_TTS_CREDENTIALS_JSON, "base64").toString("utf-8"),
  ) as Record<string, unknown>;

  ttsClient = new TextToSpeechClient({ credentials: creds });
  return ttsClient;
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  lang: VoiceLang,
): Promise<Buffer> {
  const client = getTtsClient();
  const voice = VOICE_MAP[lang];

  const [response] = await client.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: voice.languageCode,
      name: voice.name,
      ssmlGender: voice.ssmlGender,
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  });

  const audioContent = response.audioContent;
  if (!audioContent) {
    throw new Error("Google TTS returned no audioContent.");
  }

  return Buffer.from(
    typeof audioContent === "string" ? audioContent : audioContent,
  );
}
