import { cx } from '../../lib/cx'

const SIZES = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
}

export function Spinner({ size = 'md', className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label}>
      <span
        className={cx(
          'inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em]',
          SIZES[size] ?? SIZES.md,
          className
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function LoadingBlock({ label = 'Loading…', className, compact = false }) {
  return (
    <div
      className={cx(
        'flex items-center justify-center gap-2.5 text-sm text-ink-muted',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      <Spinner size="sm" label={label} />
      <span>{label}</span>
    </div>
  )
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <LoadingBlock label={label} />
    </div>
  )
}
