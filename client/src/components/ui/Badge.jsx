import { cx } from '../../lib/cx'
import {
  ACTIVE_STATUS,
  CONDITION,
  OCCUPATION_STATUS,
  REPORT_STATUS,
  SUBMISSION_STATUS,
} from '../../lib/statusMaps'

const TONES = {
  neutral: 'bg-surface-sunken text-ink-muted border-line',
  accent: 'bg-accent-soft text-accent-ink border-accent/20',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  bad: 'bg-bad-soft text-bad border-bad/20',
  info: 'bg-info-soft text-info border-info/20',
  outline: 'bg-transparent text-ink-muted border-line-strong',
}

const SIZES = {
  sm: 'px-1.5 py-0.5 text-[0.6875rem] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1',
}

export function Badge({ tone = 'neutral', size = 'md', icon, className, children, ...rest }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm border font-medium whitespace-nowrap',
        TONES[tone] ?? TONES.neutral,
        SIZES[size] ?? SIZES.md,
        className
      )}
      {...rest}
    >
      {icon && <i className={cx('bi shrink-0', icon)} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Renders the label/tone pair for a status value, defaulting to the raw value. */
export function StatusBadge({ map, value, fallback = 'neutral', className, ...rest }) {
  const entry = map?.[value] ?? { label: value ?? '—', tone: fallback }
  return (
    <Badge tone={entry.tone} className={className} {...rest}>
      {entry.label}
    </Badge>
  )
}

export { ACTIVE_STATUS, CONDITION, OCCUPATION_STATUS, REPORT_STATUS, SUBMISSION_STATUS }
