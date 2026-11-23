import { useCallback, useEffect, useState } from 'react';
import { fetchForecast, type Forecast } from '../data/forecast';
import type { Place } from '../data/geocoding';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; forecast: Forecast };

export function useForecast(place: Place | null): State & { retry: () => void } {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const [tick, setTick] = useState(0);

  // Refresh every 30 minutes while the page is open (fetchForecast caches for that long).
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!place) {
      setState({ status: 'idle' });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => (s.status === 'ready' && tick > 0 ? s : { status: 'loading' }));
    fetchForecast(place.lat, place.lon, ctrl.signal)
      .then((forecast) => setState({ status: 'ready', forecast }))
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) {
          console.error(err);
          setState({ status: 'error' });
        }
      });
    return () => ctrl.abort();
  }, [place, attempt, tick]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

/** Current timestamp, refreshed every minute so "now" windows stay accurate. */
export function useNowMs(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
