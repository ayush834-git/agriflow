/**
 * WeatherAPI.com integration.
 * Docs: https://www.weatherapi.com/docs/
 *
 * Used to enrich spoilage scoring and movement recommendations with real
 * temperature and humidity data for the inventory's district.
 *
 * Falls back to regional defaults when the API key is absent or the request
 * fails so the app continues working in demo / dev mode.
 */

import { getEnv } from "@/lib/env";

const BASE_URL = "https://api.weatherapi.com/v1";

export type WeatherCondition = {
  temperatureCelsius: number;
  humidityPercent: number;
  description: string;
  /** 0.0 – 1.0  higher = more spoilage pressure */
  pressureFactor: number;
};

// Regional defaults keyed by Indian state name (lowercase).
// Used when WEATHER_API_KEY is missing or the API call fails.
const REGIONAL_DEFAULTS: Record<string, Pick<WeatherCondition, "temperatureCelsius" | "humidityPercent">> = {
  "andhra pradesh": { temperatureCelsius: 32, humidityPercent: 72 },
  telangana: { temperatureCelsius: 34, humidityPercent: 65 },
  karnataka: { temperatureCelsius: 28, humidityPercent: 60 },
  "tamil nadu": { temperatureCelsius: 33, humidityPercent: 75 },
  maharashtra: { temperatureCelsius: 30, humidityPercent: 62 },
  "madhya pradesh": { temperatureCelsius: 31, humidityPercent: 55 },
  "uttar pradesh": { temperatureCelsius: 29, humidityPercent: 58 },
  punjab: { temperatureCelsius: 27, humidityPercent: 52 },
  rajasthan: { temperatureCelsius: 36, humidityPercent: 38 },
  gujarat: { temperatureCelsius: 34, humidityPercent: 57 },
  "west bengal": { temperatureCelsius: 32, humidityPercent: 80 },
};

const DEFAULT_WEATHER: Pick<WeatherCondition, "temperatureCelsius" | "humidityPercent"> = {
  temperatureCelsius: 30,
  humidityPercent: 62,
};

function computePressureFactor(tempC: number, humidity: number): number {
  // Heat above 28°C and humidity above 65% both increase spoilage pressure
  const heatScore = Math.max(0, (tempC - 28) / 20); // 0 at 28°C, 1 at 48°C
  const humidScore = Math.max(0, (humidity - 65) / 35); // 0 at 65%, 1 at 100%
  return Math.min(1, 0.55 + heatScore * 0.25 + humidScore * 0.2);
}

function buildDescription(tempC: number, humidity: number, pressureFactor: number): string {
  if (pressureFactor > 0.82) {
    return `Hot (${tempC.toFixed(0)}°C) and humid (${humidity.toFixed(0)}%) — spoilage risk is elevated this week.`;
  }
  if (pressureFactor > 0.72) {
    return `Warm (${tempC.toFixed(0)}°C) with moderate humidity (${humidity.toFixed(0)}%) — dispatch delay could hurt quality.`;
  }
  return `Conditions are manageable (${tempC.toFixed(0)}°C, ${humidity.toFixed(0)}% humidity) — route economics dominate risk.`;
}

function fallback(state: string): WeatherCondition {
  const defaults = REGIONAL_DEFAULTS[state.toLowerCase()] ?? DEFAULT_WEATHER;
  const pressureFactor = computePressureFactor(defaults.temperatureCelsius, defaults.humidityPercent);
  return {
    ...defaults,
    pressureFactor,
    description: buildDescription(defaults.temperatureCelsius, defaults.humidityPercent, pressureFactor),
  };
}

/**
 * Fetch current weather for a district/state pair.
 * Returns a resolved WeatherCondition — never throws.
 */
export async function getWeatherForLocation(
  district: string,
  state: string,
): Promise<WeatherCondition> {
  const env = getEnv();
  const apiKey = env.WEATHER_API_KEY;

  if (!apiKey) {
    return fallback(state);
  }

  // WeatherAPI accepts city names; "district, state, India" gives good results.
  const query = encodeURIComponent(`${district}, ${state}, India`);
  const url = `${BASE_URL}/current.json?key=${apiKey}&q=${query}&aqi=no`;

  try {
    const response = await fetch(url, { next: { revalidate: 1800 } }); // cache 30 min

    if (!response.ok) {
      console.warn(`WeatherAPI returned ${response.status} for ${district}, ${state}. Using fallback.`);
      return fallback(state);
    }

    const data = (await response.json()) as {
      current: { temp_c: number; humidity: number; condition: { text: string } };
    };

    const tempC = data.current.temp_c;
    const humidity = data.current.humidity;
    const pressureFactor = computePressureFactor(tempC, humidity);

    return {
      temperatureCelsius: tempC,
      humidityPercent: humidity,
      pressureFactor,
      description: buildDescription(tempC, humidity, pressureFactor),
    };
  } catch (error) {
    console.warn(`WeatherAPI fetch failed for ${district}, ${state}:`, error);
    return fallback(state);
  }
}
