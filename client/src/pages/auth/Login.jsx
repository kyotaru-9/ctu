import { useState } from 'react'
import { cx } from '../../lib/cx'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { biBuilding, biPerson } from '../../utils/icons'
import {
  Alert,
  Button,
  Checkbox,
  FullPageLoader,
  IconTile,
  Input,
  Modal,
} from '../../components/ui'
import InstallAppButton from '../../features/install/InstallAppButton'
import AuthShell from '../../components/AuthShell'

const ROLE_HOME = {
  admin: '/admin/dashboard',
  student: '/student/dashboard',
  student_special: '/special/dashboard',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const { login, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  // A stored session that is still valid means there is nothing to sign in
  // for: skip the form and land on the dashboard the role belongs to. While
  // checkAuth is in flight a loader stands in, so the form never flashes for
  // somebody who is already signed in.
  if (authLoading) return <FullPageLoader label="Checking your session…" />
  if (user) return <Navigate to={ROLE_HOME[user.role] ?? from} replace />

  function validate() {
    const errors = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.'
    }
    if (!password) {
      errors.password = 'Password is required.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function clearFieldError(field) {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)

    try {
      const user = await login(email.trim(), password.trim(), rememberMe)

      navigate(ROLE_HOME[user?.role] ?? from, { replace: true })
    } catch (err) {
      const body = err.response?.data

      // A deactivated account is a different situation from a wrong password:
      // the credentials were right, and no amount of retrying will help. Send
      // the reader to a page that says so and tells them who to contact, rather
      // than leaving them retyping a password that already works.
      if (err.response?.status === 403 && body?.error === 'Account disabled') {
        navigate('/account-deactivated', {
          replace: true,
          state: { account: body.data ?? { email } }
        })
        return
      }

      setError(body?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      footer={
        <>
          {/*
            Plain text, not links: there are no Terms or Privacy routes or pages
            yet, and the catch-all route redirects unknown paths back to the login
            page, so wiring the two names up would just bounce the reader off.
          */}
          <p className="text-center text-xs leading-relaxed text-ink-subtle">
            By clicking continue, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="mt-1.5 text-center text-xs text-ink-subtle">
            Cebu Technological University · Naga Extension Campus
          </p>
        </>
      }
    >
      {/*
        No card. The fields sit straight on the canvas, so the only container is
        the form itself — the mark and the form are the whole page.
      */}
      <div className="auth-enter">
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Use your CTU account to continue.</p>
        </div>

        {error && (
          <Alert tone="bad" onDismiss={() => setError('')} className="mt-5">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email address"
            icon={biPerson}
            placeholder="you@ctu.edu.ph"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldError('email')
            }}
            error={fieldErrors.email}
            autoComplete="email"
            disabled={loading}
            required
          />

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[0.8125rem] font-medium text-ink"
            >
              Password
            </label>
            <div className="relative">
              <i
                className="bi bi-lock-fill pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-sm text-ink-subtle"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  clearFieldError('password')
                }}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                autoComplete="current-password"
                disabled={loading}
                required
                className={cx('field ps-9 pe-16', fieldErrors.password && 'field-invalid')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute top-1/2 end-1.5 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-bad">
                <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="Remember me"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              disabled={loading}
              className="text-sm font-medium text-accent transition-colors hover:text-accent-hover disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" variant="primary" size="lg" block loading={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/*
          Hairline between the two actions. Installing is a different kind of
          choice from signing in, and without a break the button reads as part of
          the form.
        */}
        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[0.6875rem] tracking-wide text-ink-subtle uppercase">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <InstallAppButton className="mt-4" />
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Forgot your password?"
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setForgotOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="flex items-start gap-3">
          <IconTile icon={biBuilding} tone="accent" />
          <p className="text-sm leading-relaxed text-ink-muted">
            Passwords cannot be reset on this page. Please visit the{' '}
            <strong className="font-semibold text-ink">SAO Office</strong> to inquire about
            resetting your password.
          </p>
        </div>
      </Modal>
    </AuthShell>
  )
}
