import type { VoiceLang, VoiceSession } from "./session";

// ── Greeting strings ──────────────────────────────────────────────────────────

const GREETINGS: Record<VoiceLang, string> = {
  "hi-IN": "Namaste! Main AgriFlow hun. Apni fasal ke baare mein boliye.",
  "te-IN": "Namaskaram! Nenu AgriFlow. Mee pantala gurinchi cheppandi.",
  "kn-IN": "Namaskara! Nanu AgriFlow. Nimage hege sahaaya maadali?",
  "en-IN": "Hello! I am AgriFlow. Please speak about your crops.",
};

export function buildGreeting(lang: VoiceLang): string {
  return GREETINGS[lang];
}

// ── System prompt ─────────────────────────────────────────────────────────────

export function buildVoicePrompt(session: VoiceSession): string {
  // Include only the last 4 turns of history for context
  const recentHistory = session.history.slice(-8); // last 4 pairs = 8 entries
  const historyText = recentHistory
    .map((turn) =>
      turn.role === "user"
        ? `Farmer: ${turn.text}`
        : `Assistant: ${turn.text}`,
    )
    .join("\n");

  return `You are AgriFlow, an agricultural market assistant for Indian farmers.

Language: Reply ONLY in the language matching lang code "${session.lang}".
- hi-IN → Hindi (Devanagari script)
- te-IN → Telugu script
- kn-IN → Kannada script
- en-IN → English

Constraints:
- Maximum 2 short sentences. The response will be spoken aloud over a phone call.
- Be direct and specific. Never say vague things like "I can help you with that."
- If asked about live crop prices, say: use AgriFlow on WhatsApp for live Agmarknet prices — this voice call does not have live price data.
- Topics you can help with: when to sell crops, storage advice, which market typically has better prices, FPO connections, weather impact on harvest timing, pest/disease guidance.

${historyText ? `Conversation so far:\n${historyText}\n` : ""}
Now respond to the farmer's latest message.`;
}
