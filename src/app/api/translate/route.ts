import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export const dynamic = "force-dynamic";

const langNames: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  kn: "Kannada",
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      targetLanguage?: string;
    };

    if (!body.text || !body.text.trim()) {
      return NextResponse.json({ ok: true, translatedText: body.text ?? "" });
    }

    const targetLang = body.targetLanguage ?? "en";
    if (targetLang === "en" || !langNames[targetLang]) {
      return NextResponse.json({ ok: true, translatedText: body.text });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return NextResponse.json({ ok: true, translatedText: body.text });
    }

    const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Translate the following agricultural market text into ${langNames[targetLang]}.
Use simple, natural language that an Indian farmer would understand.
Return only the translated text, no explanation, no quotes.

Text: ${body.text}`;

    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    return NextResponse.json({ ok: true, translatedText });
  } catch (error) {
    console.error("[translate] translation error:", error);
    return NextResponse.json(
      { ok: false, error: "Translation failed" },
      { status: 500 },
    );
  }
}
