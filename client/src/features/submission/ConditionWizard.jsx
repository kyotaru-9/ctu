import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraCapture, PhotoPreview } from '../../components/camera/CameraCapture'
import { roomService } from '../../services/roomService'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import { formatTime, todayIso } from '../../lib/format'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CONDITION,
  DetailList,
  IconTile,
  Input,
  PageHeader,
  Progress,
  SegmentedControl,
  Select,
  StatusBadge,
  StepIndicator,
  SkeletonTable,
  Textarea,
} from '../../components/ui'

const STEPS = { DETAILS: 'DETAILS', CAPTURE: 'CAPTURE', REVIEW: 'REVIEW' }

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Manual submission flow for Student Special accounts: no QR scan, so the room,
 * date, schedule and time are chosen by hand.
 */
export default function ConditionWizard({ type }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const isBefore = type === 'before'

  const [rooms, setRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [scheduleId, setScheduleId] = useState('')

  const [condition, setCondition] = useState('clean')
  const [notes, setNotes] = useState('')
  const [captureMode, setCaptureMode] = useState('camera')

  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [step, setStep] = useState(STEPS.DETAILS)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const stepList = [
    { key: STEPS.DETAILS, label: 'Details' },
    { key: STEPS.CAPTURE, label: 'Photo' },
    { key: STEPS.REVIEW, label: 'Review' },
  ]

  useEffect(() => {
    let cancelled = false

    async function fetchRooms() {
      try {
        const response = await roomService.getAll({ is_active: true })
        if (!cancelled && response.success) setRooms(response.data || [])
      } catch {
        // Empty select + inline hint covers this.
      } finally {
        if (!cancelled) setLoadingRooms(false)
      }
    }

    fetchRooms()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!roomId || !date) {
      setSchedules([])
      setScheduleId('')
      return
    }

    let cancelled = false

    async function fetchSchedules() {
      setLoadingSchedules(true)
      try {
        const response = await scheduleService.getSchedulesByRoomAndDate(roomId, date)
        if (cancelled) return

        const data = response.success ? response.data || [] : []
        setSchedules(data)
        // Auto-select the first class and adopt its start time.
        if (data.length > 0) {
          setScheduleId(data[0].id)
          if (data[0].start_time) setTime(String(data[0].start_time).slice(0, 5))
        } else {
          setScheduleId('')
        }
      } catch {
        setSchedules([])
      } finally {
        if (!cancelled) setLoadingSchedules(false)
      }
    }

    fetchSchedules()
    return () => {
      cancelled = true
    }
  }, [roomId, date])

  // Clear any stale photo when returning to the capture step.
  useEffect(() => {
    if (step === STEPS.CAPTURE) {
      setPhoto(null)
      setPhotoPreview(null)
      setError('')
    }
  }, [step])

  const selectedRoom = rooms.find((room) => room.id === roomId)
  const selectedSchedule = schedules.find((schedule) => schedule.id === scheduleId)

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
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setStep(STEPS.REVIEW)
  }

  function handleRetake() {
    setPhoto(null)
    setPhotoPreview(null)
    setStep(STEPS.CAPTURE)
  }

  function handleCancel() {
    setPhoto(null)
    setPhotoPreview(null)
    setStep(STEPS.DETAILS)
  }

  async function handleSubmit() {
    if (!roomId) {
      setError('Select a room.')
      return
    }
    if (!photo) {
      setError('Capture or upload a photo.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      const payload = new FormData()
      payload.append('image', photo)
      payload.append('room_id', roomId)
      payload.append('submission_type', type)
      payload.append('submitted_date', date)
      payload.append('submitted_time', time)
      payload.append('condition', condition)
      payload.append('notes', notes)
      if (scheduleId) payload.append('schedule_id', scheduleId)

      const onProgress = (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total))
        }
      }

      const response = await submissionService.submitBefore(payload, onProgress)

      if (response.success) {
        setDone(true)
      } else {
        setError(response.message || 'Submission failed. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <>
        <PageHeader title="Submission complete" />
        <Card className="mx-auto max-w-lg">
          <CardBody className="flex flex-col items-center p-6 text-center sm:p-8">
            <IconTile icon="bi bi-check-lg" tone="ok" size="lg" className="mb-5" />
            <h2 className="text-base font-semibold text-ink">
              {isBefore ? 'Before' : 'After'} photo recorded
            </h2>
            <p className="mt-1.5 mb-6 text-sm text-ink-muted">
              Your submission has been saved.
            </p>

            <div className="mb-6 w-full rounded-md border border-line bg-surface-sunken p-4 text-start">
              <DetailList
                columns={1}
                items={[
                  { label: 'Room', value: selectedRoom ? `${selectedRoom.room_name} (${selectedRoom.room_code})` : '—' },
                  { label: 'Date', value: date },
                  { label: 'Time', value: formatTime(time) },
                  selectedSchedule && { label: 'Subject', value: selectedSchedule.subject_name },
                  selectedSchedule && { label: 'Instructor', value: selectedSchedule.instructor_name },
                  { label: 'Condition', value: <StatusBadge map={CONDITION} value={condition} /> },
                ]}
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              block
              onClick={() => navigate('/special/dashboard')}
            >
              Done
            </Button>
          </CardBody>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={isBefore ? 'Submit before photo' : 'Submit after photo'}
        subtitle={
          isBefore
            ? 'Record the room condition before class'
            : 'Record the room condition after class'
        }
      />

      <StepIndicator steps={stepList} current={step} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Room', value: selectedRoom?.room_name || 'Not selected' },
                { label: 'Date', value: date },
                { label: 'Time', value: formatTime(time) },
                selectedSchedule && { label: 'Subject', value: selectedSchedule.subject_name },
                selectedSchedule && { label: 'Instructor', value: selectedSchedule.instructor_name },
                {
                  label: 'Condition',
                  value: <StatusBadge map={CONDITION} value={condition} />,
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submission details</CardTitle>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
                {error}
              </Alert>
            )}

            {step === STEPS.DETAILS && (
              <div className="form-stack">
                <Select
                  label="Room"
                  required
                  disabled={loadingRooms}
                  value={roomId}
                  onChange={(event) => {
                    setRoomId(event.target.value)
                    setScheduleId('')
                  }}
                  placeholder={loadingRooms ? 'Loading rooms…' : 'Select a room'}
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_code} — {room.room_name}
                    </option>
                  ))}
                </Select>

                <div className="form-grid">
                  <Input
                    label="Date"
                    type="date"
                    required
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value)
                      setScheduleId('')
                    }}
                  />
                  <Input
                    label="Time"
                    type="time"
                    required
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    hint={
                      selectedSchedule
                        ? `From ${selectedSchedule.subject_name}`
                        : 'Entered manually'
                    }
                  />
                </div>

                {roomId && (
                  loadingSchedules ? (
                    <SkeletonTable rows={3} cols={3} />
                  ) : schedules.length > 0 ? (
                    <Select
                      label="Class schedule"
                      value={scheduleId}
                      onChange={(event) => {
                        setScheduleId(event.target.value)
                        const next = schedules.find((item) => item.id === event.target.value)
                        if (next?.start_time) setTime(String(next.start_time).slice(0, 5))
                      }}
                      placeholder="Select a class"
                      hint="Selecting a class fills in the time automatically"
                    >
                      {schedules.map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.subject_name} — {schedule.instructor_name} (
                          {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)})
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Alert tone="neutral" className="mb-0">
                      No classes are scheduled in this room on {date}. You can still submit with a
                      manual time.
                    </Alert>
                  )
                )}

                <div>
                  <p className="mb-2 text-[0.8125rem] font-medium text-ink">Room condition</p>
                  <SegmentedControl
                    name="condition"
                    columns={2}
                    value={condition}
                    onChange={setCondition}
                    options={[
                      { value: 'clean', label: 'Clean', icon: 'bi bi-check-lg' },
                      { value: 'not_clean', label: 'Not clean', icon: 'bi bi-x-lg' },
                    ]}
                  />
                </div>

                <div>
                  <p className="mb-2 text-[0.8125rem] font-medium text-ink">Photo source</p>
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

                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything worth noting…"
                />

                <Button
                  variant="primary"
                  size="lg"
                  iconEnd="bi bi-arrow-right"
                  block
                  onClick={() => setStep(STEPS.CAPTURE)}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === STEPS.CAPTURE && (
              <div>
                {captureMode === 'camera' ? (
                  <CameraCapture onCapture={acceptFile} autoStart />
                ) : (
                  <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-12 text-center">
                    <span
                      aria-hidden="true"
                      className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-surface text-lg text-ink-subtle"
                    >
                      <i className="bi bi-cloud-arrow-up" />
                    </span>
                    <p className="text-sm text-ink-muted">
                      Choose a photo from this device, or capture one with your camera.
                    </p>
                    <div className="mt-5 flex w-full max-w-xs flex-col gap-2">
                      <Button
                        variant="primary"
                        size="lg"
                        icon="bi bi-camera-fill"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Capture photo
                      </Button>
                      <Button
                        variant="secondary"
                        icon="bi bi-upload"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose file
                      </Button>
                    </div>
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
                  </div>
                )}

                <Button
                  variant="ghost"
                  icon="bi bi-arrow-left"
                  onClick={() => setStep(STEPS.DETAILS)}
                  className="mt-5"
                >
                  Back
                </Button>
              </div>
            )}

            {step === STEPS.REVIEW && (
              <div>
                <PhotoPreview
                  dataUrl={photoPreview}
                  alt={`${isBefore ? 'Before' : 'After'} photo of ${selectedRoom?.room_name ?? 'room'}`}
                  onRetake={handleRetake}
                  onCancel={handleCancel}
                  onConfirm={handleSubmit}
                  busy={uploading}
                />

                {uploading && (
                  <div className="mx-auto mt-6 w-full max-w-sm">
                    <Progress value={uploadProgress} label="Upload progress" />
                    <p className="tabular mt-2 text-center text-xs text-ink-muted">
                      Uploading {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}
