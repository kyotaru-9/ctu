import { cx } from '../../lib/cx'

const TONES = {
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
  neutral: 'bg-ink-subtle',
}

export function Progress({ value = 0, max = 100, tone = 'accent', label, className }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (Number(value) / max) * 100)) : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-300', TONES[tone] ?? TONES.accent)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Horizontal bar list used for "report reasons" style breakdowns. */
export function BarList({ items, emptyLabel = 'No data' }) {
  if (!items?.length) {
    return <p className="py-4 text-center text-sm text-ink-muted">{emptyLabel}</p>
  }

  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1)

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.label}</span>
            <span className="tabular shrink-0 text-sm font-medium text-ink">{item.value}</span>
          </div>
          <Progress
            value={Number(item.value) || 0}
            max={max}
            tone={item.tone}
            label={item.label}
          />
        </li>
      ))}
    </ul>
  )
}
