import { NextResponse } from "next/server";

import { buildSmsTwiml, processSmsMessage } from "@/lib/sms/service";
import type { IncomingSmsMessage } from "@/lib/sms/service";
import { verifyTwilioSignature } from "@/lib/twilio/auth";

export const dynamic = "force-dynamic";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseIncomingMessage(formData: FormData): IncomingSmsMessage {
  return {
    from: getFormValue(formData, "From"),
    to: getFormValue(formData, "To") || undefined,
    body: getFormValue(formData, "Body"),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Verify Twilio signature
    const authCheck = verifyTwilioSignature(request, formData);
    if (!authCheck.valid) {
      return new NextResponse(buildSmsTwiml(authCheck.reason ?? "Forbidden"), {
        status: 403,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    const incomingMessage = parseIncomingMessage(formData);

    if (!incomingMessage.from) {
      return new NextResponse(buildSmsTwiml("Missing sender number."), {
        status: 400,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    }

    const response = await processSmsMessage(incomingMessage);

    return new NextResponse(buildSmsTwiml(response.body), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (error) {
    return new NextResponse(
      buildSmsTwiml(
        error instanceof Error
          ? `AgriFlow SMS bot error: ${error.message}`
          : "AgriFlow SMS bot error.",
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
