import { PROFILES, type Activity } from '../engine';
import type { DurationChoice } from '../data/storage';
import { useI18n } from '../i18n/I18nContext';
import { dayLabel, durationLabel } from '../i18n/format';

export function durationOptions(activity: Activity): DurationChoice[] {
  const d = PROFILES[activity].durations;
  const out: DurationChoice[] = [];
  for (let m = d.minMin; m <= d.maxMin; m += d.stepMin) out.push(m);
  if (d.allDay) out.push('all');
  return out;
}

/** Falls back to the activity default when a stored value is no longer valid. */
export function validDuration(activity: Activity, value: DurationChoice): DurationChoice {
  return durationOptions(activity).includes(value) ? value : PROFILES[activity].durations.defaultMin;
}

interface Props {
  activity: Activity;
  onActivity: (a: Activity) => void;
  duration: DurationChoice;
  onDuration: (d: DurationChoice) => void;
  dates: string[];
  today: string;
  tomorrow: string;
  date: string;
  onDate: (d: string) => void;
}

export function Controls(props: Props) {
  const { t, locale } = useI18n();
  const activities: Activity[] = ['running', 'hiking'];
  const icons: Record<Activity, string> = { running: '🏃', hiking: '🥾' };

  return (
    <section className="controls">
      <div className="field">
        <span className="field__label" id="activity-label">
          {t.activityLabel}
        </span>
        <div className="segmented" role="group" aria-labelledby="activity-label">
          {activities.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={props.activity === a}
              onClick={() => props.onActivity(a)}
            >
              <span aria-hidden="true">{icons[a]}</span> {t.activity[a]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field__label">{t.duration.label}</span>
        <select
          value={String(props.duration)}
          onChange={(e) => props.onDuration(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          {durationOptions(props.activity).map((d) => (
            <option key={d} value={String(d)}>
              {d === 'all' ? t.duration.allDay : durationLabel(d, t)}
            </option>
          ))}
        </select>
      </label>

      <div className="field field--wide">
        <span className="field__label" id="day-label">
          {t.day.label}
        </span>
        <div className="chips" role="group" aria-labelledby="day-label">
          {props.dates.map((d) => (
            <button key={d} type="button" aria-pressed={props.date === d} onClick={() => props.onDate(d)}>
              {dayLabel(d, props.today, props.tomorrow, t, locale)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
