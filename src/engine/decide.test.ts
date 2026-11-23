import { describe, expect, it } from 'vitest';
import { decide } from './decide';
import type { DayInfo, DecideInput, HourData } from './types';
import { addDays, formatMinutes, localNow } from './time';

const TODAY = '2026-11-23';
const TOMORROW = addDays(TODAY, 1);

const NICE: Omit<HourData, 'time'> = {
  temp: 12,
  apparentTemp: 12,
  precip: 0,
  precipProb: 0,
  windSpeed: 8,
  windGusts: 15,
  cloudCover: 30,
  uvIndex: 2,
  weatherCode: 1,
  isDay: true,
};

/** 24 hours for `date`; `tweak(hour)` overrides fields for specific hours. */
function day(date: string, tweak: (h: number) => Partial<HourData> = () => ({})): HourData[] {
  return Array.from({ length: 24 }, (_, h) => ({
    ...NICE,
    time: `${date}T${formatMinutes(h * 60)}`,
    ...tweak(h),
  }));
}

function days(...dates: string[]): DayInfo[] {
  return dates.map((d) => ({ date: d, sunrise: `${d}T07:40`, sunset: `${d}T17:30` }));
}

function input(over: Partial<DecideInput>): DecideInput {
  return {
    activity: 'running',
    durationMin: 60,
    date: TODAY,
    now: `${TODAY}T10:20`,
    hours: [...day(TODAY), ...day(TOMORROW)],
    days: days(TODAY, TOMORROW),
    ...over,
  };
}

describe('decide: verdicts', () => {
  it('says GO_NOW when the next N hours are good, starting at the current time', () => {
    const d = decide(input({}));
    expect(d.verdict).toBe('GO_NOW');
    expect(d.window).toMatchObject({ start: '10:20', end: '11:20', startsNow: true });
    expect(d.betterLater).toBeUndefined();
  });

  it('keeps GO_NOW but hints at a clearly better window later', () => {
    const hours = day(TODAY, (h) => (h < 16 ? { apparentTemp: 22, temp: 22 } : {}));
    const d = decide(input({ now: `${TODAY}T10:00`, hours }));
    expect(d.verdict).toBe('GO_NOW');
    expect(d.betterLater?.start).toBe('16:00');
  });

  it('says BEST_WINDOW when now is bad but a good window comes later', () => {
    const hours = day(TODAY, (h) => (h < 15 ? { precipProb: 80, precip: 1.2 } : {}));
    const d = decide(input({ hours }));
    expect(d.verdict).toBe('BEST_WINDOW');
    expect(d.window).toMatchObject({ start: '15:00', end: '16:00', startsNow: false });
  });

  it('never says GO_NOW for a future day', () => {
    const d = decide(input({ date: TOMORROW }));
    expect(d.verdict).toBe('BEST_WINDOW');
    expect(d.window?.start).toBe('06:00');
  });

  it('says LOW_PROB_WINDOW for unsettled days and picks the driest slot', () => {
    const hours = day(TOMORROW, (h) => ({ precipProb: h === 14 ? 25 : 45, precip: 0.3 }));
    const d = decide(input({ date: TOMORROW, hours }));
    expect(d.verdict).toBe('LOW_PROB_WINDOW');
    expect(d.window).toMatchObject({ start: '14:00', end: '15:00' });
    expect(d.reasons.some((r) => r.kind === 'rain')).toBe(true);
  });

  it('says GYM when it rains all day but not dangerously', () => {
    const hours = day(TOMORROW, () => ({ precipProb: 90, precip: 1.5 }));
    const d = decide(input({ date: TOMORROW, hours }));
    expect(d.verdict).toBe('GYM');
    expect(d.window).toBeUndefined();
    expect(d.reasons[0]).toMatchObject({ kind: 'rain', level: 'poor' });
  });

  it('says STAY_HOME today when the commute itself is hazardous', () => {
    const hours = day(TODAY, () => ({ precipProb: 100, precip: 8, weatherCode: 95 }));
    const d = decide(input({ hours }));
    expect(d.verdict).toBe('STAY_HOME');
    expect(d.reasons[0]).toEqual({ kind: 'storm' });
  });

  it('says GYM today when it is poor all day but the next hours are safe to commute', () => {
    const hours = day(TODAY, (h) => (h < 13 ? { precipProb: 90, precip: 2 } : { precipProb: 90, precip: 6 }));
    const d = decide(input({ hours }));
    expect(d.verdict).toBe('GYM');
  });

  it('says STAY_HOME for a future day dominated by hazardous gusts', () => {
    const hours = day(TOMORROW, () => ({ windGusts: 85, windSpeed: 50 }));
    const d = decide(input({ date: TOMORROW, hours }));
    expect(d.verdict).toBe('STAY_HOME');
    expect(d.reasons[0]).toMatchObject({ kind: 'wind', level: 'hazard', maxGust: 85 });
  });

  it('treats extreme heat as hazardous', () => {
    const hours = day(TOMORROW, () => ({ apparentTemp: 39, temp: 36 }));
    expect(decide(input({ date: TOMORROW, hours })).verdict).toBe('STAY_HOME');
  });
});

describe('decide: time ranges', () => {
  it('keeps hiking windows within daylight', () => {
    const hours = day(TOMORROW, (h) => (h < 14 ? { precipProb: 30 } : {}));
    const d = decide(input({ activity: 'hiking', durationMin: 180, date: TOMORROW, hours }));
    expect(d.range).toEqual({ start: '08:00', end: '17:30' });
    expect(d.verdict).toBe('BEST_WINDOW');
    expect(d.window).toMatchObject({ start: '14:00', end: '17:00' });
    expect(d.hours[0]?.time).toBe('08:00');
    expect(d.hours.at(-1)?.time).toBe('17:00');
  });

  it('supports all-day hiking', () => {
    const d = decide(input({ activity: 'hiking', allDay: true, date: TOMORROW }));
    expect(d.window).toMatchObject({ start: '08:00', end: '17:30' });
  });

  it('runs all-day hiking from now when today', () => {
    const d = decide(input({ activity: 'hiking', allDay: true }));
    expect(d.verdict).toBe('GO_NOW');
    expect(d.window).toMatchObject({ start: '10:20', end: '17:30' });
  });

  it('supports 30-minute runs', () => {
    const d = decide(input({ durationMin: 30 }));
    expect(d.window).toMatchObject({ start: '10:20', end: '10:50' });
  });

  it('flags when there is no time left today', () => {
    const d = decide(input({ now: `${TODAY}T21:30` }));
    expect(d.window).toBeUndefined();
    expect(d.verdict).toBe('GYM');
    expect(d.reasons[0]).toEqual({ kind: 'noTimeLeft' });
  });

  it('does not offer GO_NOW before the active hours start', () => {
    const d = decide(input({ now: `${TODAY}T04:30` }));
    expect(d.verdict).toBe('BEST_WINDOW');
    expect(d.window?.start).toBe('06:00');
  });

  it('marks hours inside the chosen window', () => {
    const d = decide(input({ durationMin: 90 }));
    expect(d.hours.filter((h) => h.inWindow).map((h) => h.time)).toEqual(['10:00', '11:00']);
  });
});

describe('decide: window tolerance', () => {
  it('lets a long hike absorb one chilly hour', () => {
    const hours = day(TOMORROW, (h) => (h === 8 ? { apparentTemp: 1 } : {}));
    const d = decide(input({ activity: 'hiking', allDay: true, date: TOMORROW, hours }));
    expect(d.verdict).toBe('BEST_WINDOW');
  });

  it('does not let a short window absorb a fair hour', () => {
    const hours = day(TOMORROW, () => ({ precipProb: 30 }));
    const d = decide(input({ date: TOMORROW, hours }));
    expect(d.verdict).toBe('LOW_PROB_WINDOW');
  });

  it('never tolerates a poor hour inside the window', () => {
    const hours = day(TOMORROW, (h) => (h === 12 ? { precipProb: 90, precip: 2 } : {}));
    const d = decide(input({ activity: 'hiking', allDay: true, date: TOMORROW, hours }));
    expect(d.verdict).not.toBe('BEST_WINDOW');
  });

  it('prefers daylight for runs when conditions tie', () => {
    const hours = day(TOMORROW, (h) => ({ isDay: h >= 8 && h < 18 }));
    const d = decide(input({ date: TOMORROW, hours }));
    expect(d.window?.start).toBe('08:00');
  });
});

describe('decide: details', () => {
  it('lowers confidence for days further out', () => {
    const far = addDays(TODAY, 5);
    const d = decide(input({ date: far, hours: day(far), days: days(far) }));
    expect(d.confidence).toBe('low');
    expect(decide(input({})).confidence).toBe('high');
  });

  it('gives at most three reasons and always mentions rain for positive verdicts', () => {
    const d = decide(input({ hours: day(TODAY, () => ({ uvIndex: 8, windGusts: 45 })) }));
    expect(d.reasons.length).toBeLessThanOrEqual(3);
    expect(d.reasons.map((r) => r.kind)).toContain('rain');
  });

  it('handles a missing precipitation probability', () => {
    const hours = day(TODAY, () => ({ precipProb: null }));
    const d = decide(input({ hours }));
    expect(d.verdict).toBe('GO_NOW');
    expect(d.reasons.find((r) => r.kind === 'rain')).toMatchObject({ maxProb: null });
  });

  it('mentions fog for hiking', () => {
    const hours = day(TOMORROW, () => ({ weatherCode: 45 }));
    const d = decide(input({ activity: 'hiking', durationMin: 120, date: TOMORROW, hours }));
    expect(d.verdict).toBe('LOW_PROB_WINDOW');
    expect(d.reasons[0]).toEqual({ kind: 'fog' });
  });
});

describe('time helpers', () => {
  it('computes the local time at a location from its UTC offset', () => {
    const utc = Date.parse('2026-11-23T09:15:00Z');
    expect(localNow(3600, utc)).toBe('2026-11-23T10:15');
    expect(localNow(-5 * 3600, utc)).toBe('2026-11-23T04:15');
  });
});
