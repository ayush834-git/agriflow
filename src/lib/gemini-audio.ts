import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { GenerativeModel } from "@google/generative-ai";
import { FileState, GoogleAIFileManager } from "@google/generative-ai/server";
import type { FileMetadataResponse } from "@google/generative-ai/server";
import { OggOpusDecoder } from "ogg-opus-decoder";
import type { OggOpusDecodedAudio } from "ogg-opus-decoder";

import { getEnv } from "@/lib/env";
import { getGeminiClient } from "@/lib/gemini";

const MAX_AUDIO_BYTES = 20_971_520;
const FILE_ACTIVE_TIMEOUT_MS = 8_000;
const FILE_POLL_INTERVAL_MS = 500;
const TRANSCRIPTION_MODEL = "gemini-2.5-flash";

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

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("aac")) return "aac";
  return "ogg";
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

function cleanupTempFile(path: string | null) {
  if (!path) {
    return;
  }

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

function isLikelyOggOpus(buffer: Buffer, mimeType: string) {
  return (
    normalizeMimeType(mimeType) === "audio/ogg" &&
    buffer.subarray(0, 4).toString("ascii") === "OggS" &&
    buffer.indexOf("OpusHead", 0, "ascii") >= 0
  );
}

function encodePcmAsMonoWav(decodedAudio: OggOpusDecodedAudio) {
  const channels = decodedAudio.channelData.filter(
    (channel) => channel.length > 0,
  );

  if (channels.length === 0 || decodedAudio.samplesDecoded <= 0) {
    throw new Error("Decoded OGG Opus audio did not contain PCM samples.");
  }

  const sampleRate = decodedAudio.sampleRate;
  const sampleCount = Math.min(
    decodedAudio.samplesDecoded,
    ...channels.map((channel) => channel.length),
  );
  const bytesPerSample = 2;
  const channelCount = 1;
  const dataSize = sampleCount * bytesPerSample;
  const wavBuffer = Buffer.alloc(44 + dataSize);

  wavBuffer.write("RIFF", 0, "ascii");
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write("WAVE", 8, "ascii");
  wavBuffer.write("fmt ", 12, "ascii");
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channelCount, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  wavBuffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  wavBuffer.writeUInt16LE(16, 34);
  wavBuffer.write("data", 36, "ascii");
  wavBuffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const mixedSample =
      channels.reduce((sum, channel) => sum + channel[index], 0) /
      channels.length;
    const clampedSample = Math.max(-1, Math.min(1, mixedSample));
    const intSample =
      clampedSample < 0
        ? Math.round(clampedSample * 0x8000)
        : Math.round(clampedSample * 0x7fff);

    wavBuffer.writeInt16LE(intSample, 44 + index * bytesPerSample);
  }

  return wavBuffer;
}

async function decodeOggOpusToWav(buffer: Buffer) {
  const decoder = new OggOpusDecoder();

  try {
    await decoder.ready;

    const decodedAudio = await decoder.decodeFile(buffer);
    if (decodedAudio.errors.length > 0) {
      console.warn("[agriflow:audio] ogg opus decode warnings", {
        count: decodedAudio.errors.length,
        first: decodedAudio.errors[0]?.message,
      });
    }

    return encodePcmAsMonoWav(decodedAudio);
  } finally {
    decoder.free();
  }
}

type GeminiAudioInput = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

async function transcribeWithFilesApi(options: {
  audio: GeminiAudioInput;
  fileManager: GoogleAIFileManager;
  model: GenerativeModel;
}) {
  const tempPath = join(tmpdir(), `${randomUUID()}.${options.audio.extension}`);
  let uploadedFileName: string | null = null;

  try {
    await writeFile(tempPath, options.audio.buffer);

    const uploadResult = await options.fileManager.uploadFile(tempPath, {
      mimeType: options.audio.mimeType,
      displayName: `whatsapp-voice-${randomUUID()}.${options.audio.extension}`,
    });
    uploadedFileName = uploadResult.file.name;

    console.log(
      `[agriflow:audio] gemini file uploaded: ${uploadResult.file.uri}`,
    );

    const readyFile = await waitForActiveFile({
      fileManager: options.fileManager,
      file: uploadResult.file,
    });

    if (readyFile.state !== FileState.ACTIVE) {
      throw new Error(
        `Gemini file did not become ACTIVE within 8s. State: ${readyFile.state}`,
      );
    }

    const result = await options.model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      {
        fileData: {
          mimeType: options.audio.mimeType,
          fileUri: readyFile.uri,
        },
      },
    ]);

    return cleanValidTranscript(result.response.text());
  } finally {
    cleanupTempFile(tempPath);
    cleanupUploadedFile(options.fileManager, uploadedFileName);
  }
}

async function transcribeWithInlineData(options: {
  audio: GeminiAudioInput;
  model: GenerativeModel;
}) {
  const result = await options.model.generateContent([
    { text: TRANSCRIPTION_PROMPT },
    {
      inlineData: {
        mimeType: options.audio.mimeType,
        data: options.audio.buffer.toString("base64"),
      },
    },
  ]);

  return cleanValidTranscript(result.response.text());
}

async function buildGeminiAudioInputs(buffer: Buffer, mimeType: string) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const originalAudio: GeminiAudioInput = {
    buffer,
    mimeType: normalizedMimeType,
    extension: getExtensionFromMimeType(normalizedMimeType),
  };

  if (!isLikelyOggOpus(buffer, mimeType)) {
    return [originalAudio];
  }

  try {
    const wavBuffer = await decodeOggOpusToWav(buffer);
    console.log(
      `[agriflow:audio] decoded ogg opus to wav: ${wavBuffer.byteLength}`,
    );

    return [
      {
        buffer: wavBuffer,
        mimeType: "audio/wav",
        extension: "wav",
      },
      originalAudio,
    ];
  } catch (error) {
    console.log(`[agriflow:audio] error: ${formatError(error)}`);
    return [originalAudio];
  }
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
    model: TRANSCRIPTION_MODEL,
    generationConfig: {
      temperature: 0,
    },
  });

  const fileManager = new GoogleAIFileManager(env.GEMINI_API_KEY);
  const audioInputs = await buildGeminiAudioInputs(buffer, mimeType);

  for (const audio of audioInputs) {
    try {
      const transcript = await transcribeWithFilesApi({
        audio,
        fileManager,
        model,
      });

      if (transcript) {
        return transcript;
      }
    } catch (error) {
      console.log(`[agriflow:audio] error: ${formatError(error)}`);
    }
  }

  for (const audio of audioInputs) {
    try {
      const transcript = await transcribeWithInlineData({ audio, model });

      if (transcript) {
        return transcript;
      }
    } catch (error) {
      console.log(`[agriflow:audio] error: ${formatError(error)}`);
    }
  }

  return null;
}
