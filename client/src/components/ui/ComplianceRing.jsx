import { cx } from '../../lib/cx'

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const TONE_STROKE = {
  ok: 'stroke-ok',
  warn: 'stroke-warn',
  bad: 'stroke-bad',
  accent: 'stroke-accent',
}

/**
 * Compliance donut. Replaces the hand-rolled inline SVG that was duplicated
 * across the student dashboards, and scales down on phones.
 */
export function ComplianceRing({ value = 0, label = 'Compliance', size = 'md' }) {
  const rate = Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
  const tone = rate >= 90 ? 'ok' : rate >= 75 ? 'warn' : 'bad'
  const offset = CIRCUMFERENCE * (1 - rate / 100)
  const dimension = size === 'sm' ? 104 : 128

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: dimension, height: dimension }}
    >
      <svg
        viewBox="0 0 120 120"
        width={dimension}
        height={dimension}
        className="-rotate-90"
        role="img"
        aria-label={`${label}: ${rate}%`}
      >
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-line"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cx('transition-[stroke-dashoffset] duration-500', TONE_STROKE[tone])}
        />
      </svg>

      <span
        className={cx(
          'tabular absolute font-semibold text-ink',
          size === 'sm' ? 'text-lg' : 'text-2xl'
        )}
      >
        {rate}%
      </span>
    </div>
  )
}
