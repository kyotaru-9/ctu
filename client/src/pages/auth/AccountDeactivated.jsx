import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, DetailList } from '../../components/ui'
import AuthShell from '../../components/AuthShell'

const ROLE_LABELS = {
  student: 'Student',
  student_special: 'Special Student',
  admin: 'Administrator',
}

const STASH_KEY = 'deactivated_account'

/**
 * Shown instead of the sign-in form when the credentials were right but the
 * account has been deactivated.
 *
 * A deactivated student usually arrives here by trying to sign in and getting
 * nowhere, so the page answers the three questions they actually have: is my
 * password wrong, is there anything I can do, and who do I talk to. The section
 * is on screen because it is what the campus office will ask for.
 *
 * The account details come from the login response via router state. When the
 * reader is redirected here mid-session instead, the document reloads and takes
 * that state with it, so the API layer stashes the same details in
 * sessionStorage on the way out. Either way the page still degrades to a generic
 * message rather than breaking if it is opened directly.
 */
export default function AccountDeactivated() {
  const navigate = useNavigate()
  const location = useLocation()
  const [account, setAccount] = useState(location.state?.account ?? null)

  useEffect(() => {
    if (account) return

    try {
      const stashed = sessionStorage.getItem(STASH_KEY)
      if (stashed) {
        setAccount(JSON.parse(stashed))
        sessionStorage.removeItem(STASH_KEY)
      }
    } catch {
      // Unreadable stash: the page still renders without the details.
    }
  }, [account])

  const who = account?.full_name || account?.email

  return (
    <AuthShell width="max-w-md">
      <Card>
        <CardBody className="p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-warn-soft text-lg text-warn"
            >
              <i className="bi bi-pause-circle" />
            </span>

            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-ink">
                Your account is on hold
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {who ? <span className="font-medium text-ink">{who}</span> : 'This account'} has been
                deactivated by an administrator.
              </p>
            </div>
          </div>

          {/*
            The reason the admin gave, if they gave one. Quoted rather than
            reworded: it is the one piece of information the student is here for,
            and paraphrasing it risks softening or hardening what was actually
            said. Falls back to the likely cause when the reason is missing,
            which is the case for an account disabled through the roles endpoint
            rather than the section toggle.
          */}
          {account?.reason ? (
            <div className="mt-5 border-l-4 border-warn bg-warn-soft p-4">
              <p className="text-xs font-semibold tracking-wide text-warn uppercase">
                Reason given
              </p>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink">{account.reason}</p>
            </div>
          ) : (
            <div className="rounded-md border border-line bg-surface-sunken p-4">
              <p className="text-sm text-ink">
                Your password is correct — the account itself has been paused, so nothing you enter
                will sign you in until it is switched back on.
              </p>
              {account?.section && (
                <p className="mt-2 text-sm text-ink-muted">
                  No reason was recorded. This usually means the section is inactive — ask your
                  section representative or the campus office.
                </p>
              )}
            </div>
          )}

          {account && (
            <DetailList
              className="mt-5"
              items={[
                { label: 'Email', value: account.email },
                account.full_name && { label: 'Name', value: account.full_name },
                account.role && {
                  label: 'Account type',
                  value: ROLE_LABELS[account.role] ?? account.role,
                },
                { label: 'Section', value: account.section || '—' },
              ]}
            />
          )}

          {/*
            Named rather than given a contact detail. There is no support address
            in the project to read from, and a plausible-looking but wrong one is
            worse than none, so the page lists the two routes that reach a human.
          */}
          <div className="mt-5 rounded-md border border-line bg-surface-sunken p-4">
            <p className="text-sm font-medium text-ink">Contact your admin for support</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-muted">
              <li className="flex items-start gap-2">
                <i
                  className="bi bi-person-badge mt-0.5 shrink-0 text-ink-subtle"
                  aria-hidden="true"
                />
                <span>
                  Your <strong className="font-medium text-ink">section representative</strong> (the
                  section mayor), who can ask the admin to switch your section back on.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <i className="bi bi-building mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span>
                  The <strong className="font-medium text-ink">CTU campus office</strong>, if your
                  section is active and you are still locked out.
                </span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-ink-subtle">
              Quote the section name above when you get in touch — it is how the account is found.
            </p>
          </div>

          <Button variant="secondary" size="lg" block className="mt-6" onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        </CardBody>
      </Card>
    </AuthShell>
  )
}
