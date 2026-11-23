import { describe, expect, it } from 'vitest';
import { parseForecast } from './forecast';
import { unitFormatter, unitSystemFor } from './units';
import { placeLabel } from './geocoding';
import { reasonText, durationLabel, percent } from '../i18n/format';
import { MESSAGES } from '../i18n/messages';

describe('parseForecast', () => {
  it('maps Open-Meteo hourly arrays and tolerates nulls', () => {
    const f = parseForecast({
      timezone: 'Europe/Madrid',
      utc_offset_seconds: 3600,
      hourly: {
        time: ['2026-11-23T10:00', '2026-11-23T11:00', '2026-11-23T12:00'],
        temperature_2m: [12, 13, null],
        apparent_temperature: [11, null, null],
        precipitation: [0, 0.4, null],
        precipitation_probability: [5, null, null],
        weather_code: [1, 61, null],
        wind_speed_10m: [10, 12, null],
        wind_gusts_10m: [20, null, null],
        cloud_cover: [30, 90, null],
        uv_index: [2, 1, null],
        is_day: [1, 1, null],
      },
      daily: { time: ['2026-11-23'], sunrise: ['2026-11-23T07:40'], sunset: ['2026-11-23T17:30'] },
    });
    expect(f.hours).toHaveLength(2); // hour without temperature dropped
    expect(f.hours[1]).toMatchObject({ apparentTemp: 13, precipProb: null, windGusts: 12, weatherCode: 61 });
    expect(f.days[0]).toEqual({ date: '2026-11-23', sunrise: '2026-11-23T07:40', sunset: '2026-11-23T17:30' });
  });
});

describe('units follow the location', () => {
  it('picks the unit system by country', () => {
    expect(unitSystemFor('ES')).toBe('metric');
    expect(unitSystemFor('US')).toBe('imperial');
    expect(unitSystemFor('GB')).toBe('uk');
    expect(unitSystemFor(undefined)).toBe('metric');
  });

  it('formats values', () => {
    const metric = unitFormatter('metric', 'es-ES');
    expect(metric.temp(12.4)).toBe('12 °C');
    expect(metric.wind(35)).toBe('35 km/h');
    expect(metric.precip(1.25)).toBe('1,3 mm/h');
    const us = unitFormatter('imperial', 'en-GB');
    expect(us.temp(20)).toBe('68 °F');
    expect(us.wind(100)).toBe('62 mph');
    const uk = unitFormatter('uk', 'en-GB');
    expect(uk.temp(20)).toBe('20 °C');
    expect(uk.wind(100)).toBe('62 mph');
  });
});

describe('i18n formatting', () => {
  const u = unitFormatter('metric', 'ca-ES');

  it('renders reasons in each language', () => {
    const rain = { kind: 'rain', level: 'fair', maxProb: 40, maxPrecip: 0.5 } as const;
    expect(reasonText(rain, MESSAGES.ca, u, 'ca-ES')).toBe('Risc de ruixats (fins a 40 %)');
    expect(reasonText(rain, MESSAGES.en, u, 'en-GB')).toBe('Chance of showers (up to 40%)');
    const cold = { kind: 'temp', level: 'poor', min: -8, max: -3, side: 'cold' } as const;
    expect(reasonText(cold, MESSAGES.es, u, 'es-ES')).toBe('Frío intenso: sensación de -8–-3 °C');
    expect(reasonText({ kind: 'storm' }, MESSAGES.es, u, 'es-ES')).toBe('Tormentas eléctricas previstas');
  });

  it('formats durations and percentages', () => {
    expect(durationLabel(30, MESSAGES.es)).toBe('30 min');
    expect(durationLabel(90, MESSAGES.es)).toBe('1 h 30 min');
    expect(durationLabel(180, MESSAGES.es)).toBe('3 h');
    expect(percent(25, 'en-GB')).toBe('25%');
  });

  it('builds place labels without duplicates', () => {
    expect(placeLabel({ name: 'Madrid', admin1: 'Madrid', country: 'España', lat: 0, lon: 0 })).toBe('Madrid, España');
  });
});
