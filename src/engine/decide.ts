import {
  LEVELS,
  type Confidence,
  type Decision,
  type DecideInput,
  type HourRating,
  type HourSummary,
  type Level,
  type Reason,
  type TimeWindow,
  type Verdict,
} from './types';
import {
  BETTER_LATER_MARGIN,
  COMMUTE_MIN,
  FAIR_SHARE_TOLERANCE,
  PROFILES,
  STAY_HOME_SHARE,
  WINDOW_MEAN_WEIGHT,
  type ActivityProfile,
} from './profiles';
import { rateHour, skyEvent, worstLevel } from './rateHour';
import { datePart, daysBetween, formatMinutes, minutesOf } from './time';

interface Range {
  /** Earliest eligible minute of the day. */
  start: number;
  /** Latest eligible minute of the day (windows must end by then). */
  end: number;
  /** Earliest minute a window may start: `start`, or now if later (today). */
  from: number;
}

interface Candidate {
  startMin: number;
  endMin: number;
  startsNow: boolean;
  ratings: HourRating[];
  level: Level;
  score: number;
  wetness: number;
}

const severity = (l: Level) => LEVELS.indexOf(l);

function eligibleRange(input: DecideInput, p: ActivityProfile, nowMin: number | null): Range {
  let start = p.hours.start;
  let end = p.hours.end;
  if (p.daylightOnly) {
    const day = input.days.find((d) => d.date === input.date);
    if (day) {
      start = Math.max(start, Math.ceil(minutesOf(day.sunrise) / 60) * 60);
      end = Math.min(end, minutesOf(day.sunset));
    }
  }
  const from = nowMin === null ? start : Math.max(start, nowMin);
  return { start, end, from };
}

/** Ratings for every hour of the selected day, keyed by hour of day (0–23). */
function ratingsByHour(input: DecideInput, p: ActivityProfile): Map<number, HourRating> {
  const map = new Map<number, HourRating>();
  for (const h of input.hours) {
    if (datePart(h.time) === input.date) map.set(Math.floor(minutesOf(h.time) / 60), rateHour(h, p));
  }
  return map;
}

/** Hours overlapping [startMin, endMin), or null if any is missing from the forecast. */
function hoursIn(byHour: Map<number, HourRating>, startMin: number, endMin: number): HourRating[] | null {
  const out: HourRating[] = [];
  for (let h = Math.floor(startMin / 60); h < Math.ceil(endMin / 60); h++) {
    const r = byHour.get(h);
    if (!r) return null;
    out.push(r);
  }
  return out;
}

function wetness(ratings: HourRating[]): number {
  return ratings.reduce((sum, { hour }) => {
    const prob = hour.precipProb ?? (hour.precip > 0.1 ? 100 : 0);
    return sum + (prob / 100) * Math.max(hour.precip, 0.1);
  }, 0);
}

function windowLevel(ratings: HourRating[]): Level {
  const worst = worstLevel(ratings.map((r) => r.level));
  if (worst !== 'fair') return worst;
  const fairShare = ratings.filter((r) => r.level === 'fair').length / ratings.length;
  return fairShare <= FAIR_SHARE_TOLERANCE ? 'good' : 'fair';
}

function evaluate(startMin: number, endMin: number, startsNow: boolean, ratings: HourRating[]): Candidate {
  const scores = ratings.map((r) => r.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  return {
    startMin,
    endMin,
    startsNow,
    ratings,
    level: windowLevel(ratings),
    score: Math.round(WINDOW_MEAN_WEIGHT * mean + (1 - WINDOW_MEAN_WEIGHT) * min),
    wetness: wetness(ratings),
  };
}

function candidates(
  byHour: Map<number, HourRating>,
  range: Range,
  durationMin: number,
  nowMin: number | null,
): Candidate[] {
  const out: Candidate[] = [];
  const starts: number[] = [];
  const nowIsEligible = nowMin !== null && nowMin >= range.start && nowMin < range.end;
  if (nowIsEligible) starts.push(nowMin);
  for (let s = Math.ceil(range.from / 60) * 60; s < range.end; s += 60) {
    if (s > range.from || !nowIsEligible) starts.push(s);
  }
  for (const s of starts) {
    const e = s + durationMin;
    if (e > range.end) break;
    const ratings = hoursIn(byHour, s, e);
    if (ratings) out.push(evaluate(s, e, nowIsEligible && s === nowMin, ratings));
  }
  return out;
}

function toWindow(c: Candidate): TimeWindow {
  return { start: formatMinutes(c.startMin), end: formatMinutes(c.endMin), startsNow: c.startsNow, score: c.score };
}

const byScore = (a: Candidate, b: Candidate) => b.score - a.score || a.startMin - b.startMin;

function confidenceFor(today: string, date: string): Confidence {
  const ahead = daysBetween(today, date);
  if (ahead <= 2) return 'high';
  if (ahead <= 4) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------

type FactorReason = Extract<Reason, { level: Level }>;

function factorReasons(ratings: HourRating[], p: ActivityProfile): { reason: FactorReason; rank: number }[] {
  const levelOf = (factor: string) =>
    worstLevel(ratings.map((r) => r.factors.find((f) => f.factor === factor)?.level ?? 'good'));
  const penaltyOf = (factor: string) =>
    ratings.reduce((s, r) => s + (r.factors.find((f) => f.factor === factor)?.penalty ?? 0), 0) / ratings.length;
  const rank = (factor: string) => severity(levelOf(factor)) * 1000 + penaltyOf(factor);

  const hours = ratings.map((r) => r.hour);
  const probs = hours.map((h) => h.precipProb).filter((p): p is number => p !== null);
  const dayUv = hours.filter((h) => h.isDay).map((h) => h.uvIndex);
  const minT = Math.min(...hours.map((h) => h.apparentTemp));
  const maxT = Math.max(...hours.map((h) => h.apparentTemp));
  const tempLevel = levelOf('temp');
  const [goodLo, goodHi] = p.apparentTemp.good;
  const side: 'cold' | 'hot' = maxT - goodHi > goodLo - minT ? 'hot' : 'cold';

  const list: { reason: FactorReason; rank: number }[] = [
    {
      reason: {
        kind: 'rain',
        level: levelOf('rain'),
        maxProb: probs.length ? Math.max(...probs) : null,
        maxPrecip: Math.max(...hours.map((h) => h.precip)),
      },
      rank: rank('rain'),
    },
    {
      reason: { kind: 'temp', level: tempLevel, min: minT, max: maxT, ...(tempLevel !== 'good' && { side }) },
      rank: rank('temp'),
    },
    {
      reason: { kind: 'wind', level: levelOf('wind'), maxGust: Math.max(...hours.map((h) => h.windGusts)) },
      rank: rank('wind'),
    },
  ];
  const maxUv = dayUv.length ? Math.max(...dayUv) : 0;
  // UV is only worth mentioning when it is notable.
  if (levelOf('uv') !== 'good' || maxUv >= 6) {
    list.push({ reason: { kind: 'uv', level: levelOf('uv'), maxUv }, rank: rank('uv') });
  }
  return list;
}

function skyReasons(ratings: HourRating[], includeFog: boolean): Reason[] {
  const events = new Set(ratings.map((r) => skyEvent(r.hour.weatherCode)));
  const out: Reason[] = [];
  if (events.has('storm')) out.push({ kind: 'storm' });
  if (events.has('freezing')) out.push({ kind: 'freezing' });
  if (events.has('heavySnow')) out.push({ kind: 'heavySnow' });
  if (includeFog && events.has('fog')) out.push({ kind: 'fog' });
  return out;
}

const MAX_REASONS = 3;

function buildReasons(verdict: Verdict, ratings: HourRating[], p: ActivityProfile, noTimeLeft: boolean): Reason[] {
  const lead: Reason[] = noTimeLeft ? [{ kind: 'noTimeLeft' }] : [];
  if (ratings.length === 0) return lead;

  const factors = factorReasons(ratings, p).sort((a, b) => b.rank - a.rank);
  const positive = verdict === 'GO_NOW' || verdict === 'BEST_WINDOW' || verdict === 'LOW_PROB_WINDOW';

  if (positive) {
    const sky = skyReasons(ratings, p.fogIsFair);
    const picks = factors.slice(0, MAX_REASONS - sky.length).map((f) => f.reason);
    // Rain is what people check first: always mention it.
    if (picks.length && !picks.some((r) => r.kind === 'rain')) {
      const rain = factors.find((f) => f.reason.kind === 'rain');
      if (rain) picks[picks.length - 1] = rain.reason;
    }
    // Stable reading order for good news: rain, temperature, wind, UV.
    const order = ['rain', 'temp', 'wind', 'uv'];
    picks.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
    return [...lead, ...sky, ...picks].slice(0, MAX_REASONS);
  }

  const sky = skyReasons(ratings, false);
  const bad = factors.filter((f) => f.reason.level !== 'good').map((f) => f.reason);
  const fallback = factors.map((f) => f.reason);
  return [...lead, ...sky, ...(bad.length ? bad : fallback)].slice(0, MAX_REASONS);
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

export function decide(input: DecideInput): Decision {
  const p = PROFILES[input.activity];
  const today = datePart(input.now);
  const isToday = input.date === today;
  const nowMin = isToday ? minutesOf(input.now) : null;
  const range = eligibleRange(input, p, nowMin);
  const byHour = ratingsByHour(input, p);

  const durationMin = input.allDay && p.durations.allDay ? range.end - range.from : input.durationMin;
  const minDuration = input.allDay ? p.durations.minMin : durationMin;
  const noTimeLeft = isToday && range.from + minDuration > range.end;
  const all = durationMin >= p.durations.minMin ? candidates(byHour, range, durationMin, nowMin) : [];

  let verdict: Verdict;
  let chosen: Candidate | undefined;
  let betterLater: Candidate | undefined;

  const nowCandidate = all.find((c) => c.startsNow);
  const good = all.filter((c) => c.level === 'good').sort(byScore);
  const fair = all.filter((c) => c.level === 'fair');

  if (nowCandidate && nowCandidate.level === 'good') {
    verdict = 'GO_NOW';
    chosen = nowCandidate;
    const best = good.find((c) => !c.startsNow);
    if (best && best.score >= nowCandidate.score + BETTER_LATER_MARGIN) betterLater = best;
  } else if (good.length) {
    verdict = 'BEST_WINDOW';
    chosen = good[0];
  } else if (fair.length) {
    verdict = 'LOW_PROB_WINDOW';
    chosen = [...fair].sort((a, b) => a.wetness - b.wetness || byScore(a, b))[0];
  } else {
    let hazardous: boolean;
    if (nowMin !== null) {
      const commute = hoursIn(byHour, nowMin, Math.min(24 * 60, nowMin + COMMUTE_MIN)) ?? [];
      hazardous = commute.some((r) => r.level === 'hazard');
    } else {
      const day = hoursIn(byHour, range.start, range.end) ?? [];
      const share = day.length ? day.filter((r) => r.level === 'hazard').length / day.length : 0;
      hazardous = share >= STAY_HOME_SHARE;
    }
    verdict = hazardous ? 'STAY_HOME' : 'GYM';
  }

  // Hours the reasons describe: the window, or the rest of the day when there is none.
  const focusStart = noTimeLeft && nowMin !== null ? nowMin : range.from;
  const focusEnd = noTimeLeft && nowMin !== null ? Math.min(24 * 60, nowMin + COMMUTE_MIN) : range.end;
  const focus = chosen?.ratings ?? hoursIn(byHour, focusStart, Math.max(focusStart + 1, focusEnd)) ?? [];

  const firstHour = Math.floor(range.from / 60);
  const lastHour = Math.ceil(range.end / 60);
  const hours: HourSummary[] = [];
  for (let h = firstHour; h < lastHour; h++) {
    const r = byHour.get(h);
    if (!r) continue;
    const inWindow = chosen !== undefined && h * 60 < chosen.endMin && (h + 1) * 60 > chosen.startMin;
    hours.push({
      time: formatMinutes(h * 60),
      level: r.level,
      score: Math.round(r.score),
      temp: r.hour.temp,
      apparentTemp: r.hour.apparentTemp,
      precip: r.hour.precip,
      precipProb: r.hour.precipProb,
      windGusts: r.hour.windGusts,
      uvIndex: r.hour.uvIndex,
      weatherCode: r.hour.weatherCode,
      isDay: r.hour.isDay,
      inWindow,
    });
  }

  return {
    verdict,
    window: chosen && toWindow(chosen),
    betterLater: betterLater && toWindow(betterLater),
    reasons: buildReasons(verdict, focus, p, noTimeLeft),
    hours,
    confidence: confidenceFor(today, input.date),
    range: range.end > range.start ? { start: formatMinutes(range.start), end: formatMinutes(range.end) } : undefined,
  };
}
