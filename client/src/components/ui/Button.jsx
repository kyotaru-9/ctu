import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary:
    'bg-accent text-white border border-transparent hover:bg-accent-hover active:bg-accent-hover disabled:bg-accent/50',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-sunken hover:border-ink-subtle',
  subtle:
    'bg-surface-sunken text-ink-muted border border-transparent hover:bg-line hover:text-ink',
  ghost:
    'bg-transparent text-ink-muted border border-transparent hover:bg-surface-sunken hover:text-ink',
  danger:
    'bg-bad text-white border border-transparent hover:brightness-95 active:brightness-90 disabled:bg-bad/50',
  'danger-outline':
    'bg-surface text-bad border border-bad/40 hover:bg-bad-soft hover:border-bad',
  'accent-outline':
    'bg-surface text-accent border border-accent/40 hover:bg-accent-soft hover:border-accent',
}

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-sm',
  sm: 'h-8 px-2.5 text-[0.8125rem] gap-1.5 rounded-md',
  md: 'h-10 px-3.5 text-sm gap-2 rounded-md',
  // 44px+ touch target for primary mobile actions.
  lg: 'h-11 px-4 text-sm gap-2 rounded-md',
}

const ICON_SIZES = {
  xs: 'text-[0.6875rem]',
  sm: 'text-sm',
  md: 'text-[0.9375rem]',
  lg: 'text-base',
}

const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'secondary',
    size = 'md',
    icon,
    iconEnd,
    loading = false,
    block = false,
    className,
    children,
    disabled,
    type,
    ...rest
  },
  ref
) {
  const isNativeButton = Component === 'button'
  const isDisabled = disabled || loading

  return (
    <Component
      ref={ref}
      type={isNativeButton ? type ?? 'button' : undefined}
      disabled={isNativeButton ? isDisabled : undefined}
      aria-busy={loading || undefined}
      aria-disabled={!isNativeButton && isDisabled ? true : undefined}
      data-block={block || undefined}
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap font-medium',
        'transition-colors duration-150 select-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] ?? VARIANTS.secondary,
        SIZES[size] ?? SIZES.md,
        block && 'w-full',
        loading && 'cursor-wait',
        className
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} className={ICON_SIZES[size]} />
      ) : (
        icon && <i className={cx('bi shrink-0', icon, ICON_SIZES[size])} aria-hidden="true" />
      )}
      {children}
      {iconEnd && !loading && (
        <i className={cx('bi shrink-0', iconEnd, ICON_SIZES[size])} aria-hidden="true" />
      )}
    </Component>
  )
})

export function LinkButton({ to, variant = 'secondary', size = 'md', className, children, ...rest }) {
  return (
    <Button as={Link} to={to} variant={variant} size={size} className={className} {...rest}>
      {children}
    </Button>
  )
}

export { Button }
