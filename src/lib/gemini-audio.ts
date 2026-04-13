import { Buffer } from "node:buffer";

import { getGeminiClient } from "@/lib/gemini";

function normalizeMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim().toLowerCase() || "audio/ogg";
}

function cleanupTranscript(text: string) {
  return text
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();
}

export async function transcribeAudioBufferWithGemini(
  buffer: Buffer,
  mimeType: string,
) {
  const gemini = getGeminiClient();

  if (!gemini) {
    return null;
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0,
    },
  });

  const result = await model.generateContent([
    {
      text: [
        "Transcribe this voice message exactly in the language it is spoken (e.g. Telugu, Hindi, Kannada, English).",
        "Output the transcript strictly in the native script of that language (e.g. use Telugu script for Telugu).",
        "Do not translate it to English or transliterate. Return ONLY the transcribed text without extra labels.",
      ].join(" "),
    },
    {
      inlineData: {
        mimeType: normalizeMimeType(mimeType),
        data: buffer.toString("base64"),
      },
    },
  ]);

  return cleanupTranscript(result.response.text());
}
