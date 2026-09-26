import { cx } from '../../lib/cx'

/**
 * Horizontal scroll container for wide tables. `minW` sets a floor so columns
 * stay legible on phones rather than collapsing into unreadable slivers.
 */
export function ScrollX({ className, minW = '44rem', children, ...rest }) {
  return (
    <div className={cx('scroll-x -mx-4 px-4 sm:mx-0 sm:px-0', className)} {...rest}>
      <div style={{ minWidth: minW }} className="inline-block w-full align-middle">
        {children}
      </div>
    </div>
  )
}

export function Table({ className, children, ...rest }) {
  return (
    <table className={cx('data-table', className)} {...rest}>
      {children}
    </table>
  )
}

export function THead({ className, children, ...rest }) {
  return (
    <thead className={className} {...rest}>
      {children}
    </thead>
  )
}

export function TH({ className, align = 'left', children, ...rest }) {
  return (
    <th scope="col" className={cx(align === 'right' && 'text-right', align === 'center' && 'text-center', className)} {...rest}>
      {children}
    </th>
  )
}

export function TBody({ className, children, ...rest }) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  )
}

export function TR({ active, className, children, ...rest }) {
  return (
    <tr data-row-active={active || undefined} className={className} {...rest}>
      {children}
    </tr>
  )
}

export function TD({ className, align = 'left', nowrap, children, ...rest }) {
  return (
    <td
      className={cx(
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        nowrap && 'whitespace-nowrap',
        className
      )}
      {...rest}
    >
      {children}
    </td>
  )
}

/** Compact icon-only action cluster. Wraps to multiple lines on narrow cells. */
export function RowActions({ label = 'Row actions', children }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1 justify-end"
    >
      {children}
    </div>
  )
}

/**
 * Row action. Icon-only by default; pass `text` to render a text button in the
 * same tone colour instead. Icon clusters are ambiguous without tooltips, so
 * tables with few, distinct actions read better as text. `label` remains the
 * accessible name and tooltip in both forms.
 */
export function ActionButton({ icon, label, text, tone = 'subtle', className, ...rest }) {
  const tones = {
    subtle: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
    accent: 'text-accent hover:bg-accent-soft',
    bad: 'text-bad hover:bg-bad-soft',
    ok: 'text-ok hover:bg-ok-soft',
  }

  return (
    <button
      type="button"
      title={text ? undefined : label}
      aria-label={text ? label : undefined}
      className={cx(
        'rounded-md transition-colors duration-150',
        text
          ? 'min-h-8 px-2 py-1 text-sm font-medium'
          : 'grid h-8 w-8 place-items-center',
        'disabled:cursor-not-allowed disabled:opacity-40',
        tones[tone] ?? tones.subtle,
        className
      )}
      {...rest}
    >
      {text ?? <i className={cx('bi text-sm', icon)} aria-hidden="true" />}
    </button>
  )
}
