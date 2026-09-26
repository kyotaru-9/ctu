import { cx } from '../../lib/cx'

/**
 * Page title block. Stacks vertically on phones; actions stretch to full width
 * there so primary CTAs stay easy to hit.
 */
export function PageHeader({ title, subtitle, actions, eyebrow, className }) {
  return (
    <header
      className={cx(
        'mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium tracking-wider text-ink-subtle uppercase">{eyebrow}</p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-col gap-2 [&>*]:w-full sm:flex-row sm:items-center sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </header>
  )
}

/** Responsive auto-fit grid for stat cards and similar tiles. */
export function StatGrid({ columns = 4, className, children }) {
  const layouts = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  return (
    <div className={cx('grid gap-3 sm:gap-4', layouts[columns] ?? layouts[4], className)}>
      {children}
    </div>
  )
}

/**
 * Bento track for overview metrics. Always two columns on phones, widening to
 * four on desktop, so a page never reflows into a plain stack of equal rows.
 * `rows` sets how tall the desktop lattice is — pick one that your spans tile
 * exactly, otherwise gaps appear. Children choose their own span with ordinary
 * grid utilities: `col-span-2 row-span-2` for a hero, `col-span-2` for a wide
 * tile, nothing for a single cell.
 */
export function BentoGrid({ rows = 2, className, children }) {
  const tracks = { 1: 'lg:grid-rows-1', 2: 'lg:grid-rows-2', 3: 'lg:grid-rows-3' }

  return (
    <div
      className={cx(
        'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
        tracks[rows] ?? tracks[2],
        className
      )}
    >
      {children}
    </div>
  )
}
