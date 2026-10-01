import { useState } from 'react'
import { isIos, useAppInstall } from '../../hooks/useAppInstall'
import { biInfo, biPhone, biShare } from '../../utils/icons'
import { Alert, Button } from '../../components/ui'

/**
 * Installs the app, or explains how to when the browser will not do it for us.
 *
 * Chromium fires `beforeinstallprompt` and the button installs straight to the
 * desktop or home screen. iOS Safari never fires it, so there the button reveals
 * the Share -> Add to Home Screen route instead of pretending to install. A
 * browser that has decided the app is not installable hides the control rather
 * than offering something that cannot work.
 *
 * Dismissing the browser's own sheet drops the button back to the instructions
 * rather than removing it: a dismissal is often accidental, and the option
 * should still be there on a second attempt.
 *
 * Rendered as a quiet secondary action, not a banner: installing is optional and
 * should not compete with signing in.
 */
export default function InstallAppButton({ className = '' }) {
  const { canInstall, isDirect, install, state } = useAppInstall()
  const [showHelp, setShowHelp] = useState(false)

  // Still deciding, or nothing to install — render nothing rather than a
  // control that may never work.
  if (!canInstall) return null

  if (isDirect) {
    return (
      <div className={className}>
        <Button variant="secondary" block icon={biPhone} onClick={install}>
          Install as an app
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <Button
        variant="ghost"
        block
        icon={isIos() ? biShare : biPhone}
        onClick={() => setShowHelp((value) => !value)}
      >
        {showHelp ? 'Hide install instructions' : 'Install as an app'}
      </Button>

      {showHelp && (
        <Alert tone="info" className="mt-3" title="How to install" icon={biInfo}>
          {isIos() ? (
            <>
              <p>
                Tap <strong>Share</strong> in the browser bar, then{' '}
                <strong>Add to Home Screen</strong>. The app opens from your home screen like any
                other.
              </p>
            </>
          ) : (
            <p>
              Open the browser menu and choose <strong>Install app</strong> or{' '}
              <strong>Add to desktop</strong>. On Windows this is the install icon in the address
              bar.
            </p>
          )}
        </Alert>
      )}

      {state === 'checking' && (
        <p className="mt-2 text-center text-xs text-ink-subtle">Checking whether this can install…</p>
      )}
    </div>
  )
}
