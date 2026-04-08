import { getTargetCropOrThrow } from "@/lib/agmarknet/catalog";
import type {
  RiskLevel,
  SpoilageScoreInput,
  SpoilageScoreResult,
} from "@/lib/inventory/types";

const CROP_SENSITIVITY: Record<string, number> = {
  tomato: 30,
  onion: 14,
  potato: 16,
  "green-chilli": 28,
  brinjal: 22,
  okra: 26,
  cabbage: 18,
  cauliflower: 22,
  banana: 30,
  mango: 26,
  lemon: 14,
  paddy: 6,
  maize: 8,
  groundnut: 10,
  cotton: 4,
  turmeric: 8,
  "bengal-gram": 7,
  "green-gram": 8,
  "black-gram": 9,
  "red-chilli": 11,
};

function hashValue(input: string) {
  return Array.from(input).reduce((hash, char) => hash * 33 + char.charCodeAt(0), 19);
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function getDaysUntilDeadline(deadlineDate: string) {
  const now = new Date();
  const deadline = new Date(`${deadlineDate}T00:00:00.000Z`);
  const diffMs = deadline.getTime() - now.getTime();

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) {
    return "CRITICAL";
  }

  if (score >= 60) {
    return "HIGH";
  }

  if (score >= 35) {
    return "MEDIUM";
  }

  return "LOW";
}

export function scoreSpoilageRisk(
  input: SpoilageScoreInput,
): SpoilageScoreResult {
  const crop = getTargetCropOrThrow(input.cropSlug);
  const cropSensitivity = CROP_SENSITIVITY[crop.slug] ?? 14;
  const daysUntilDeadline = getDaysUntilDeadline(input.deadlineDate);
  const storageType = (input.storageType ?? "ambient").toLowerCase();
  const weatherPressure = round(
    14 + ((hashValue(`${input.district}:${input.state}`) % 18) - 4),
  );
  const deadlinePressure =
    daysUntilDeadline <= 0
      ? 38
      : daysUntilDeadline <= 2
        ? 30
        : daysUntilDeadline <= 5
          ? 22
          : daysUntilDeadline <= 8
            ? 14
            : 6;
  const storageAdjustment =
    storageType.includes("cold")
      ? -18
      : storageType.includes("vent")
        ? -8
        : storageType.includes("warehouse")
          ? -4
          : 10;
  const temperaturePressure = round(
    input.temperatureCelsius == null
      ? 0
      : Math.max(0, (input.temperatureCelsius - 10) * 1.6),
  );
  const humidityPressure = round(
    input.humidityPercent == null
      ? 0
      : Math.max(0, (input.humidityPercent - 68) * 0.45),
  );
  const score = round(
    Math.min(
      100,
      Math.max(
        4,
        cropSensitivity +
          weatherPressure +
          deadlinePressure +
          storageAdjustment +
          temperaturePressure +
          humidityPressure,
      ),
    ),
  );
  const level = getRiskLevel(score);
  const confidence = round(
    Math.min(
      0.96,
      Math.max(
        0.58,
        0.68 +
          (input.temperatureCelsius != null ? 0.08 : 0) +
          (input.humidityPercent != null ? 0.08 : 0),
      ),
    ),
  );

  return {
    score,
    level,
    weatherPressure,
    deadlinePressure,
    cropSensitivity,
    storageAdjustment,
    temperaturePressure,
    humidityPressure,
    confidence,
    summary: `${crop.name} in ${input.district} is ${level.toLowerCase()} risk with ${daysUntilDeadline <= 0 ? "an overdue" : `a ${daysUntilDeadline}-day`} deadline window.`,
    reasoning: [
      `${crop.name} has a base perishability score of ${cropSensitivity}.`,
      `Weather pressure for ${input.district}, ${input.state} adds ${weatherPressure} risk.`,
      `Deadline pressure contributes ${deadlinePressure} based on the current storage window.`,
      `Storage type "${storageType}" shifts the score by ${storageAdjustment}.`,
      `Temperature and humidity contribute ${temperaturePressure + humidityPressure} combined.`,
    ],
  };
}
