import { createPortal } from 'react-dom'
import { cx } from '../../lib/cx'
import { useEscapeKey, useScrollLock } from '../../lib/useOverlay'

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
}

/**
 * Centred dialog on ≥sm, bottom sheet on phones. Renders in a portal, locks
 * background scroll, closes on Escape or backdrop click.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  className,
  bodyClassName,
}) {
  useScrollLock(open)
  useEscapeKey(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-lg',
          'rounded-t-xl sm:rounded-lg',
          SIZES[size] ?? SIZES.md,
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <i className="bi bi-x-lg text-base" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className={cx('min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5', bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-sunken px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

/** Side drawer used for mobile navigation. */
export function Drawer({ open, onClose, title, children, className }) {
  useScrollLock(open)
  useEscapeKey(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Navigation'}
        className={cx(
          'absolute inset-y-0 start-0 flex w-[17rem] max-w-[85vw] flex-col bg-surface shadow-lg',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="-mr-1 grid h-9 w-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}
