import { LEVELS, type Decision } from '../engine';
import type { UnitFormatter } from '../data/units';
import { useI18n } from '../i18n/I18nContext';
import { percent, weatherIcon } from '../i18n/format';

export function HourlyBreakdown({ decision, units }: { decision: Decision; units: UnitFormatter }) {
  const { t, locale } = useI18n();
  const windUnit = units.wind(0).split(' ')[1];

  return (
    <section className="hourly">
      <div className="hourly__head">
        <h3>{t.hourly.title}</h3>
        {decision.range && <span className="muted">{t.range(decision.range.start, decision.range.end)}</span>}
      </div>

      {decision.hours.length === 0 ? (
        <p className="muted">{t.hourly.empty}</p>
      ) : (
        <div className="hourly__scroll" tabIndex={0} aria-label={t.hourly.title}>
          <table className="hourly__table">
            <thead>
              <tr>
                <td />
                {decision.hours.map((h) => (
                  <th key={h.time} scope="col" className={h.inWindow ? 'in-window' : undefined}>
                    {h.time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hourly__levels">
                <td />
                {decision.hours.map((h) => (
                  <td key={h.time} className={h.inWindow ? 'in-window' : undefined}>
                    <span className={`bar lvl-${h.level}`} title={t.levels[h.level]}>
                      <span className="sr-only">{t.levels[h.level]}</span>
                    </span>
                  </td>
                ))}
              </tr>
              <tr className="hourly__icons">
                <td />
                {decision.hours.map((h) => (
                  <td key={h.time} className={h.inWindow ? 'in-window' : undefined} aria-hidden="true">
                    {weatherIcon(h.weatherCode, h.isDay)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t.hourly.feels}</th>
                {decision.hours.map((h) => (
                  <td key={h.time} className={h.inWindow ? 'in-window' : undefined}>
                    {units.temp(h.apparentTemp).replace(/ °[CF]$/, '°')}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t.hourly.rain}</th>
                {decision.hours.map((h) => (
                  <td key={h.time} className={h.inWindow ? 'in-window' : undefined}>
                    {h.precipProb === null ? '—' : percent(h.precipProb, locale)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  {t.hourly.gusts}
                  <span className="unit">{windUnit}</span>
                </th>
                {decision.hours.map((h) => (
                  <td key={h.time} className={h.inWindow ? 'in-window' : undefined}>
                    {units.wind(h.windGusts).split(' ')[0]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <ul className="legend" aria-hidden="true">
        {LEVELS.map((l) => (
          <li key={l}>
            <span className={`bar bar--mini lvl-${l}`} /> {t.levels[l]}
          </li>
        ))}
      </ul>
    </section>
  );
}
