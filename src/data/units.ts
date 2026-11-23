/**
 * Units follow the selected location, not the UI language: a Catalan speaker looking at
 * New York gets °F and mph. The engine always works in metric.
 */
export type UnitSystem = 'metric' | 'imperial' | 'uk';

const IMPERIAL = new Set(['US', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP']);

export function unitSystemFor(countryCode?: string): UnitSystem {
  if (!countryCode) return 'metric';
  if (IMPERIAL.has(countryCode)) return 'imperial';
  if (countryCode === 'GB') return 'uk'; // °C, but wind in mph
  return 'metric';
}

export interface UnitFormatter {
  temp(c: number): string;
  wind(kmh: number): string;
  precip(mm: number): string;
}

export function unitFormatter(system: UnitSystem, locale: string): UnitFormatter {
  const int = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const one = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const two = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const fahrenheit = system === 'imperial';
  const mph = system !== 'metric';
  const inches = system === 'imperial';
  return {
    temp: (c) => (fahrenheit ? `${int.format((c * 9) / 5 + 32)} °F` : `${int.format(c)} °C`),
    wind: (kmh) => (mph ? `${int.format(kmh * 0.621371)} mph` : `${int.format(kmh)} km/h`),
    precip: (mm) => (inches ? `${two.format(mm / 25.4)} in/h` : `${one.format(mm)} mm/h`),
  };
}
