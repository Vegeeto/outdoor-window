import type { Activity } from '../engine';
import type { Lang } from '../i18n/messages';
import type { Place } from './geocoding';

export type Theme = 'light' | 'dark';
export const THEMES: readonly Theme[] = ['light', 'dark'];

/** `'all'` = all-day (hiking only). */
export type DurationChoice = number | 'all';

export interface Stored {
  place: Place | null;
  activity: Activity;
  durations: Record<Activity, DurationChoice>;
  lang: Lang | null;
  /** Explicit theme; null follows the system setting. */
  theme: Theme | null;
}

/** Also read by the pre-paint theme script in index.html. */
export const KEY = 'outdoor-window:v1';

export const DEFAULTS: Stored = {
  place: null,
  activity: 'running',
  durations: { running: 60, hiking: 180 },
  lang: null,
  theme: null,
};

/** Never throws: private windows and blocked storage fall back to defaults. */
export function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      ...DEFAULTS,
      ...parsed,
      durations: { ...DEFAULTS.durations, ...parsed.durations },
      theme: THEMES.includes(parsed.theme as Theme) ? (parsed.theme as Theme) : null,
    };
  } catch {
    return DEFAULTS;
  }
}

export function save(value: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable: preferences just won't persist.
  }
}
