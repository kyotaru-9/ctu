import { cx } from '../../lib/cx'

/**
 * Radio-group styled as a segmented control. Stacks to full-width buttons on
 * phones so each option keeps a large touch target.
 */
export function SegmentedControl({ name, value, onChange, options, columns, className, size = 'md' }) {
  const grid =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2'

  const heights = { sm: 'h-9', md: 'h-11' }

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cx('grid gap-2', grid, className)}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <label
            key={option.value}
            className={cx(
              'relative flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-center text-sm font-medium',
              'transition-colors duration-150',
              heights[size] ?? heights.md,
              selected
                ? 'border-accent bg-accent-soft text-accent-ink'
                : 'border-line-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon && (
              <i className={cx('bi shrink-0', option.icon)} aria-hidden="true" />
            )}
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}
