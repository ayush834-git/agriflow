import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";
import type { FileMetadataResponse } from "@google/generative-ai/server";

import { getEnv } from "@/lib/env";
import { getGeminiClient } from "@/lib/gemini";

const MAX_AUDIO_BYTES = 20_971_520;
const FILE_ACTIVE_TIMEOUT_MS = 8_000;
const FILE_POLL_INTERVAL_MS = 500;

const TRANSCRIPTION_PROMPT = [
  "Transcribe this voice message exactly in the language spoken.",
  "Use the native script (Telugu -> Telugu script, Hindi -> Devanagari).",
  "Do not translate or transliterate.",
  "Return ONLY the transcribed text.",
].join(" ");

function normalizeMimeType(mimeType: string) {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase();
  return normalized?.startsWith("audio/") ? normalized : "audio/ogg";
}

function cleanupTranscript(text: string) {
  return text
    .replace(/^```(?:text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForActiveFile(options: {
  fileManager: GoogleAIFileManager;
  file: FileMetadataResponse;
}) {
  let file = options.file;
  const deadline = Date.now() + FILE_ACTIVE_TIMEOUT_MS;

  while (file.state === FileState.PROCESSING && Date.now() < deadline) {
    await sleep(Math.min(FILE_POLL_INTERVAL_MS, deadline - Date.now()));
    file = await options.fileManager.getFile(file.name);
  }

  return file;
}

function cleanupTempFile(path: string) {
  void unlink(path).catch(() => {
    // Best-effort cleanup only; transcription should not fail because /tmp cleanup failed.
  });
}

function cleanupUploadedFile(fileManager: GoogleAIFileManager, fileName: string | null) {
  if (!fileName) {
    return;
  }

  void fileManager.deleteFile(fileName).catch(() => {
    // Gemini Files API uploads expire, but delete eagerly when possible.
  });
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack ?? ""}`.trim();
  }

  return String(error);
}

function cleanValidTranscript(rawTranscript: string) {
  console.log(
    `[agriflow:audio] raw transcript: ${rawTranscript.slice(0, 100)}`,
  );

  const transcript = cleanupTranscript(rawTranscript);
  return transcript.length >= 3 ? transcript : null;
}

export async function transcribeAudioBufferWithGemini(
  buffer: Buffer,
  mimeType: string,
) {
  console.log(`[agriflow:audio] mimeType received: ${mimeType}`);
  console.log(`[agriflow:audio] buffer size: ${buffer.byteLength}`);

  if (buffer.byteLength > MAX_AUDIO_BYTES) {
    console.warn(
      `[agriflow:audio] buffer exceeds 20MB limit: ${buffer.byteLength}`,
    );
    return null;
  }

  const env = getEnv();
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  const gemini = getGeminiClient();

  if (!gemini) {
    return null;
  }

  const model = gemini.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0,
    },
  });

  const normalizedMimeType = normalizeMimeType(mimeType);
  const fileManager = new GoogleAIFileManager(env.GEMINI_API_KEY);
  const tempPath = join(tmpdir(), `${randomUUID()}.ogg`);
  let uploadedFileName: string | null = null;

  try {
    await writeFile(tempPath, buffer);

    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: normalizedMimeType,
      displayName: `whatsapp-voice-${randomUUID()}.ogg`,
    });
    uploadedFileName = uploadResult.file.name;

    console.log(
      `[agriflow:audio] gemini file uploaded: ${uploadResult.file.uri}`,
    );

    const readyFile = await waitForActiveFile({
      fileManager,
      file: uploadResult.file,
    });

    if (readyFile.state !== FileState.ACTIVE) {
      throw new Error(
        `Gemini file did not become ACTIVE within 8s. State: ${readyFile.state}`,
      );
    }

    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      {
        fileData: {
          mimeType: normalizedMimeType,
          fileUri: readyFile.uri,
        },
      },
    ]);

    return cleanValidTranscript(result.response.text());
  } catch (error) {
    console.log(`[agriflow:audio] error: ${formatError(error)}`);

    try {
      const result = await model.generateContent([
        { text: TRANSCRIPTION_PROMPT },
        {
          inlineData: {
            mimeType: normalizedMimeType,
            data: buffer.toString("base64"),
          },
        },
      ]);

      return cleanValidTranscript(result.response.text());
    } catch (fallbackError) {
      console.log(`[agriflow:audio] error: ${formatError(fallbackError)}`);
      return null;
    }
  } finally {
    cleanupTempFile(tempPath);
    cleanupUploadedFile(fileManager, uploadedFileName);
  }
}
