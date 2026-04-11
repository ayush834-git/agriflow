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
        "Transcribe this farmer voice message exactly.",
        "Return only the spoken words as plain text.",
        "Do not summarize, translate, add labels, or add markdown.",
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
