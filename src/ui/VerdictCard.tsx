import type { Decision, Verdict } from '../engine';
import type { UnitFormatter } from '../data/units';
import { useI18n } from '../i18n/I18nContext';
import { reasonText } from '../i18n/format';

const ICONS: Record<Verdict, string> = {
  GO_NOW: '✅',
  BEST_WINDOW: '🕒',
  LOW_PROB_WINDOW: '🌦️',
  GYM: '🏋️',
  STAY_HOME: '🏠',
};

const LEVEL_DOT = { good: '●', fair: '●', poor: '●', hazard: '▲' } as const;

export function VerdictCard({ decision, units }: { decision: Decision; units: UnitFormatter }) {
  const { t, locale } = useI18n();
  const v = t.verdict[decision.verdict];
  const w = decision.window;

  return (
    <section className={`verdict verdict--${decision.verdict.toLowerCase()}`} aria-live="polite">
      <div className="verdict__head">
        <span className="verdict__icon" aria-hidden="true">
          {ICONS[decision.verdict]}
        </span>
        <div>
          <h2 className="verdict__title">{v.title}</h2>
          <p className="verdict__detail">{v.detail}</p>
        </div>
      </div>

      {w && (
        <p className="verdict__window">
          <span className="verdict__window-label">{t.window.label}</span>
          <span className="verdict__window-time">
            {w.startsNow ? t.window.now : w.start} – {w.end}
          </span>
        </p>
      )}

      {decision.betterLater && (
        <p className="verdict__hint">💡 {t.betterLater(decision.betterLater.start, decision.betterLater.end)}</p>
      )}

      <ul className="reasons">
        {decision.reasons.map((r, i) => (
          <li key={i} className={'level' in r ? `lvl-${r.level}` : 'lvl-hazard'}>
            <span className="reasons__dot" aria-hidden="true">
              {'level' in r ? LEVEL_DOT[r.level] : r.kind === 'noTimeLeft' || r.kind === 'fog' ? '●' : '▲'}
            </span>
            {reasonText(r, t, units, locale)}
          </li>
        ))}
      </ul>

      {decision.confidence !== 'high' && <p className="notice">{t.confidence[decision.confidence]}</p>}
    </section>
  );
}
