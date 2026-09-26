import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import api from '../../services/api'
import { scheduleService } from '../../services/scheduleService'
import { formatTime } from '../../lib/format'
import {
  Alert,
  Button,
  Card,
  CardBody,
  DetailList,
  EmptyState,
  IconTile,
  SkeletonTable,
  PageHeader,
} from '../../components/ui'

function StatePanel({ icon, tone, title, children }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center p-6 text-center sm:p-8">
        <IconTile icon={icon} tone={tone} size="lg" className="mb-5" />
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {children}
      </CardBody>
    </Card>
  )
}

export default function StudentScan() {
  const navigate = useNavigate()
  const location = useLocation()
  const scannerRef = useRef(null)
  // One decode per scanning session. html5-qrcode fires onSuccess on every
  // frame that still sees the code, so without this the same token is
  // re-validated many times a second.
  const scanLockedRef = useRef(false)


  const [phase, setPhase] = useState('scanning')
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)

  const qrToken = location.state?.qrToken

  const fetchSchedulesForRoom = useCallback(async (roomId) => {
    setLoadingSchedules(true)
    try {
      const response = await scheduleService.getSchedulesByRoom(roomId)
      if (response.success) setSchedules(response.data || [])
    } catch {
      setSchedules([])
    } finally {
      setLoadingSchedules(false)
    }
  }, [])

  const validateQR = useCallback(
    async (token) => {
      setPhase('validating')
      setError('')

      try {
        const response = await api.get(`/rooms/qr/${token}`)
        if (!response.data.success) {
          setError('This QR code is invalid or the room is inactive.')
          setPhase('error')
          return
        }

        setRoom(response.data.data)
        await fetchSchedulesForRoom(response.data.data.id)
        setPhase('identified')
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to validate the QR code.')
        setPhase('error')
      }
    },
    [fetchSchedulesForRoom]
  )

  useEffect(() => {
    if (qrToken) validateQR(qrToken)
  }, [qrToken, validateQR])

  // html5-qrcode lifecycle: only run while the scanning panel is mounted.
  useEffect(() => {
    if (phase !== 'scanning') return

    const element = document.getElementById('qr-scanner')
    if (!element) return

    const scanner = new Html5Qrcode('qr-scanner')
    scannerRef.current = scanner
    scanLockedRef.current = false

    // Set when this effect is torn down. start() resolves asynchronously, so a
    // cleanup that runs before it settles sees isScanning === false and cannot
    // stop the camera — which used to leave the decoder running behind the
    // "Validating…" panel, bouncing the page between validating and identified.
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          if (cancelled || scanLockedRef.current) return
          scanLockedRef.current = true

          const token = decodedText.includes('/scan/')
            ? decodedText.split('/scan/').pop()
            : decodedText
          validateQR(token)
        },
        () => {
          // Per-frame decode misses are expected; ignore them.
        }
      )
      .then(() => {
        if (cancelled) return scanner.stop().catch(() => {})
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError(
            'Camera access is unavailable. Allow camera permission in your browser, then try again.'
          )
        }
      })

    return () => {
      cancelled = true
      if (scanner.isScanning) scanner.stop().catch(() => {})
    }
  }, [phase, validateQR])

  function handleRetry() {
    scannerRef.current = null
    scanLockedRef.current = false
    setRoom(null)
    setError('')
    setCameraError('')
    setSchedules([])
    setSelectedSchedule(null)
    setPhase('scanning')
  }

  function handleContinue() {
    if (!selectedSchedule || !room) return
    navigate('/student/submit', { state: { room, schedule: selectedSchedule } })
  }

  if (phase === 'validating') {
    return (
      <>
        <PageHeader title="Scan room QR" subtitle="Scan the QR code posted in the classroom" />
        <StatePanel icon="bi bi-hourglass-split" tone="accent" title="Validating code…">
          <p className="mt-1.5 text-sm text-ink-muted">Checking the room…</p>
        </StatePanel>
      </>
    )
  }

  if (phase === 'error') {
    return (
      <>
        <PageHeader title="Scan room QR" subtitle="Scan the QR code posted in the classroom" />
        <StatePanel icon="bi bi-x-lg" tone="bad" title="Invalid QR code">
          <p className="mt-2 mb-6 text-sm text-ink-muted">{error}</p>
          <Button variant="primary" size="lg" onClick={handleRetry} icon="bi bi-arrow-repeat">
            Scan again
          </Button>
        </StatePanel>
      </>
    )
  }

  if (phase === 'identified') {
    return (
      <>
        <PageHeader title="Scan room QR" subtitle="Scan the QR code posted in the classroom" />

        <Card className="mb-4">
          <CardBody className="flex flex-col items-center p-6 text-center">
            <IconTile icon="bi bi-check-lg" tone="ok" size="lg" className="mb-5" />
            <h2 className="mb-5 text-base font-semibold text-ink">Room identified</h2>

            <div className="w-full rounded-md border border-line bg-surface-sunken p-4 text-start">
              <DetailList
                columns={2}
                items={[
                  { label: 'Room', value: room?.room_name },
                  { label: 'Code', value: room?.room_code },
                  { label: 'Building', value: room?.building },
                  { label: 'Floor', value: room?.floor },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-4 text-sm font-semibold text-ink">Select today&apos;s class</h2>

            {loadingSchedules ? (
              <SkeletonTable rows={3} cols={3} />
            ) : schedules.length === 0 ? (
              <EmptyState
                compact
                icon="bi bi-calendar-x"
                title="No classes scheduled"
                description="No classes are scheduled in this room. Check with your mayor."
                action={
                  <Button variant="secondary" icon="bi bi-arrow-repeat" onClick={handleRetry}>
                    Scan again
                  </Button>
                }
              />
            ) : (
              <>
                <ul className="-mx-4 flex flex-col sm:-mx-5">
                  {schedules.map((schedule) => {
                    const selected = selectedSchedule?.id === schedule.id
                    return (
                      <li key={schedule.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedSchedule(schedule)}
                          aria-pressed={selected}
                          className={
                            selected
                              ? 'flex w-full items-center gap-3 border-s-2 border-accent bg-accent-soft px-4 py-3.5 text-start'
                              : 'flex w-full items-center gap-3 border-s-2 border-transparent px-4 py-3.5 text-start transition-colors hover:bg-surface-sunken'
                          }
                        >
                          <IconTile
                            icon={selected ? 'bi bi-check-lg' : 'bi bi-calendar3'}
                            tone={selected ? 'accent' : 'neutral'}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">
                              {schedule.subject_name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink-muted">
                              {schedule.instructor_name || '—'} ·{' '}
                              {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleContinue}
                    disabled={!selectedSchedule}
                    iconEnd="bi bi-arrow-right"
                    block
                  >
                    Continue to submission
                  </Button>
                  <Button variant="secondary" icon="bi bi-arrow-repeat" onClick={handleRetry} block>
                    Scan again
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Scan room QR" subtitle="Scan the QR code posted in the classroom" />

      <Card className="mx-auto max-w-lg">
        <CardBody>
          <div className="mb-5 text-center">
            <IconTile icon="bi bi-qr-code" tone="accent" size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-ink">Position the QR code inside the frame</p>
            <p className="mt-1 text-xs text-ink-muted">
              The camera detects it automatically
            </p>
          </div>

          {cameraError && (
            <Alert tone="bad" className="mb-4">
              {cameraError}
              <div className="mt-3">
                <Button variant="secondary" size="sm" icon="bi bi-arrow-repeat" onClick={handleRetry}>
                  Retry camera
                </Button>
              </div>
            </Alert>
          )}

          <div id="qr-scanner" className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />

          <Alert tone="neutral" className="mt-4">
            Allow camera access when prompted, and make sure the code is well lit and fully
            visible.
          </Alert>
        </CardBody>
      </Card>
    </>
  )
}
