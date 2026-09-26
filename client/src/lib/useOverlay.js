import { useEffect } from 'react'

/** Prevents the page behind an overlay from scrolling, compensating for the scrollbar. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return

    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [active])
}

/** Calls `handler` on Escape while `active`. */
export function useEscapeKey(active, handler) {
  useEffect(() => {
    if (!active) return

    function onKeyDown(event) {
      if (event.key === 'Escape') handler()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, handler])
}
