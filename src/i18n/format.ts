import type { Reason } from '../engine';
import type { UnitFormatter } from '../data/units';
import type { Messages } from './messages';

export function reasonText(r: Reason, t: Messages, u: UnitFormatter, locale: string): string {
  switch (r.kind) {
    case 'rain':
      return t.reasons.rain[r.level]({
        // "at most 0 %" reads oddly: below 5 % a dry hour is simply "no rain expected".
        prob: r.maxProb === null || (r.level === 'good' && r.maxProb < 5) ? null : percent(r.maxProb, locale),
        mm: u.precip(r.maxPrecip),
      });
    case 'temp': {
      const min = u.temp(r.min);
      const max = u.temp(r.max);
      const range = min === max ? min : `${min.replace(/ °[CF]$/, '')}–${max}`;
      const args = { range, min, max };
      if (r.level === 'good' || !r.side) return t.reasons.temp.good(args);
      return t.reasons.temp[r.side][r.level](args);
    }
    case 'wind':
      return t.reasons.wind[r.level](u.wind(r.maxGust));
    case 'uv':
      return t.reasons.uv[r.level](new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(r.maxUv));
    default:
      return t.reasons[r.kind];
  }
}

/** Locale-aware percentage ("45 %" in es/ca, "45%" in en). */
export function percent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100);
}

export function durationLabel(min: number, t: Messages): string {
  if (min < 60) return t.duration.minutes(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${t.duration.hours(h)} ${t.duration.minutes(m)}` : t.duration.hours(h);
}

/** Day chip label: "Today", "Tomorrow", or a short weekday + day number in the active locale. */
export function dayLabel(date: string, today: string, tomorrow: string, t: Messages, locale: string): string {
  if (date === today) return t.day.today;
  if (date === tomorrow) return t.day.tomorrow;
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** Emoji icon for a WMO weather code. */
export function weatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '🌤️' : '☁️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}
