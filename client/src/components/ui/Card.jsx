import { cx } from '../../lib/cx'

export function Card({ as: Component = 'div', className, children, interactive = false, ...rest }) {
  return (
    <Component
      className={cx(
        'rounded-lg border border-line bg-surface shadow-xs',
        interactive &&
          'transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ className, children, ...rest }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardTitle({ as: Component = 'h2', className, children, ...rest }) {
  return (
    <Component className={cx('text-sm font-semibold text-ink', className)} {...rest}>
      {children}
    </Component>
  )
}

export function CardSubtitle({ className, children, ...rest }) {
  return (
    <p className={cx('mt-0.5 text-xs text-ink-muted', className)} {...rest}>
      {children}
    </p>
  )
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cx('px-4 py-4 sm:px-5 sm:py-5', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-sunken px-4 py-3 sm:px-5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
