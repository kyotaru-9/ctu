import { cx } from '../../lib/cx'

export function EmptyState({ icon = 'bi-inbox', title, description, action, compact = false, className }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-14',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-surface-sunken text-lg text-ink-subtle"
      >
        <i className={cx('bi', icon)} />
      </span>
      {title && <p className="text-sm font-medium text-ink">{title}</p>}
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-balance text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
