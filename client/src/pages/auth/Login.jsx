import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { biPerson } from '../../utils/icons'
import { Alert, Button, Card, CardBody, Input, Logo } from '../../components/ui'
import DepthText from '../../components/DepthText'
import bg from '../../assets/bg.jpg'

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
    <div className="relative min-h-dvh">
      {/*
        One background for the whole page. The campus photo sits at low opacity
        under an 85% ink wash: faint enough that its own highlights no longer
        punch through and leave text stranded on a bright patch, dark enough to
        carry the white CTU mark. Because it is a single dark field, both the
        mark and the form card can share it, which is what lets the card stay on
        the design system's white surface instead of being restyled dark.

        The photo is faint texture, not the subject, so the blur and scale that
        were covering the low-resolution source are no longer needed.
      */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <img src={bg} alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-ink/85" />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          {/*
            Brand lockup, not the page heading, so the document keeps a single
            h1 and it is the task itself.
          */}
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="xl" className="mb-4" />

            {/*
              DepthText ships tuned for dark backgrounds, so the stock
              near-white face is already right; the extrusion is a deeper brand
              blue so the letterforms read as extruded type rather than a soft
              glow. The defaults extrude ~80px, as deep as the word is tall,
              which reads as a tunnel, so depth and layers are cut to a ~30px
              extrusion. autoOrbit is off so the mark sits still on a sign-in
              screen; the pointer parallax still runs.
            */}
            <DepthText
              text="CTU"
              layers={30}
              depth={1.05}
              faceColor="#ffffff"
              depthColor="#0a3d8f"
              fontSize="clamp(2.75rem, 13vw, 5.5rem)"
              fontWeight={900}
              tilt={6}
              autoOrbit={false}
              shadow
            />

            <p className="mt-5 text-xs leading-relaxed text-white/55">
              Cebu Technological University - Naga Extension Campus
              <br />
              Clean Track Update
            </p>
          </div>

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
        </div>
      </div>
    </div>
  )
}
