import twilio from "twilio";

import { getGeminiClient } from "@/lib/gemini";
import { processWhatsAppMessage } from "@/lib/whatsapp/service";
import { buildAbsoluteAppUrl } from "@/lib/twilio";
import { findUserByPhone } from "@/lib/users/store";
import type { SupportedLanguage } from "@/lib/whatsapp/types";

const VoiceResponse = twilio.twiml.VoiceResponse;

type VoiceRequest = {
  from: string;
  speechResult?: string;
};

function getSpeechModelForCall() {
  return "deepgram_nova-3";
}

function getGatherLanguage(language: SupportedLanguage) {
  if (language === "te") {
    return "te-IN";
  }

  if (language === "kn") {
    return "kn-IN";
  }

  if (language === "hi") {
    return "hi-IN";
  }

  return "en-IN";
}

function getVoiceLanguage(language: SupportedLanguage) {
  return language === "hi" ? "hi-IN" : "en-IN";
}

function getGreeting(language: SupportedLanguage) {
  if (language === "hi") {
    return "Namaste. Main AgriFlow bol raha hoon. Aap Telugu, Hindi, Kannada, ya English mein apna sawal bol sakte hain.";
  }

  return "Welcome to AgriFlow. You can ask your farming question in Telugu, Hindi, Kannada, or English.";
}

function normalizeVoiceText(text: string) {
  return text
    .replace(/https?:\/\/\S+/gi, "the dashboard link")
    .replace(/₹/g, "rupees ")
    .replace(/\bRs\.?/gi, "rupees")
    .replace(/->/g, " to ")
    .replace(/\|/g, ". ")
    .replace(/\//g, " per ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildVoiceFriendlyReply(
  text: string,
  language: SupportedLanguage,
) {
  const gemini = getGeminiClient();
  const safeText = normalizeVoiceText(text);

  if (!gemini) {
    return safeText;
  }

  try {
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
      },
    });
    const spokenLanguage = language === "hi" ? "Hindi" : "English";
    const result = await model.generateContent(
      [
        `Rewrite this AgriFlow answer for a phone call in ${spokenLanguage}.`,
        "Keep every fact accurate.",
        "Use 2 or 3 short spoken sentences.",
        "Do not include markdown, URLs, bullets, or emojis.",
        "Expand abbreviations naturally for speech.",
        `Answer: ${safeText}`,
      ].join(" "),
    );

    return normalizeVoiceText(result.response.text());
  } catch {
    return safeText;
  }
}

function buildGather(
  response: twilio.twiml.VoiceResponse,
  language: SupportedLanguage,
) {
  return response.gather({
    input: ["speech"],
    action: buildAbsoluteAppUrl("/api/voice/respond"),
    method: "POST",
    actionOnEmptyResult: true,
    speechTimeout: "auto",
    speechModel: getSpeechModelForCall(),
    language: getGatherLanguage(language),
    hints:
      "tomato, onion, chilli, maize, paddy, price, best market, sell advice, forecast, alert, connect fpo, create listing",
  });
}

function appendFollowUpPrompt(
  response: twilio.twiml.VoiceResponse,
  language: SupportedLanguage,
) {
  const gather = buildGather(response, language);
  gather.say(
    {
      language: getVoiceLanguage(language),
    },
    language === "hi"
      ? "Aap ek aur sawaal pooch sakte hain."
      : "You can ask one more question now.",
  );
}

export async function buildInitialVoiceResponse(phone: string) {
  const user = await findUserByPhone(phone);
  const language = user?.preferredLanguage ?? "en";
  const response = new VoiceResponse();
  const gather = buildGather(response, language);

  gather.say(
    {
      language: getVoiceLanguage(language),
    },
    getGreeting(language),
  );

  response.redirect(
    {
      method: "POST",
    },
    buildAbsoluteAppUrl("/api/voice/webhook"),
  );

  return response.toString();
}

export async function buildVoiceReplyResponse(input: VoiceRequest) {
  const user = await findUserByPhone(input.from);
  const language = user?.preferredLanguage ?? "en";
  const response = new VoiceResponse();
  const transcript = input.speechResult?.trim();

  if (!transcript) {
    response.say(
      {
        language: getVoiceLanguage(language),
      },
      language === "hi"
        ? "Mujhe awaaz theek se samajh nahi aayi. Kripya dobara boliye."
        : "I could not hear that clearly. Please try again.",
    );
    appendFollowUpPrompt(response, language);
    return response.toString();
  }

  const result = await processWhatsAppMessage({
    from: input.from,
    body: transcript,
    numMedia: 0,
  });
  const spokenReply = await buildVoiceFriendlyReply(result.body, language);

  response.say(
    {
      language: getVoiceLanguage(language),
    },
    spokenReply,
  );
  appendFollowUpPrompt(response, language);

  return response.toString();
}
