import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraCapture, PhotoPreview } from '../../components/camera/CameraCapture'
import { rotationalService } from '../../services/rotationalService'
import {
  biCamera,
  biClock,
} from '../../utils/icons'
import {
  Alert,
  Badge,
  Button,
  PageHeader,
  Progress,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
  EmptyState,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  SegmentedControl,
  Input,
} from '../../components/ui'

const STEPS = { DETAILS: 'DETAILS', CAPTURE: 'CAPTURE', REVIEW: 'REVIEW' }

const CAPTURE_STEPS = {
  BEFORE_1: 'BEFORE_1',
  BEFORE_2: 'BEFORE_2',
  AFTER_1: 'AFTER_1',
  AFTER_2: 'AFTER_2'
}

const PHASE = { BEFORE: 'BEFORE', AFTER: 'AFTER' }

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
}

const STATUS_TONES = {
  pending: 'warn',
  completed: 'ok',
}

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

function getTodayDbDay() {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export default function SpecialRotational() {
  const [todayData, setTodayData] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [captureMode, setCaptureMode] = useState('camera')
  const [beforePhoto1, setBeforePhoto1] = useState(null)
  const [beforePhotoPreview1, setBeforePhotoPreview1] = useState(null)
  const [beforePhoto2, setBeforePhoto2] = useState(null)
  const [beforePhotoPreview2, setBeforePhotoPreview2] = useState(null)
  const [afterPhoto1, setAfterPhoto1] = useState(null)
  const [afterPhotoPreview1, setAfterPhotoPreview1] = useState(null)
  const [afterPhoto2, setAfterPhoto2] = useState(null)
  const [afterPhotoPreview2, setAfterPhotoPreview2] = useState(null)
  const [beforeTime, setBeforeTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [afterTime, setAfterTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [step, setStep] = useState(STEPS.DETAILS)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const [captureStep, setCaptureStep] = useState(CAPTURE_STEPS.BEFORE_1)
  const [phase, setPhase] = useState(PHASE.BEFORE)

  // Validate required fields
  const currentTime = phase === PHASE.BEFORE ? beforeTime : afterTime
  const isDetailsValid = currentTime

  const stepList = [
    { key: STEPS.DETAILS, label: 'Details' },
    { key: STEPS.CAPTURE, label: 'Photo' },
    { key: STEPS.REVIEW, label: 'Review' },
  ]

  const fetchToday = useCallback(async () => {
    try {
      const response = await rotationalService.getToday()
      if (response.success) {
        setTodayData(response.data)
      } else {
        setError(response.message || 'Failed to load today\'s assignment')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load today\'s assignment')
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const response = await rotationalService.getHistory()
      if (response.success) {
        setHistory(response.data)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }, [])

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await rotationalService.getSchedule()
      if (response.success) {
        setSchedule(response.data)
      }
    } catch (err) {
      console.error('Failed to load schedule:', err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchToday(), fetchHistory(), fetchSchedule()]).finally(() => {
      setLoading(false)
    })
  }, [fetchToday, fetchHistory, fetchSchedule])

  // Clear any stale photo when returning to the capture step.
  useEffect(() => {
    if (step === STEPS.CAPTURE) {
      setError('')
    }
  }, [step])

  function acceptFile(file) {
    if (!ACCEPTED.includes(file.type)) {
      setError('Choose a JPG, PNG or WEBP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('The image must be smaller than 10 MB.')
      return
    }
    setError('')

    switch (captureStep) {
      case CAPTURE_STEPS.BEFORE_1:
        setBeforePhoto1(file)
        setBeforePhotoPreview1(URL.createObjectURL(file))
        setCaptureStep(CAPTURE_STEPS.BEFORE_2)
        setCaptureMode('camera') // Reset to show photo source selection
        break
      case CAPTURE_STEPS.BEFORE_2:
        setBeforePhoto2(file)
        setBeforePhotoPreview2(URL.createObjectURL(file))
        // Show review for before photos
        setStep(STEPS.REVIEW)
        break
      case CAPTURE_STEPS.AFTER_1:
        setAfterPhoto1(file)
        setAfterPhotoPreview1(URL.createObjectURL(file))
        setCaptureStep(CAPTURE_STEPS.AFTER_2)
        setCaptureMode('camera') // Reset to show photo source selection
        break
      case CAPTURE_STEPS.AFTER_2:
        setAfterPhoto2(file)
        setAfterPhotoPreview2(URL.createObjectURL(file))
        // Show review for after photos
        setStep(STEPS.REVIEW)
        break
    }
  }

  function handleRetake(step) {
    switch (step) {
      case CAPTURE_STEPS.BEFORE_1:
        setBeforePhoto1(null)
        setBeforePhotoPreview1(null)
        setCaptureStep(CAPTURE_STEPS.BEFORE_1)
        setCaptureMode('camera') // Reset to show photo source selection
        break
      case CAPTURE_STEPS.BEFORE_2:
        setBeforePhoto2(null)
        setBeforePhotoPreview2(null)
        setCaptureStep(CAPTURE_STEPS.BEFORE_2)
        setCaptureMode('camera') // Reset to show photo source selection
        break
      case CAPTURE_STEPS.AFTER_1:
        setAfterPhoto1(null)
        setAfterPhotoPreview1(null)
        setCaptureStep(CAPTURE_STEPS.AFTER_1)
        setCaptureMode('camera') // Reset to show photo source selection
        break
      case CAPTURE_STEPS.AFTER_2:
        setAfterPhoto2(null)
        setAfterPhotoPreview2(null)
        setCaptureStep(CAPTURE_STEPS.AFTER_2)
        setCaptureMode('camera') // Reset to show photo source selection
        break
    }
  }

  function handleCancel() {
    setBeforePhoto1(null)
    setBeforePhotoPreview1(null)
    setBeforePhoto2(null)
    setBeforePhotoPreview2(null)
    setAfterPhoto1(null)
    setAfterPhotoPreview1(null)
    setAfterPhoto2(null)
    setAfterPhotoPreview2(null)
    setStep(STEPS.DETAILS)
    setCaptureStep(CAPTURE_STEPS.BEFORE_1)
    setPhase(PHASE.BEFORE)
  }

  async function handleSubmit() {
    if (phase === PHASE.BEFORE) {
      // Submit before photos only
      if (!beforePhoto1 || !beforePhoto2 || !todayData?.assignment?.area_id) return

      setSubmitting(true)
      setUploadProgress(0)
      setError('')

      try {
        const onProgress = (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total))
          }
        }

        // Submit before photo 1
        const beforeFormData1 = new FormData()
        beforeFormData1.append('image', beforePhoto1)
        beforeFormData1.append('area_id', todayData.assignment.area_id)
        beforeFormData1.append('submitted_time', beforeTime)
        beforeFormData1.append('image_number', '1')

        const beforeResponse1 = await rotationalService.submitBefore(beforeFormData1, onProgress)
        if (!beforeResponse1.success) {
          setError(beforeResponse1.message || 'Failed to submit before photo 1')
          return
        }

        setUploadProgress(50)

        // Submit before photo 2
        const beforeFormData2 = new FormData()
        beforeFormData2.append('image', beforePhoto2)
        beforeFormData2.append('area_id', todayData.assignment.area_id)
        beforeFormData2.append('submitted_time', beforeTime)
        beforeFormData2.append('image_number', '2')

        const beforeResponse2 = await rotationalService.submitBefore(beforeFormData2, onProgress)
        if (!beforeResponse2.success) {
          setError(beforeResponse2.message || 'Failed to submit before photo 2')
          return
        }

        setUploadProgress(100)

        // Return to details page
        setStep(STEPS.DETAILS)
        setCaptureStep(CAPTURE_STEPS.BEFORE_1)
        setPhase(PHASE.BEFORE)
        setBeforePhoto1(null)
        setBeforePhotoPreview1(null)
        setBeforePhoto2(null)
        setBeforePhotoPreview2(null)
        await fetchToday()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to submit before photos')
      } finally {
        setSubmitting(false)
      }
    } else {
      // Submit after photos only
      if (!afterPhoto1 || !afterPhoto2 || !todayData?.assignment?.area_id) return

      setSubmitting(true)
      setUploadProgress(0)
      setError('')

      try {
        const onProgress = (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded * 100) / event.total))
          }
        }

        // Submit after photo 1
        const afterFormData1 = new FormData()
        afterFormData1.append('image', afterPhoto1)
        afterFormData1.append('area_id', todayData.assignment.area_id)
        afterFormData1.append('submitted_time', afterTime)
        afterFormData1.append('image_number', '1')

        const afterResponse1 = await rotationalService.submitAfter(afterFormData1, onProgress)
        if (!afterResponse1.success) {
          setError(afterResponse1.message || 'Failed to submit after photo 1')
          return
        }

        setUploadProgress(50)

        // Submit after photo 2
        const afterFormData2 = new FormData()
        afterFormData2.append('image', afterPhoto2)
        afterFormData2.append('area_id', todayData.assignment.area_id)
        afterFormData2.append('submitted_time', afterTime)
        afterFormData2.append('image_number', '2')

        const afterResponse2 = await rotationalService.submitAfter(afterFormData2, onProgress)
        if (!afterResponse2.success) {
          setError(afterResponse2.message || 'Failed to submit after photo 2')
          return
        }

        setUploadProgress(100)

        setBeforePhoto1(null)
        setBeforePhotoPreview1(null)
        setBeforePhoto2(null)
        setBeforePhotoPreview2(null)
        setAfterPhoto1(null)
        setAfterPhotoPreview1(null)
        setAfterPhoto2(null)
        setAfterPhotoPreview2(null)
        setStep(STEPS.DETAILS)
        setCaptureStep(CAPTURE_STEPS.BEFORE_1)
        setPhase(PHASE.BEFORE)
        await fetchToday()
        await fetchHistory()
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to submit after photos')
      } finally {
        setSubmitting(false)
      }
    }
  }

  function handleStartCapture() {
    // Determine which phase to start based on existing photos
    if (beforeCount >= 2) {
      // Before photos already submitted, start with after phase
      setCaptureStep(CAPTURE_STEPS.AFTER_1)
      setPhase(PHASE.AFTER)
    } else {
      // Start with before phase
      setCaptureStep(CAPTURE_STEPS.BEFORE_1)
      setPhase(PHASE.BEFORE)
    }
    setBeforePhoto1(null)
    setBeforePhotoPreview1(null)
    setBeforePhoto2(null)
    setBeforePhotoPreview2(null)
    setAfterPhoto1(null)
    setAfterPhotoPreview1(null)
    setAfterPhoto2(null)
    setAfterPhotoPreview2(null)
    setCaptureMode('camera') // Reset to show photo source selection
    setStep(STEPS.CAPTURE)
  }

  function getAreaLabel() {
    if (!todayData?.assignment?.area) return 'No assignment for today'
    const area = todayData.assignment.area
    return `${area.name} (${area.floor})`
  }

  function formatDate(dateString) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const hasBefore1 = todayData?.existingRecord?.before_image_url
  const hasBefore2 = todayData?.existingRecord?.before_image_url_2
  const hasAfter1 = todayData?.existingRecord?.after_image_url
  const hasAfter2 = todayData?.existingRecord?.after_image_url_2
  const isCompleted = todayData?.existingRecord?.status === 'completed'
  const beforeCount = (hasBefore1 ? 1 : 0) + (hasBefore2 ? 1 : 0)
  const afterCount = (hasAfter1 ? 1 : 0) + (hasAfter2 ? 1 : 0)

  if (step === STEPS.DETAILS) {
    return (
      <>
        <PageHeader
          title="Rotational Cleaning"
          subtitle="Submit before and after photos for your assigned cleaning area."
        />

        {error && (
          <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
            {error}
          </Alert>
        )}

        {loading ? (
          <TableCard loading={true} title="Loading..." />
        ) : (
          <>
            {/* Today's Assignment */}
            <TableCard
              title="Today's Assignment"
              subtitle={todayData?.assignment ? getAreaLabel() : 'No assignment for today'}
              loading={loading}
              isEmpty={!todayData?.assignment}
              empty={
                <EmptyState
                  icon="bi-calendar-x"
                  title="No assignment today"
                  description="You don't have a rotational cleaning assignment for today."
                />
              }
            >
              {todayData?.assignment && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{todayData.assignment.area.name}</h3>
                      <p className="text-sm">{todayData.assignment.area.description}</p>
                      <p className="text-sm">Floor: {todayData.assignment.area.floor}</p>
                    </div>
                    {todayData.existingRecord && (
                      <Badge tone={STATUS_TONES[todayData.existingRecord.status]}>
                        {STATUS_LABELS[todayData.existingRecord.status]}
                      </Badge>
                    )}
                  </div>

                  <Progress
                    value={(beforeCount + afterCount) * 25}
                    max={100}
                    tone={isCompleted ? 'ok' : 'info'}
                    label={`${beforeCount}/2 Before · ${afterCount}/2 After`}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Before Photo 1 */}
                    <div className="rounded-md border border-line bg-surface-sunken p-4">
                      <h4 className="mb-3 text-sm font-semibold">Before Photo 1</h4>
                      {hasBefore1 ? (
                        <div className="space-y-2">
                          <a
                            href={todayData.existingRecord.before_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-accent hover:underline"
                          >
                            View photo
                          </a>
                          <p className="text-xs">
                            Captured: {formatDate(todayData.existingRecord.before_captured_at)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm">Not yet submitted</p>
                      )}
                    </div>

                    {/* Before Photo 2 */}
                    <div className="rounded-md border border-line bg-surface-sunken p-4">
                      <h4 className="mb-3 text-sm font-semibold">Before Photo 2</h4>
                      {hasBefore2 ? (
                        <div className="space-y-2">
                          <a
                            href={todayData.existingRecord.before_image_url_2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-accent hover:underline"
                          >
                            View photo
                          </a>
                          <p className="text-xs">
                            Captured: {formatDate(todayData.existingRecord.before_captured_at_2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm">Not yet submitted</p>
                      )}
                    </div>

                    {/* After Photo 1 */}
                    <div className="rounded-md border border-line bg-surface-sunken p-4">
                      <h4 className="mb-3 text-sm font-semibold">After Photo 1</h4>
                      {hasAfter1 ? (
                        <div className="space-y-2">
                          <a
                            href={todayData.existingRecord.after_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-accent hover:underline"
                          >
                            View photo
                          </a>
                          <p className="text-xs">
                            Captured: {formatDate(todayData.existingRecord.after_captured_at)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm">Not yet submitted</p>
                      )}
                    </div>

                    {/* After Photo 2 */}
                    <div className="rounded-md border border-line bg-surface-sunken p-4">
                      <h4 className="mb-3 text-sm font-semibold">After Photo 2</h4>
                      {hasAfter2 ? (
                        <div className="space-y-2">
                          <a
                            href={todayData.existingRecord.after_image_url_2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-accent hover:underline"
                          >
                            View photo
                          </a>
                          <p className="text-xs">
                            Captured: {formatDate(todayData.existingRecord.after_captured_at_2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm">Not yet submitted</p>
                      )}
                    </div>
                  </div>

                  {!isCompleted && (
                    <Button
                      variant="primary"
                      size="lg"
                      block
                      icon={biCamera}
                      onClick={handleStartCapture}
                    >
                      {beforeCount < 2 ? `Capture Before Photo ${beforeCount + 1}` : `Capture After Photo ${afterCount + 1}`}
                    </Button>
                  )}
                </div>
              )}
            </TableCard>

            {/* Weekly Schedule */}
            <TableCard
              title="Weekly Schedule"
              subtitle={`${schedule.length} assignments per week`}
              className="mt-6"
              loading={loading}
              isEmpty={schedule.length === 0}
              empty={
                <EmptyState
                  icon="bi-calendar-x"
                  title="No schedule yet"
                  description="Your section has no rotational cleaning assignments configured."
                />
              }
            >
              <Table>
                <THead>
                  <tr>
                    <TH>Day</TH>
                    <TH>Area</TH>
                    <TH>Floor</TH>
                  </tr>
                </THead>
                <TBody>
                  {schedule.map((item) => (
                    <TR key={item.id} active={item.day_of_week === getTodayDbDay()}>
                      <TD className="whitespace-nowrap font-medium">
                        {DAY_NAMES[item.day_of_week]}
                        {item.day_of_week === getTodayDbDay() && (
                          <Badge tone="accent" className="ms-2">
                            Today
                          </Badge>
                        )}
                      </TD>
                      <TD>{item.area?.name || '—'}</TD>
                      <TD>{item.area?.floor || '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableCard>

            {/* History */}
            <TableCard
              title="History"
              subtitle={`${history.length} records`}
              className="mt-6"
              loading={loading}
              isEmpty={history.length === 0}
              empty={
                <EmptyState
                  icon={biClock}
                  title="No history yet"
                  description="Your cleaning records will appear here after submission."
                />
              }
            >
              <Table>
                <THead>
                  <tr>
                    <TH>Area</TH>
                    <TH>Status</TH>
                    <TH>Before</TH>
                    <TH>After</TH>
                    <TH>Submitted</TH>
                  </tr>
                </THead>
                <TBody>
                  {history.map((record) => (
                    <TR key={record.id}>
                      <TD className="font-medium">
                        {record.area?.name} ({record.area?.floor})
                      </TD>
                      <TD>
                        <Badge tone={STATUS_TONES[record.status] || 'info'}>
                          {STATUS_LABELS[record.status] || record.status}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="space-y-1">
                          {record.before_image_url && (
                            <a
                              href={record.before_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-accent hover:underline text-xs"
                            >
                              View 1
                            </a>
                          )}
                          {record.before_image_url_2 && (
                            <a
                              href={record.before_image_url_2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-accent hover:underline text-xs"
                            >
                              View 2
                            </a>
                          )}
                          {!record.before_image_url && !record.before_image_url_2 && (
                            <span className="text-ink-muted">-</span>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <div className="space-y-1">
                          {record.after_image_url && (
                            <a
                              href={record.after_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-accent hover:underline text-xs"
                            >
                              View 1
                            </a>
                          )}
                          {record.after_image_url_2 && (
                            <a
                              href={record.after_image_url_2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-accent hover:underline text-xs"
                            >
                              View 2
                            </a>
                          )}
                          {!record.after_image_url && !record.after_image_url_2 && (
                            <span className="text-ink-muted">-</span>
                          )}
                        </div>
                      </TD>
                      <TD className="text-sm">{formatDate(record.submitted_at)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableCard>
          </>
        )}
      </>
    )
  }

  if (step === STEPS.CAPTURE) {
    const getCaptureLabel = () => {
      switch (captureStep) {
        case CAPTURE_STEPS.BEFORE_1: return 'Before Photo 1'
        case CAPTURE_STEPS.BEFORE_2: return 'Before Photo 2'
        case CAPTURE_STEPS.AFTER_1: return 'After Photo 1'
        case CAPTURE_STEPS.AFTER_2: return 'After Photo 2'
      }
    }

    const getCurrentPhoto = () => {
      switch (captureStep) {
        case CAPTURE_STEPS.BEFORE_1: return beforePhotoPreview1
        case CAPTURE_STEPS.BEFORE_2: return beforePhotoPreview2
        case CAPTURE_STEPS.AFTER_1: return afterPhotoPreview1
        case CAPTURE_STEPS.AFTER_2: return afterPhotoPreview2
      }
    }

    const currentPhoto = getCurrentPhoto()
    const currentLabel = getCaptureLabel()

    return (
      <>
        <PageHeader
          title={`Capture ${currentLabel}`}
          subtitle={`Capture or upload the ${currentLabel} for ${getAreaLabel()}`}
        />

        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Photo source</CardTitle>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
                {error}
              </Alert>
            )}

            <div className="mb-5">
              <SegmentedControl
                name="capture-mode"
                columns={2}
                value={captureMode}
                onChange={setCaptureMode}
                options={[
                  { value: 'camera', label: 'Camera', icon: 'bi bi-camera-fill' },
                  { value: 'upload', label: 'Upload', icon: 'bi bi-cloud-arrow-up' },
                ]}
              />
            </div>

            {currentPhoto ? (
              <div className="space-y-3">
                <img
                  src={currentPhoto}
                  alt={currentLabel}
                  className="w-full rounded-md border border-line"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  block
                  icon="bi bi-arrow-counterclockwise"
                  onClick={() => handleRetake(captureStep)}
                >
                  Retake
                </Button>
              </div>
            ) : captureMode === 'camera' ? (
              <CameraCapture onCapture={acceptFile} autoStart />
            ) : (
              <div className="space-y-2">
                <div
                  className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface-sunken p-6 text-center hover:border-accent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-surface text-2xl text-ink-subtle">
                    <i className="bi bi-cloud-arrow-up" />
                  </span>
                  <p className="text-sm text-ink-muted">Click to upload {currentLabel.toLowerCase()}</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              aria-label="Upload room photo"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) acceptFile(file)
                event.target.value = ''
              }}
              className="sr-only"
            />

            <div className="mt-6 flex gap-3">
              <Button
                variant="ghost"
                icon="bi bi-arrow-left"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      </>
    )
  }

  if (step === STEPS.REVIEW) {
    return (
      <>
        <PageHeader
          title={phase === PHASE.BEFORE ? "Review before photos" : "Review after photos"}
          subtitle={phase === PHASE.BEFORE ? "Confirm your before photos before submitting" : "Confirm your after photos before submitting"}
        />

        <Card className="mx-auto max-w-2xl">
          <CardBody>
            {error && (
              <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
                {error}
              </Alert>
            )}

            {/* Time Input */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-ink">
                {phase === PHASE.BEFORE ? 'Before Time' : 'After Time'}
              </label>
              <Input
                type="time"
                value={phase === PHASE.BEFORE ? beforeTime : afterTime}
                onChange={(e) => phase === PHASE.BEFORE ? setBeforeTime(e.target.value) : setAfterTime(e.target.value)}
                hint={!currentTime ? 'Time is required' : ''}
              />
              {!currentTime && (
                <p className="mt-2 text-xs text-bad">Time is required</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {phase === PHASE.BEFORE ? (
                <>
                  {/* Before Photo 1 Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-ink">Before Photo 1</h4>
                    {beforePhotoPreview1 ? (
                      <div className="space-y-2">
                        <img
                          src={beforePhotoPreview1}
                          alt="Before photo 1"
                          className="w-full rounded-md border border-line"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          block
                          icon="bi bi-arrow-counterclockwise"
                          onClick={() => handleRetake(CAPTURE_STEPS.BEFORE_1)}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-line bg-surface-sunken p-4 text-center">
                        <p className="text-sm text-ink-muted">Not captured yet</p>
                      </div>
                    )}
                  </div>

                  {/* Before Photo 2 Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-ink">Before Photo 2</h4>
                    {beforePhotoPreview2 ? (
                      <div className="space-y-2">
                        <img
                          src={beforePhotoPreview2}
                          alt="Before photo 2"
                          className="w-full rounded-md border border-line"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          block
                          icon="bi bi-arrow-counterclockwise"
                          onClick={() => handleRetake(CAPTURE_STEPS.BEFORE_2)}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-line bg-surface-sunken p-4 text-center">
                        <p className="text-sm text-ink-muted">Not captured yet</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* After Photo 1 Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-ink">After Photo 1</h4>
                    {afterPhotoPreview1 ? (
                      <div className="space-y-2">
                        <img
                          src={afterPhotoPreview1}
                          alt="After photo 1"
                          className="w-full rounded-md border border-line"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          block
                          icon="bi bi-arrow-counterclockwise"
                          onClick={() => handleRetake(CAPTURE_STEPS.AFTER_1)}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-line bg-surface-sunken p-4 text-center">
                        <p className="text-sm text-ink-muted">Not captured yet</p>
                      </div>
                    )}
                  </div>

                  {/* After Photo 2 Preview */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-ink">After Photo 2</h4>
                    {afterPhotoPreview2 ? (
                      <div className="space-y-2">
                        <img
                          src={afterPhotoPreview2}
                          alt="After photo 2"
                          className="w-full rounded-md border border-line"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          block
                          icon="bi bi-arrow-counterclockwise"
                          onClick={() => handleRetake(CAPTURE_STEPS.AFTER_2)}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-line bg-surface-sunken p-4 text-center">
                        <p className="text-sm text-ink-muted">Not captured yet</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                icon="bi bi-arrow-left"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                icon="bi bi-check-lg"
                onClick={handleSubmit}
                disabled={phase === PHASE.BEFORE ? (!beforePhoto1 || !beforePhoto2) : (!afterPhoto1 || !afterPhoto2)}
                loading={submitting}
                className="flex-1"
              >
                {phase === PHASE.BEFORE ? 'Submit Before Photos' : 'Submit After Photos'}
              </Button>
            </div>

            {submitting && (
              <div className="mx-auto mt-6 w-full max-w-sm">
                <Progress value={uploadProgress} label="Upload progress" />
                <p className="tabular mt-2 text-center text-xs text-ink-muted">
                  Uploading {uploadProgress}%
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </>
    )
  }

  return null
}
