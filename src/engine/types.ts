export type Activity = 'running' | 'hiking';

export type Verdict = 'GO_NOW' | 'BEST_WINDOW' | 'LOW_PROB_WINDOW' | 'GYM' | 'STAY_HOME';

/** Ordered from best to worst; index comparisons rely on this order. */
export const LEVELS = ['good', 'fair', 'poor', 'hazard'] as const;
export type Level = (typeof LEVELS)[number];

export type Factor = 'rain' | 'temp' | 'wind' | 'uv' | 'sky';

/** One hour of forecast, in metric units, in the location's local time. */
export interface HourData {
  /** Local time, `YYYY-MM-DDTHH:mm` (as returned by Open-Meteo with `timezone=auto`). */
  time: string;
  temp: number;
  apparentTemp: number;
  /** mm over the hour. */
  precip: number;
  /** 0–100, or null when the model does not provide it. */
  precipProb: number | null;
  /** km/h */
  windSpeed: number;
  /** km/h */
  windGusts: number;
  /** 0–100 */
  cloudCover: number;
  uvIndex: number;
  /** WMO weather interpretation code. */
  weatherCode: number;
  isDay: boolean;
}

export interface DayInfo {
  /** `YYYY-MM-DD` */
  date: string;
  /** Local time, `YYYY-MM-DDTHH:mm` */
  sunrise: string;
  sunset: string;
}

export interface FactorRating {
  factor: Factor;
  level: Level;
  /** Continuous penalty used for ranking (0 = perfect). */
  penalty: number;
}

export interface HourRating {
  hour: HourData;
  level: Level;
  /** 0–100, higher is better. */
  score: number;
  factors: FactorRating[];
}

export interface DecideInput {
  activity: Activity;
  /** Workout length in minutes. Ignored when `allDay` is true. */
  durationMin: number;
  /** Hiking only: use every eligible daylight hour of the day. */
  allDay?: boolean;
  /** Selected day, `YYYY-MM-DD`. */
  date: string;
  /** Current local time at the location, `YYYY-MM-DDTHH:mm`. */
  now: string;
  hours: HourData[];
  days: DayInfo[];
}

export interface TimeWindow {
  /** `HH:mm` local */
  start: string;
  /** `HH:mm` local */
  end: string;
  /** True when the window starts at the current time. */
  startsNow: boolean;
  score: number;
}

/** A reason is data, not text: the UI renders it in the active language and units. */
export type Reason =
  | { kind: 'rain'; level: Level; maxProb: number | null; maxPrecip: number }
  | { kind: 'temp'; level: Level; min: number; max: number; side?: 'cold' | 'hot' }
  | { kind: 'wind'; level: Level; maxGust: number }
  | { kind: 'uv'; level: Level; maxUv: number }
  | { kind: 'storm' }
  | { kind: 'freezing' }
  | { kind: 'heavySnow' }
  | { kind: 'fog' }
  | { kind: 'noTimeLeft' };

export type Confidence = 'high' | 'medium' | 'low';

export interface HourSummary {
  /** `HH:mm` */
  time: string;
  level: Level;
  score: number;
  temp: number;
  apparentTemp: number;
  precip: number;
  precipProb: number | null;
  windGusts: number;
  uvIndex: number;
  weatherCode: number;
  isDay: boolean;
  inWindow: boolean;
}

export interface Decision {
  verdict: Verdict;
  window?: TimeWindow;
  /** Only with GO_NOW: a clearly better window later the same day. */
  betterLater?: TimeWindow;
  reasons: Reason[];
  hours: HourSummary[];
  confidence: Confidence;
  /** Eligible time range used for the day, `HH:mm`. */
  range?: { start: string; end: string };
}
