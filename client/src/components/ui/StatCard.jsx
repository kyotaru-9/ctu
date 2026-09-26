import { cx } from '../../lib/cx'

const TONES = {
  neutral: 'text-ink-muted bg-surface-sunken',
  accent: 'text-accent bg-accent-soft',
  ok: 'text-ok bg-ok-soft',
  warn: 'text-warn bg-warn-soft',
  bad: 'text-bad bg-bad-soft',
  info: 'text-info bg-info-soft',
}

const SIZES = {
  sm: 'h-8 w-8 rounded-md text-sm',
  md: 'h-11 w-11 rounded-lg text-lg',
  lg: 'h-14 w-14 rounded-lg text-2xl',
}

/**
 * Compact metric tile: label and value on the left, icon on the right.
 */
function DefaultStatCard({ label, value, hint, icon, tone, size, className }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs',
        'sm:flex-row sm:items-center sm:gap-4 sm:p-5',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-pretty text-xs leading-tight font-medium tracking-wide text-ink-muted uppercase">
          {label}
        </p>
        <p className="tabular mt-1.5 text-2xl leading-none font-semibold text-ink sm:text-[1.75rem]">
          {value ?? '—'}
        </p>
        {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      </div>

      {icon && (
        <span
          aria-hidden="true"
          className={cx(
            'grid shrink-0 place-items-center self-start sm:self-auto',
            TONES[tone] ?? TONES.neutral,
            SIZES[size] ?? SIZES.md
          )}
        >
          <i className={cx('bi', icon)} />
        </span>
      )}
    </div>
  )
}

/**
 * Hero tile for the single metric that matters most on a page. Stacks the icon
 * above a much larger figure and leaves room for a `footer` (progress bar,
 * trend line) so a tall bento cell does not read as empty. Stays monochrome —
 * scale carries the emphasis, not a large colour fill.
 */
function FeatureStatCard({ label, value, hint, icon, tone, size, footer, className }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col justify-between gap-5 rounded-lg border border-line bg-surface p-5 shadow-xs sm:p-6',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-pretty text-xs leading-tight font-medium tracking-wide text-ink-muted uppercase">
          {label}
        </p>
        {icon && (
          <span
            aria-hidden="true"
            className={cx(
              'grid shrink-0 place-items-center',
              TONES[tone] ?? TONES.neutral,
              SIZES[size] ?? SIZES.lg
            )}
          >
            <i className={cx('bi', icon)} />
          </span>
        )}
      </div>

      <div>
        <p className="tabular text-4xl leading-none font-semibold tracking-tight text-ink sm:text-5xl">
          {value ?? '—'}
        </p>
        {hint && <p className="mt-2 text-sm text-ink-muted">{hint}</p>}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  )
}

export function StatCard({ variant = 'default', ...props }) {
  return variant === 'feature' ? (
    <FeatureStatCard {...props} />
  ) : (
    <DefaultStatCard {...props} />
  )
}
