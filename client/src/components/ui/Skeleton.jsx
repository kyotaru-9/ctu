import { cx } from '../../lib/cx'

/**
 * Loading placeholders.
 *
 * Every screen that waits on the network renders one of these in place of its
 * real content, so the layout does not jump when data lands. Shapes mirror the
 * components they stand in for — a bento page gets a bento, a table page gets
 * table rows — which is why they take span/count props rather than being one
 * generic block.
 *
 * Bar lengths vary on a fixed cycle so a screen of placeholders reads as text
 * rather than as a grid of identical dashes.
 *
 * The sweep animation is defined in index.css and is already neutralised for
 * `prefers-reduced-motion`, leaving a plain grey bar.
 */

const TEXT_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-3/4', 'w-5/6']
const CELL_WIDTHS = ['w-full', 'w-4/5', 'w-2/3', 'w-11/12', 'w-3/5', 'w-5/6', 'w-full', 'w-4/6']

/** Base shimmering block. Purely decorative, so it is hidden from AT. */
export function Skeleton({ className }) {
  return <span aria-hidden="true" className={cx('skeleton block', className)} />
}

/** Paragraph placeholder; line lengths vary so it reads as copy, not stripes. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cx('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cx('h-2.5', TEXT_WIDTHS[index % TEXT_WIDTHS.length])} />
      ))}
    </div>
  )
}

/** Stand-in for PageHeader: title and subtitle rules. */
export function SkeletonHeader({ className }) {
  return (
    <div className={cx('mb-5 sm:mb-6', className)}>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-3 h-2.5 w-56" />
    </div>
  )
}

/**
 * Stand-in for a stat tile. `feature` mirrors the hero StatCard variant: a
 * small label up top, a large figure, a caption and a progress rule along the
 * bottom. The default variant keeps the two bars together and vertically
 * centred, the way the real tile sits once its icon is gone.
 */
export function SkeletonCard({ feature = false, className }) {
  if (feature) {
    return (
      <div
        aria-hidden="true"
        className={cx(
          'flex min-w-0 flex-col justify-between gap-5 rounded-lg border border-line bg-surface p-5 shadow-xs sm:p-6',
          className
        )}
      >
        <Skeleton className="h-2.5 w-24" />
        <div>
          <Skeleton className="h-8 w-20 sm:h-10 sm:w-24" />
          <Skeleton className="mt-3.5 h-2.5 w-36" />
          <Skeleton className="mt-5 h-1.5 w-full rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cx(
        'flex min-w-0 flex-col justify-center gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5',
        className
      )}
    >
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-6 w-12" />
    </div>
  )
}

/** A row of stat tiles, laid out like StatGrid. */
export function SkeletonCards({ count = 3, columns = 3, className }) {
  const layouts = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  return (
    <div className={cx('grid gap-3 sm:gap-4', layouts[columns] ?? layouts[3], className)}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}

/**
 * Stand-in for BentoGrid. `cells` takes the same span utilities the real tiles
 * use, so pass the identical list and the placeholder keeps the exact shape.
 * `featureIndex` marks the hero cell; it defaults to the first, which is where
 * every bento page puts it.
 *
 *   <SkeletonBento
 *     rows={3}
 *     featureIndex={0}
 *     cells={['col-span-2 row-span-2', '', '', '', '', 'col-span-2 lg:col-span-4']}
 *   />
 */
export function SkeletonBento({ rows = 2, cells = 4, featureIndex = 0, className }) {
  const tracks = { 1: 'lg:grid-rows-1', 2: 'lg:grid-rows-2', 3: 'lg:grid-rows-3' }
  const spans = Array.isArray(cells) ? cells : Array.from({ length: cells }, () => '')

  return (
    <div
      className={cx(
        'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4',
        tracks[rows] ?? tracks[2],
        className
      )}
    >
      {spans.map((span, index) => (
        <SkeletonCard key={index} feature={index === featureIndex} className={span} />
      ))}
    </div>
  )
}

/** Stand-in for a data table: a header rule plus body rows of cells. */
export function SkeletonTable({ rows = 6, cols = 5, className }) {
  return (
    <div className={cx('flex flex-col', className)}>
      <div className="flex items-center gap-4 border-b border-line bg-surface-sunken px-4 py-3 sm:px-5">
        <Skeleton className="h-2.5 w-24 shrink-0" />
        {Array.from({ length: cols - 1 }, (_, index) => (
          <Skeleton key={index} className="h-2.5 w-14 shrink-0" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5"
        >
          {Array.from({ length: cols }, (_, col) => (
            <div key={col} className={cx('min-w-0', col === 0 ? 'w-28 shrink-0' : 'flex-1')}>
              <Skeleton
                className={cx('h-3', CELL_WIDTHS[(row * cols + col) % CELL_WIDTHS.length])}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Stand-in for a panel of prose or a chart. */
export function SkeletonPanel({ lines = 4, className }) {
  return (
    <div
      aria-hidden="true"
      className={cx('rounded-lg border border-line bg-surface p-5 shadow-xs', className)}
    >
      <Skeleton className="h-3 w-32" />
      <SkeletonText lines={lines} className="mt-5" />
    </div>
  )
}

/**
 * Full-page placeholder. Announces itself to assistive tech once, then keeps
 * everything inside decorative.
 */
export function SkeletonPage({ label = 'Loading…', children, className }) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        {label}
      </span>
      <SkeletonHeader />
      {children}
    </div>
  )
}
