import { cx } from '../../lib/cx'

/**
 * Read-only label/value grid for detail views. Single column on phones, two
 * from `sm` up.
 */
export function DetailList({ items, columns = 2, className }) {
  const visible = items.filter(Boolean)

  return (
    <dl
      className={cx(
        'grid gap-x-6 gap-y-4',
        columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
        className
      )}
    >
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">{item.label}</dt>
          <dd className={cx('mt-1 break-words text-sm text-ink', item.className)}>{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
