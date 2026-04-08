import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "./env";

const env = getEnv();

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  if (env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    return geminiClient;
  }

  return null;
}

export function isGeminiAvailable() {
  return Boolean(env.GEMINI_API_KEY);
}
