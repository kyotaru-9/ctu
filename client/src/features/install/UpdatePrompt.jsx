import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { biArrowClockwise } from '../../utils/icons'
import { Button } from '../../components/ui'

/**
 * Reload prompt for a waiting service worker.
 *
 * The app has no unsaved state anywhere a reload would lose — every form is
 * short and server-backed — so an update is a straight reload rather than a
 * "later" that could sit stale for days. The prompt only appears when a new
 * version is actually waiting, which is why `vite-plugin-pwa` is configured with
 * `registerType: 'prompt'` and `injectRegister: null`.
 *
 * Note the shape of the API: `registerSW` returns only the update function. The
 * waiting-worker signal arrives on the `onNeedRefresh` callback, so the flag has
 * to be React state fed from there rather than destructured off the return.
 */
export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateRef = useRef(null)

  useEffect(() => {
    // Registration is deliberately not in the cleanup: a service worker should
    // outlive any component unmount, and re-registering on every mount in dev
    // would attach a second listener to the same worker.
    const update = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onRegisteredSW(_url, registration) {
        // Chrome only fires the waiting-worker event on a navigation, so a tab
        // left open across a deploy would never notice. This covers that case.
        if (!registration) return
        const timer = setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)
        return () => clearInterval(timer)
      }
    })

    updateRef.current = update
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:pb-6">
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-lg">
        <p className="min-w-0 flex-1 text-sm text-ink">A new version is ready.</p>
        <Button
          variant="primary"
          size="sm"
          icon={biArrowClockwise}
          onClick={() => updateRef.current?.(true)}
        >
          Reload
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          Later
        </Button>
      </div>
    </div>
  )
}
