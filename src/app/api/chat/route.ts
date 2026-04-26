import { NextRequest, NextResponse } from "next/server";

import { buildMarketContext, buildUserInventoryContext } from "@/lib/gemini-context";
import { getGeminiClient } from "@/lib/gemini";
import { findUserById } from "@/lib/users/store";
import { listFarmerCropsForUser } from "@/lib/users/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId: string;
      message: string;
    };

    if (!body.userId || !body.message) {
      return NextResponse.json({ ok: false, error: "userId and message are required." }, { status: 400 });
    }

    const user = await findUserById(body.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      return NextResponse.json(
        { ok: false, error: "Gemini is not configured. Set GEMINI_API_KEY." },
        { status: 503 },
      );
    }

    // Build full context about this user's real data
    const [inventoryContext, marketContext] = await Promise.all([
      buildUserInventoryContext(user),
      (async () => {
        const cropSlugs =
          user.role === "FARMER"
            ? (await listFarmerCropsForUser(user.id)).map((c) => c.cropSlug)
            : user.cropsHandled;
        return buildMarketContext(cropSlugs, user.district ?? null);
      })(),
    ]);

    const systemPrompt = `You are AgriFlow AI, an intelligent agricultural assistant embedded in the AgriFlow dashboard for Indian farmers and FPOs.
You have real-time access to this user's actual data — inventory, listings, matches, and live market prices.
Answer the user's question accurately using this data. Be concise, actionable, and warm.
Always show prices in Indian Rupees (₹). If you recommend selling, state the reason clearly.
Do NOT make up prices or invent data not shown below.

${inventoryContext}

${marketContext}`;

    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(body.message);
    const reply = result.response.text().trim();

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    console.error("[chat] Gemini chat failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "AI chat failed.",
      },
      { status: 500 },
    );
  }
}
