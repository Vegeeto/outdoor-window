import { useEffect, useId, useRef, useState } from 'react';
import { placeLabel, reverseGeocode, searchPlaces, type Place } from '../data/geocoding';
import { useI18n } from '../i18n/I18nContext';

type SearchState = 'idle' | 'searching' | 'done' | 'error';
type GeoState = 'idle' | 'locating' | 'denied' | 'unsupported';

export function LocationSearch({ place, onSelect }: { place: Place | null; onSelect: (p: Place) => void }) {
  const { t, lang } = useI18n();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [search, setSearch] = useState<SearchState>('idle');
  const [active, setActive] = useState(-1);
  const [geo, setGeo] = useState<GeoState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced forward search (Open-Meteo geocoding).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearch('idle');
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearch('searching');
      searchPlaces(q, lang, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(r.length ? 0 : -1);
          setSearch('done');
        })
        .catch(() => !ctrl.signal.aborted && setSearch('error'));
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, lang]);

  function choose(p: Place) {
    onSelect(p);
    setQuery('');
    setResults([]);
    setSearch('idle');
    inputRef.current?.blur();
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(4));
        const lon = Number(coords.longitude.toFixed(4));
        let p: Place;
        try {
          p = await reverseGeocode(lat, lon, lang);
        } catch {
          p = { name: null, lat, lon };
        }
        setGeo('idle');
        choose(p);
      },
      () => setGeo('denied'),
      { timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const r = results[active];
      if (r) choose(r);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }

  const open = search === 'searching' || search === 'done' || search === 'error';
  const current = place ? (place.name ? placeLabel(place) : t.location.current) : null;

  return (
    <section className="location" aria-label={t.location.label}>
      {current && (
        <p className="location__current">
          <span aria-hidden="true">📍</span> <strong>{current}</strong>
          {!place?.name && place && (
            <span className="muted">
              {' '}
              ({place.lat.toFixed(2)}, {place.lon.toFixed(2)})
            </span>
          )}
        </p>
      )}
      <div className="location__row">
        <div className="combo">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label={t.location.placeholder}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 && results.length ? `${listId}-${active}` : undefined}
            placeholder={t.location.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
          />
          {open && (
            <ul id={listId} role="listbox" className="combo__list">
              {search === 'searching' && <li className="combo__note">{t.location.searching}</li>}
              {search === 'error' && <li className="combo__note">{t.location.searchError}</li>}
              {search === 'done' && results.length === 0 && <li className="combo__note">{t.location.noResults}</li>}
              {search === 'done' &&
                results.map((r, i) => (
                  <li
                    key={`${r.lat},${r.lon}`}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? 'is-active' : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r)}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span>{r.name}</span>
                    <span className="muted">{[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn" onClick={useMyLocation} disabled={geo === 'locating'}>
          <span aria-hidden="true">◎</span> {geo === 'locating' ? t.location.locating : t.location.useMine}
        </button>
      </div>
      {(geo === 'denied' || geo === 'unsupported') && (
        <p className="notice" role="status">
          {geo === 'denied' ? t.location.denied : t.location.unsupported}
        </p>
      )}
    </section>
  );
}
