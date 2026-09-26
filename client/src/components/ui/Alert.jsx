import { cx } from '../../lib/cx'

const TONES = {
  info: { wrap: 'border-info/25 bg-info-soft text-info', icon: 'bi-info-circle' },
  ok: { wrap: 'border-ok/25 bg-ok-soft text-ok', icon: 'bi-check-circle' },
  warn: { wrap: 'border-warn/25 bg-warn-soft text-warn', icon: 'bi-exclamation-triangle' },
  bad: { wrap: 'border-bad/25 bg-bad-soft text-bad', icon: 'bi-x-circle' },
  neutral: { wrap: 'border-line bg-surface-sunken text-ink-muted', icon: 'bi-info-circle' },
}

export function Alert({ tone = 'info', title, icon, onDismiss, className, children }) {
  const config = TONES[tone] ?? TONES.info

  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cx('flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm', config.wrap, className)}
    >
      <i className={cx('bi mt-px shrink-0', icon ?? config.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx(title && 'mt-0.5', 'text-ink')}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-sm text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <i className="bi bi-x-lg text-xs" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
