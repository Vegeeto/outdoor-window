import { LEVELS, type FactorRating, type HourData, type HourRating, type Level } from './types';
import { WMO, type ActivityProfile } from './profiles';

export function worstLevel(levels: Iterable<Level>): Level {
  let worst = 0;
  for (const l of levels) worst = Math.max(worst, LEVELS.indexOf(l));
  return LEVELS[worst] ?? 'good';
}

function fromCeiling(value: number, c: { good: number; fair: number; poor: number }): Level {
  if (value < c.good) return 'good';
  if (value < c.fair) return 'fair';
  if (value < c.poor) return 'poor';
  return 'hazard';
}

function fromBand(value: number, b: ActivityProfile['apparentTemp']): Level {
  const inside = ([lo, hi]: [number, number]) => value >= lo && value <= hi;
  if (inside(b.good)) return 'good';
  if (inside(b.fair)) return 'fair';
  if (inside(b.poor)) return 'poor';
  return 'hazard';
}

const has = (codes: readonly number[], code: number) => codes.includes(code);

export type SkyEvent = 'storm' | 'freezing' | 'heavySnow' | 'snow' | 'fog';

export function skyEvent(code: number): SkyEvent | null {
  if (has(WMO.storm, code)) return 'storm';
  if (has(WMO.freezing, code)) return 'freezing';
  if (has(WMO.heavySnow, code)) return 'heavySnow';
  if (has(WMO.snow, code)) return 'snow';
  if (has(WMO.fog, code)) return 'fog';
  return null;
}

function rateSky(h: HourData, p: ActivityProfile): FactorRating {
  const event = skyEvent(h.weatherCode);
  const cloud = Math.max(0, h.cloudCover - 80) * p.cloudPenalty + (h.isDay ? 0 : p.nightPenalty);
  let level: Level = 'good';
  if (event === 'storm' || event === 'freezing' || event === 'heavySnow') level = 'hazard';
  else if (event === 'snow') level = 'poor';
  else if (event === 'fog' && p.fogIsFair) level = 'fair';
  const levelPenalty = { good: 0, fair: 10, poor: 30, hazard: 100 }[level];
  return { factor: 'sky', level, penalty: levelPenalty + cloud };
}

export function rateHour(h: HourData, p: ActivityProfile): HourRating {
  // Rain: probability and amount; a missing probability falls back to the amount alone.
  const amountLevel = fromCeiling(h.precip, p.precip);
  const probLevel = h.precipProb === null ? 'good' : fromCeiling(h.precipProb, p.precipProb);
  const prob = h.precipProb ?? (h.precip > 0.1 ? 60 : 0);
  const rain: FactorRating = {
    factor: 'rain',
    level: worstLevel([amountLevel, probLevel]),
    penalty: prob * 0.4 + Math.min(40, h.precip * 20),
  };

  const wind: FactorRating = {
    factor: 'wind',
    level: fromCeiling(h.windGusts, p.gusts),
    penalty: Math.max(0, h.windGusts - 20) * 0.6,
  };

  const [idealLo, idealHi] = p.apparentTemp.ideal;
  const tempDistance = Math.max(0, idealLo - h.apparentTemp, h.apparentTemp - idealHi);
  const temp: FactorRating = {
    factor: 'temp',
    level: fromBand(h.apparentTemp, p.apparentTemp),
    penalty: tempDistance * 2.5,
  };

  const uvValue = h.isDay ? h.uvIndex : 0;
  const uv: FactorRating = {
    factor: 'uv',
    level: fromCeiling(uvValue, p.uv),
    penalty: Math.max(0, uvValue - 3) * 3,
  };

  const factors = [rain, temp, wind, uv, rateSky(h, p)];
  const penalty = factors.reduce((sum, f) => sum + f.penalty, 0);
  return {
    hour: h,
    level: worstLevel(factors.map((f) => f.level)),
    score: Math.max(0, Math.min(100, 100 - penalty)),
    factors,
  };
}
