import type { Activity } from './types';

/**
 * Upper bounds for each level: a value below `good` is good, below `fair` is fair,
 * below `poor` is poor, anything else is the next level up.
 */
interface Ceiling {
  good: number;
  fair: number;
  poor: number;
}

/** Comfortable band; each level widens it. Values are apparent temperature in °C. */
interface Band {
  good: [number, number];
  fair: [number, number];
  /** Outside this band the hour is hazardous. */
  poor: [number, number];
  /** Ideal sub-range, used only for ranking. */
  ideal: [number, number];
}

export interface ActivityProfile {
  /** Precipitation probability, %. Never hazardous on its own. */
  precipProb: Ceiling;
  /** Precipitation, mm/h. At or above `poor` the hour is hazardous. */
  precip: Ceiling;
  /** Wind gusts, km/h. At or above `poor` the hour is hazardous. */
  gusts: Ceiling;
  apparentTemp: Band;
  /** UV index. Never hazardous on its own. */
  uv: Ceiling;
  /** Daily time span (minutes since midnight) in which the activity is considered. */
  hours: { start: number; end: number };
  /** Restrict windows to sunrise–sunset. */
  daylightOnly: boolean;
  /** Fog lowers visibility on trails. */
  fogIsFair: boolean;
  /** Overcast skies count against the activity (views), ranking only. */
  cloudPenalty: number;
  /** Prefer daylight when scores tie, ranking only. */
  nightPenalty: number;
  durations: { minMin: number; maxMin: number; stepMin: number; defaultMin: number; allDay: boolean };
}

export const PROFILES: Record<Activity, ActivityProfile> = {
  running: {
    precipProb: { good: 20, fair: 50, poor: Infinity },
    precip: { good: 0.2, fair: 1, poor: 4 },
    gusts: { good: 40, fair: 55, poor: 65 },
    apparentTemp: { good: [0, 25], fair: [-5, 30], poor: [-15, 35], ideal: [8, 16] },
    uv: { good: 7.5, fair: 9.5, poor: Infinity },
    hours: { start: 6 * 60, end: 22 * 60 },
    daylightOnly: false,
    fogIsFair: false,
    cloudPenalty: 0,
    nightPenalty: 5,
    durations: { minMin: 30, maxMin: 180, stepMin: 30, defaultMin: 60, allDay: false },
  },
  hiking: {
    precipProb: { good: 15, fair: 40, poor: Infinity },
    precip: { good: 0.2, fair: 1, poor: 4 },
    gusts: { good: 35, fair: 50, poor: 65 },
    apparentTemp: { good: [3, 26], fair: [-3, 30], poor: [-15, 33], ideal: [10, 20] },
    uv: { good: 6.5, fair: 8.5, poor: Infinity },
    hours: { start: 6 * 60, end: 20 * 60 },
    daylightOnly: true,
    fogIsFair: true,
    cloudPenalty: 0.2,
    nightPenalty: 0,
    durations: { minMin: 60, maxMin: 600, stepMin: 60, defaultMin: 180, allDay: true },
  },
};

/**
 * A window still counts as good when at most this share of its hours is merely fair
 * (e.g. a chilly first hour of a long hike). Poor or hazardous hours never qualify.
 */
export const FAIR_SHARE_TOLERANCE = 0.25;
/** Window score blends the average hour with the weakest one. */
export const WINDOW_MEAN_WEIGHT = 0.7;
/** Go Now still wins, but suggest a later window when it scores this much higher. */
export const BETTER_LATER_MARGIN = 10;
/** For a future day, Stay Home when at least this share of eligible hours is hazardous. */
export const STAY_HOME_SHARE = 0.5;
/** For today, the commute horizon checked for hazards (minutes from now). */
export const COMMUTE_MIN = 90;

/** WMO weather codes. */
export const WMO = {
  fog: [45, 48],
  freezing: [56, 57, 66, 67],
  heavySnow: [75, 86],
  snow: [71, 73, 77, 85],
  storm: [95, 96, 99],
} as const;
