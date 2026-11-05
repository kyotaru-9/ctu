import { Logo } from './ui'

/**
 * Shared frame for the signed-out pages: a light canvas with a faint wash of
 * the campus mark's colours, the CTU mark, and the page's own content centred
 * beneath it.
 *
 * Deliberately only the mark. There is no wordmark and no campus line here —
 * the mark already spells CTU, and the pages that need the campus name pass it
 * as a footer, where it reads as a footnote pinned to the bottom of the page
 * rather than as a second heading crowding the form.
 *
 * `footer` sits outside the centred column and is pushed to the bottom of the
 * viewport, so legal text and the campus name do not look like part of the form.
 *
 * The heading is left to each page: the login form and the deactivated notice
 * both open with their own h1, which is the task itself.
 */
export default function AuthShell({ children, footer, width = 'max-w-sm' }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas px-4 py-10">
      {/* Institutional wash behind everything: the campus mark's own gold,
          blue and teal at low opacity, so the page stays light. */}
      <div aria-hidden="true" className="auth-backdrop pointer-events-none absolute inset-0" />

      <div className="relative flex flex-1 flex-col justify-center">
        <div className={`mx-auto w-full ${width}`}>
          <div className="mb-8 flex justify-center">
            <Logo size="2xl" />
          </div>

          {children}
        </div>
      </div>

      {footer && (
        <div className={`relative mx-auto w-full ${width} shrink-0`}>{footer}</div>
      )}
    </div>
  )
}
