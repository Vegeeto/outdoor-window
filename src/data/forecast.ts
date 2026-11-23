import type { DayInfo, HourData } from '../engine';

export interface Forecast {
  timezone: string;
  utcOffsetSeconds: number;
  hours: HourData[];
  days: DayInfo[];
  fetchedAt: number;
}

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'cloud_cover',
  'uv_index',
  'is_day',
] as const;

type Series = (number | null)[];

interface OpenMeteoResponse {
  timezone: string;
  utc_offset_seconds: number;
  hourly: { time: string[] } & Record<(typeof HOURLY)[number], Series>;
  daily: { time: string[]; sunrise: string[]; sunset: string[] };
}

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, Forecast>();

export function parseForecast(json: OpenMeteoResponse, fetchedAt = Date.now()): Forecast {
  const h = json.hourly;
  const num = (s: Series, i: number, fallback = 0) => s[i] ?? fallback;
  const hours: HourData[] = [];
  h.time.forEach((time, i) => {
    const temp = h.temperature_2m[i];
    if (temp === null || temp === undefined) return; // hour beyond the model horizon
    hours.push({
      time,
      temp,
      apparentTemp: num(h.apparent_temperature, i, temp),
      precip: num(h.precipitation, i),
      precipProb: h.precipitation_probability[i] ?? null,
      windSpeed: num(h.wind_speed_10m, i),
      windGusts: num(h.wind_gusts_10m, i, num(h.wind_speed_10m, i)),
      cloudCover: num(h.cloud_cover, i),
      uvIndex: num(h.uv_index, i),
      weatherCode: num(h.weather_code, i),
      isDay: num(h.is_day, i, 1) === 1,
    });
  });
  const days: DayInfo[] = json.daily.time.map((date, i) => ({
    date,
    sunrise: json.daily.sunrise[i] ?? `${date}T07:00`,
    sunset: json.daily.sunset[i] ?? `${date}T19:00`,
  }));
  return { timezone: json.timezone, utcOffsetSeconds: json.utc_offset_seconds, hours, days, fetchedAt };
}

/** 7-day hourly forecast from Open-Meteo (no API key; CORS-enabled). Cached for 30 minutes. */
export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit;

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY.join(','),
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast request failed: ${res.status}`);
  const forecast = parseForecast((await res.json()) as OpenMeteoResponse);
  cache.set(key, forecast);
  return forecast;
}
