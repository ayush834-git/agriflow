import { NextResponse } from "next/server";

import { buildInitialVoiceResponse } from "@/lib/voice/service";

export const dynamic = "force-dynamic";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildVoiceErrorResponse(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${message}</Say></Response>`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = getFormValue(formData, "From");
    const response = await buildInitialVoiceResponse(from);

    return new NextResponse(response, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new NextResponse(
      buildVoiceErrorResponse(
        error instanceof Error ? error.message : "Voice call setup failed.",
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      },
    );
  }
}
