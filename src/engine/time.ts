/**
 * Time helpers. All times are local wall-clock strings at the forecast location
 * (`YYYY-MM-DDTHH:mm`), so no timezone library is needed.
 */

export function datePart(local: string): string {
  return local.slice(0, 10);
}

/** Minutes since local midnight. */
export function minutesOf(local: string): number {
  const hh = Number(local.slice(11, 13));
  const mm = Number(local.slice(14, 16));
  return hh * 60 + mm;
}

export function formatMinutes(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Current local time at a location given its UTC offset (from Open-Meteo `utc_offset_seconds`). */
export function localNow(utcOffsetSeconds: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

/** Whole days between two `YYYY-MM-DD` dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a `YYYY-MM-DD` date. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
