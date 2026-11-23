import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, datePart, decide, localNow, type Activity } from '../engine';
import { load, save, type DurationChoice, type Stored, type Theme } from '../data/storage';
import { unitFormatter, unitSystemFor } from '../data/units';
import type { Place } from '../data/geocoding';
import { I18nProvider, useI18n } from '../i18n/I18nContext';
import { LANGS, MESSAGES, detectLang, type Lang } from '../i18n/messages';
import { Controls, validDuration } from './Controls';
import { HourlyBreakdown } from './HourlyBreakdown';
import { LocationSearch } from './LocationSearch';
import { VerdictCard } from './VerdictCard';
import { useForecast, useNowMs } from './useForecast';
import { nextTheme, useTheme } from './theme';

export function App() {
  const [stored, setStored] = useState<Stored>(load);
  const lang = stored.lang ?? detectLang();

  useEffect(() => save(stored), [stored]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setStored((s) => ({ ...s, lang: l })), []);

  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <Main stored={stored} setStored={setStored} />
    </I18nProvider>
  );
}

function Main({ stored, setStored }: { stored: Stored; setStored: React.Dispatch<React.SetStateAction<Stored>> }) {
  const { t, locale } = useI18n();
  const { place, activity } = stored;
  const duration = validDuration(activity, stored.durations[activity]);
  const forecast = useForecast(place);
  const nowMs = useNowMs();
  const [selected, setSelected] = useState<string | null>(null);

  const setPlace = (p: Place) => {
    setStored((s) => ({ ...s, place: p }));
    setSelected(null);
  };
  const setActivity = (a: Activity) => setStored((s) => ({ ...s, activity: a }));
  const setDuration = (d: DurationChoice) =>
    setStored((s) => ({ ...s, durations: { ...s.durations, [s.activity]: d } }));

  const units = useMemo(() => unitFormatter(unitSystemFor(place?.countryCode), locale), [place?.countryCode, locale]);

  const view = useMemo(() => {
    if (forecast.status !== 'ready') return null;
    const f = forecast.forecast;
    const now = localNow(f.utcOffsetSeconds, nowMs);
    const today = datePart(now);
    const dates = f.days.map((d) => d.date).filter((d) => d >= today);
    const date = selected && dates.includes(selected) ? selected : today;
    const decision = decide({
      activity,
      durationMin: duration === 'all' ? 0 : duration,
      allDay: duration === 'all',
      date,
      now,
      hours: f.hours,
      days: f.days,
    });
    return { today, tomorrow: addDays(today, 1), dates, date, decision };
  }, [forecast, nowMs, selected, activity, duration]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Outdoor Window</h1>
          <p className="muted">{t.tagline}</p>
        </div>
        <div className="header__actions">
          <LangSwitch />
          <ThemeToggle saved={stored.theme} onChange={(theme) => setStored((s) => ({ ...s, theme }))} />
        </div>
      </header>

      <main>
        <LocationSearch place={place} onSelect={setPlace} />

        {!place && <p className="empty">{t.location.choose}</p>}

        {place && (
          <>
            <Controls
              activity={activity}
              onActivity={setActivity}
              duration={duration}
              onDuration={setDuration}
              dates={view?.dates ?? []}
              today={view?.today ?? ''}
              tomorrow={view?.tomorrow ?? ''}
              date={view?.date ?? ''}
              onDate={setSelected}
            />

            {forecast.status === 'loading' && <p className="empty">{t.loading}</p>}
            {forecast.status === 'error' && (
              <p className="empty">
                {t.loadError}{' '}
                <button type="button" className="btn" onClick={forecast.retry}>
                  {t.retry}
                </button>
              </p>
            )}
            {view && (
              <>
                <VerdictCard decision={view.decision} units={units} />
                <HourlyBreakdown decision={view.decision} units={units} />
              </>
            )}
          </>
        )}
      </main>

      <footer className="footer muted">
        <p>{t.footer.disclaimer}</p>
        <p>
          {t.footer.weather}: <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0) · {t.footer.geocoding}:{' '}
          <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>
        </p>
      </footer>
    </div>
  );
}

function ThemeToggle({ saved, onChange }: { saved: Theme | null; onChange: (t: Theme) => void }) {
  const { t } = useI18n();
  const theme = useTheme(saved);
  const label = theme === 'dark' ? t.theme.toLight : t.theme.toDark;
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={() => onChange(nextTheme(theme))}>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="segmented segmented--small" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} title={MESSAGES[l].langName}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
