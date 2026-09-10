import { validateRequest } from "twilio";

export function verifyTwilioSignature(
  request: Request,
  formData: FormData,
): { valid: boolean; reason?: string } {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, reason: "TWILIO_AUTH_TOKEN is not configured." };
    }
    return { valid: true };
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, reason: "Missing X-Twilio-Signature header." };
    }
    // Allow local test calls in development when signature is not supplied
    return { valid: true };
  }

  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const requestUrl = new URL(request.url);
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}${requestUrl.pathname}`
    : request.url;

  const isValid =
    validateRequest(authToken, signature, webhookUrl, params) ||
    validateRequest(authToken, signature, request.url, params);

  if (!isValid) {
    return { valid: false, reason: "Invalid Twilio signature." };
  }

  return { valid: true };
}
