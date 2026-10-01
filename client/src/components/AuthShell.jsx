import { Logo } from './ui'

/**
 * Shared frame for the signed-out pages: a light canvas, the brand lockup, and a
 * single card centred beneath it.
 *
 * Login, the deactivated-account page and the public QR page all open against
 * this, so they read as one family. The lockup follows the same shape as the QR
 * page's — logo, tight wordmark, muted campus line — rather than inventing a
 * second way of introducing the product.
 *
 * The wordmark is a paragraph, not a heading: the card below carries the single
 * h1, which is the task itself ("Sign in", "Your account is on hold"), and two
 * h1s on a page is one too many. The mark is the only large element — with the
 * photo gone, it is what the eye lands on first, and Archivo Black gives the
 * wordmark enough weight to hold that position without the extruded treatment
 * the old photo-backed version needed.
 *
 * The mark and the wordmark are set flush with no margin between them: the logo
 * art already carries built-in padding, so any gap here reads as a mistake
 * rather than as breathing room.
 */
export default function AuthShell({ children, width = 'max-w-sm' }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className={`w-full ${width}`}>
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="2xl" />
          <p className="font-display text-3xl tracking-tight text-ink">CTU</p>
          <p className="mt-1.5 text-sm text-ink-muted">
            Cebu Technological University · Naga Extension Campus
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
