import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks whether the browser will let this page install itself, and runs the
 * prompt when it will.
 *
 * The catch is that only Chromium fires `beforeinstallprompt`. iOS Safari never
 * does — there is no programmatic install there, the user adds the app through
 * the share sheet. So the state distinguishes three cases rather than two:
 *
 *   'ready'   — a captured prompt is waiting, the button can install directly
 *   'manual'  — installable only by hand (iOS, or a browser without the event)
 *   'unavailable' — not installable at all
 *
 * 'installed' is reported separately from the matchMedia query, because the
 * query is what tells us we are already running standalone, while an
 * `appinstalled` event tells us an install just completed. Both end up hiding
 * the button; only the second can be relied on for the transition.
 */
export function useAppInstall() {
  const [state, setState] = useState('checking')
  const [installed, setInstalled] = useState(false)

  /*
     The captured prompt lives in a ref, not component state. The event object
     carries methods and cannot be safely held in state, and the value is never
     rendered — only acted on — so a ref is the right home for it. It also has
     to outlive the effect that captured it, which is why this is not local.
  */
  const deferred = useRef(null)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const standalone = window.matchMedia('(display-mode: window-controls-overlay)')

    // Already installed: launched from the home screen or the Start menu.
    if (media.matches || standalone.matches) {
      setInstalled(true)
      setState('unavailable')
      return undefined
    }

    function onBeforeInstallPrompt(event) {
      // Without preventDefault the browser shows its own mini-infobar and the
      // event never becomes usable, so this is the whole point of listening.
      event.preventDefault()
      deferred.current = event
      setState('ready')
    }

    function onInstalled() {
      deferred.current = null
      setInstalled(true)
      setState('unavailable')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // A page that loads with no prompt available is either iOS or a browser that
    // has not decided yet. Give the manifest a moment to be evaluated before
    // calling the site unsupported, or the button flickers on desktop.
    const timer = setTimeout(() => {
      setState((current) => (current === 'checking' ? 'manual' : current))
    }, 1500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  /**
   * Asks the browser to install. Resolves with whether it actually happened,
   * which is false when the user dismisses the sheet — the prompt is a
   * suggestion, not a command, and treating a dismissal as a failure would be
   * wrong.
   */
  const install = useCallback(async () => {
    const event = deferred.current
    if (!event) return false

    deferred.current = null
    setState('checking')

    try {
      await event.prompt()
      const { outcome } = await event.userChoice

      if (outcome === 'accepted') {
        setInstalled(true)
        setState('unavailable')
        return true
      }

      // Dismissed. Put the button back rather than leaving a dead control.
      setState('manual')
      return false
    } catch {
      setState('manual')
      return false
    }
  }, [])

  return {
    /** Whether the install button is worth showing at all. */
    canInstall: state === 'ready' || state === 'manual',
    /** True when a direct prompt is available, false when instructions are needed. */
    isDirect: state === 'ready',
    installed,
    install,
    state,
  }
}

/**
 * True on iOS, where installing means Share -> Add to Home Screen. Used to word
 * the manual instructions for the platform the reader is actually on.
 */
export function isIos() {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports a Mac UA; the touch-capable Mac check catches it.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
