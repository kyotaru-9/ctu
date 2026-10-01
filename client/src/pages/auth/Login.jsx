import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { biPerson } from '../../utils/icons'
import { Alert, Button, Input } from '../../components/ui'
import InstallAppButton from '../../features/install/InstallAppButton'
import AuthShell from '../../components/AuthShell'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)

      const redirectPath =
        {
          admin: '/admin/dashboard',
          student: '/student/dashboard',
          student_special: '/special/dashboard',
        }[user?.role] ?? from

      navigate(redirectPath, { replace: true })
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
          onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
              className="field ps-9 pe-16"
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
    </AuthShell>
  )
}
