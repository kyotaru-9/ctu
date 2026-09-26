import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/cx'
import { useEscapeKey } from '../../lib/useOverlay'

/**
 * Lightweight dropdown. Closes on outside click, Escape, and scroll.
 */
export function Menu({ trigger, children, align = 'end', label = 'Open menu', className }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEscapeKey(open, () => {
    setOpen(false)
    triggerRef.current?.focus()
  })

  useEffect(() => {
    if (!open) return

    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }

    function onScroll() {
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cx('relative', className)}>
      <div ref={triggerRef} onClick={() => setOpen((value) => !value)}>
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cx(
            'absolute top-[calc(100%+0.375rem)] z-30 min-w-11.5rem overflow-hidden rounded-md border border-line bg-surface py-1 shadow-md',
            align === 'end' ? 'end-0' : 'start-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm text-ink transition-colors hover:bg-surface-sunken"
      {...rest}
    >
      {icon && <i className={cx('bi shrink-0 text-sm text-ink-muted', icon)} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function MenuDivider() {
  return <div role="separator" className="my-1 border-t border-line" />
}
