import { NextResponse } from "next/server";

import { buildTwimlMessage, processWhatsAppMessage } from "@/lib/whatsapp/service";
import type { IncomingWhatsAppMessage } from "@/lib/whatsapp/types";

export const dynamic = "force-dynamic";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseIncomingMessage(formData: FormData): IncomingWhatsAppMessage {
  const numMedia = Number(getFormValue(formData, "NumMedia") || "0");

  return {
    from: getFormValue(formData, "From"),
    to: getFormValue(formData, "To") || undefined,
    body: getFormValue(formData, "Body"),
    profileName: getFormValue(formData, "ProfileName") || undefined,
    numMedia: Number.isFinite(numMedia) ? numMedia : 0,
    mediaUrl: getFormValue(formData, "MediaUrl0") || undefined,
    mediaContentType: getFormValue(formData, "MediaContentType0") || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const incomingMessage = parseIncomingMessage(formData);

    if (!incomingMessage.from) {
      return new NextResponse(buildTwimlMessage("Missing sender number."), {
        status: 400,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    const response = await processWhatsAppMessage(incomingMessage);

    return new NextResponse(buildTwimlMessage(response.body), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new NextResponse(
      buildTwimlMessage(
        error instanceof Error
          ? `AgriFlow bot error: ${error.message}`
          : "AgriFlow bot error.",
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
