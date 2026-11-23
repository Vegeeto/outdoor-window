import type { Lang } from '../i18n/messages';

export interface Place {
  /** Null when only coordinates are known (reverse geocoding failed). */
  name: string | null;
  admin1?: string;
  country?: string;
  /** ISO 3166-1 alpha-2, upper case. Drives the unit system. */
  countryCode?: string;
  lat: number;
  lon: number;
}

interface OpenMeteoPlace {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

/** Forward search by name, via the Open-Meteo geocoding API. */
export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query.trim(), count: '6', language: lang, format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = (await res.json()) as { results?: OpenMeteoPlace[] };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code?.toUpperCase(),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

interface NominatimReverse {
  name?: string;
  address?: Partial<
    Record<'city' | 'town' | 'village' | 'municipality' | 'county' | 'state' | 'country' | 'country_code', string>
  >;
}

/**
 * Coordinates → place name. Open-Meteo has no reverse endpoint, so this uses Nominatim
 * (OpenStreetMap). It is only called after an explicit "use my location" click, which
 * keeps us well inside Nominatim's 1 request/second usage policy.
 */
export async function reverseGeocode(lat: number, lon: number, lang: Lang, signal?: AbortSignal): Promise<Place> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    zoom: '10',
    'accept-language': lang,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { signal });
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
  const json = (await res.json()) as NominatimReverse;
  const a = json.address ?? {};
  return {
    name: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? json.name ?? null,
    admin1: a.state,
    country: a.country,
    countryCode: a.country_code?.toUpperCase(),
    lat,
    lon,
  };
}

export function placeLabel(p: Place): string {
  return [p.name, p.admin1, p.country].filter((s, i, all) => s && all.indexOf(s) === i).join(', ');
}
