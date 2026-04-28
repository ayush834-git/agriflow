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

function getTtsClient(): TextToSpeechClient | null {
  if (ttsClient) return ttsClient;

  const env = getEnv();
  if (!env.GOOGLE_TTS_CREDENTIALS_JSON) {
    return null; // Return null gracefully if no credentials
  }

  try {
    const creds = JSON.parse(
      Buffer.from(env.GOOGLE_TTS_CREDENTIALS_JSON, "base64").toString("utf-8"),
    ) as Record<string, unknown>;

    ttsClient = new TextToSpeechClient({ credentials: creds });
    return ttsClient;
  } catch (error) {
    console.warn("[voice:tts] Failed to parse GOOGLE_TTS_CREDENTIALS_JSON");
    return null;
  }
}

// ── Synthesis ─────────────────────────────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  lang: VoiceLang,
): Promise<Buffer | null> {
  const client = getTtsClient();
  
  if (!client) {
    return null; // Return null so the webhook falls back to Exotel <Say>
  }

  const voice = VOICE_MAP[lang];

  try {
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
      console.warn("[voice:tts] Google TTS returned no audioContent.");
      return null;
    }

    return Buffer.from(
      typeof audioContent === "string" ? audioContent : audioContent,
    );
  } catch (error) {
    console.error("[voice:tts] Synthesis failed:", error);
    return null;
  }
}
