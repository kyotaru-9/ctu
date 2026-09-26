import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { biLock, biQRCode } from '../utils/icons'
import {
  Alert,
  Button,
  Card,
  CardBody,
  DetailList,
  IconTile,
  Logo,
  SkeletonCard,
} from '../components/ui'

const DASHBOARD_BY_ROLE = {
  admin: '/admin/dashboard',
  student: '/student/dashboard',
  student_special: '/special/dashboard',
}

export default function QRScan() {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchRoom() {
      try {
        const response = await api.get(`/rooms/qr/${qrToken}`)
        if (cancelled) return

        if (response.data.success) {
          setRoom(response.data.data)
        } else {
          setError('Invalid or inactive QR code')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load room information')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRoom()
    return () => {
      cancelled = true
    }
  }, [qrToken])

  function handleLogin() {
    navigate('/login', { state: { from: { pathname: `/scan/${qrToken}` } } })
  }

  function handleProceed() {
    if (!user) return handleLogin()

    if (user.role === 'admin') navigate(`/admin/qr-print/${room.id}`)
    else if (user.role === 'student') navigate('/student/submit', { state: { room } })
    else navigate('/special/before')
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <SkeletonCard className="w-full max-w-xs" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
        <Card className="w-full max-w-sm text-center">
          <CardBody className="p-6">
            <IconTile icon="bi bi-x-circle" tone="bad" size="lg" className="mx-auto mb-5" />
            <h1 className="text-base font-semibold text-ink">Invalid QR code</h1>
            <p className="mt-2 text-sm text-ink-muted">{error}</p>
            <Button variant="accent-outline" block className="mt-6" onClick={() => navigate('/')}>
              Go to home
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!room) return null

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo size="lg" className="mb-4" />
          <h1 className="text-lg font-semibold tracking-tight text-ink">CTU</h1>
          <p className="mt-1 text-sm text-ink-muted">Classroom cleanliness monitoring</p>
        </div>

        <Card>
          <CardBody className="p-5 sm:p-6">
            <div className="rounded-lg border border-line bg-surface-sunken p-4">
              <DetailList
                columns={2}
                items={[
                  { label: 'Room', value: room.room_name },
                  { label: 'Code', value: room.room_code },
                  { label: 'Building', value: room.building },
                  { label: 'Floor', value: room.floor },
                ]}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button variant="primary" size="lg" block iconEnd="bi-arrow-right" onClick={handleProceed}>
                {user ? (user.role === 'admin' ? 'View room details' : 'Submit room condition') : 'Log in to continue'}
              </Button>

              {user && (
                <Button variant="secondary" block onClick={() => navigate(DASHBOARD_BY_ROLE[user.role])}>
                  Go to dashboard
                </Button>
              )}
            </div>

            {!user && (
              <Alert tone="neutral" icon={biLock} className="mt-4">
                Log in to submit this room&apos;s condition or view its details.
              </Alert>
            )}
          </CardBody>
        </Card>

        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={handleLogin}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <i className={biQRCode} aria-hidden="true" />
            Already have an account? Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
