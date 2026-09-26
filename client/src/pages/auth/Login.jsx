import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { biBuilding, biPerson } from '../../utils/icons'
import { Alert, Button, Card, CardBody, Input } from '../../components/ui'

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
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span
            aria-hidden="true"
            className="mb-5 inline-grid h-12 w-12 place-items-center rounded-xl bg-accent text-xl text-white"
          >
            <i className={biBuilding} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-ink">CTU Clean-Track</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Classroom cleanliness monitoring
          </p>
        </div>

        <Card>
          <CardBody className="p-5 sm:p-6">
            {error && (
              <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
          Cebu Technological University
          <br />
          Clean-Track-Update System
        </p>
      </div>
    </div>
  )
}
