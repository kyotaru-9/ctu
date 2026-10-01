import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { biPerson } from '../../utils/icons'
import { Alert, Button, Card, CardBody, Input } from '../../components/ui'
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
    <AuthShell>
      {/*
        The kit's CardHeader is a horizontal title-bar (flex row, bottom
        border) for "title + actions", so the stacked centred header is
        built in the body rather than fought with overrides.
      */}
      <Card>
        <CardBody className="p-6 sm:p-7">
              <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
                <p className="mt-1.5 text-sm text-ink-muted">Use your CTU account to continue.</p>
              </div>

              {error && (
                <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
                  <label htmlFor="password" className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
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
            </CardBody>
          </Card>

      {/*
        Plain text, not links: there are no Terms or Privacy routes or pages
        yet, and the catch-all route redirects unknown paths back to this
        page, so wiring the two names up would just bounce the reader off.
      */}
      <p className="mt-6 px-2 text-center text-xs leading-relaxed text-white/45">
        By clicking continue, you agree to our Terms of Service and Privacy Policy.
      </p>
    </AuthShell>
  )
}
