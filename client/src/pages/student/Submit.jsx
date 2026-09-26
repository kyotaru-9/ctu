import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CameraCapture, PhotoPreview } from '../../components/camera/CameraCapture'
import { submissionService } from '../../services/submissionService'
import { formatTime, sectionLabel } from '../../lib/format'
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
  PageHeader,
  Progress,
  SegmentedControl,
  StatusBadge,
  StepIndicator,
  Textarea,
} from '../../components/ui'

const STEPS = {
  TYPE_CONDITION: 'TYPE_CONDITION',
  CAMERA: 'CAMERA',
  PREVIEW: 'PREVIEW',
}

const STEP_LIST = [
  { key: STEPS.TYPE_CONDITION, label: 'Details' },
  { key: STEPS.CAMERA, label: 'Photo' },
  { key: STEPS.PREVIEW, label: 'Review' },
]

export default function StudentSubmit() {
  const navigate = useNavigate()
  const location = useLocation()

  const room = location.state?.room ?? null
  const schedule = location.state?.schedule ?? null

  const [submissionType, setSubmissionType] = useState('before')
  const [condition, setCondition] = useState('clean')
  const [notes, setNotes] = useState('')

  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [step, setStep] = useState(STEPS.TYPE_CONDITION)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Discard a stale photo whenever the user returns to the camera step.
  useEffect(() => {
    if (step === STEPS.CAMERA) {
      setPhoto(null)
      setPhotoPreview(null)
      setError('')
    }
  }, [step])

  // No room means the user arrived without scanning — send them back.
  if (!room) return <Navigate to="/student/scan" replace />

  const isBefore = submissionType === 'before'

  function handlePhotoCaptured(file) {
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setStep(STEPS.PREVIEW)
  }

  function handleRetake() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview(null)
    setStep(STEPS.CAMERA)
  }

  function handleCancel() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview(null)
    setStep(STEPS.TYPE_CONDITION)
  }

  async function handleSubmit() {
    if (!photo) {
      setError('Please capture a photo first.')
      return
    }

    if (!room || !room.id) {
      setError('Room information is missing. Please scan a QR code first.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', photo)
      formData.append('room_id', room.id)
      formData.append('submission_type', submissionType)
      formData.append('condition', condition)
      formData.append('notes', notes)
      if (schedule && schedule.id) formData.append('schedule_id', schedule.id)

      const onProgress = (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total))
        }
      }

      const response = isBefore
        ? await submissionService.submitBefore(formData, onProgress)
        : await submissionService.submitAfter(formData, onProgress)

      if (response.success) {
        setDone(true)
      } else {
        setError(response.message || 'Submission failed. Please try again.')
      }
    } catch (err) {
      console.error('Submission error:', err)
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
              {isBefore ? 'Before' : 'After'} submission recorded
            </h2>
            <p className="mt-1.5 mb-6 text-sm text-ink-muted">
              Your room condition photo has been saved.
            </p>

            <div className="mb-6 w-full rounded-md border border-line bg-surface-sunken p-4 text-start">
              <DetailList
                columns={1}
                items={[
                  { label: 'Room', value: room ? `${room.room_name || 'Unknown'} (${room.room_code || 'Unknown'})` : 'Unknown' },
                  { label: 'Type', value: isBefore ? 'Before class' : 'After class' },
                  { label: 'Condition', value: <StatusBadge map={CONDITION} value={condition} /> },
                  schedule && schedule.subject_name && { label: 'Subject', value: schedule.subject_name },
                  schedule && schedule.sections && { label: 'Section', value: sectionLabel(schedule.sections) },
                ].filter(item => item !== false && item !== null && item !== undefined)}
              />
            </div>

            <Button variant="primary" size="lg" block onClick={() => navigate('/student/dashboard')}>
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
        title="Submit room condition"
        subtitle={`${room.room_name} · ${room.room_code}`}
        actions={
          <Link
            to="/student/scan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to scan
          </Link>
        }
      />

      <StepIndicator steps={STEP_LIST} current={step} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardBody>
            <DetailList
              columns={1}
              items={[
                { label: 'Room', value: room?.room_name || 'Unknown' },
                { label: 'Code', value: room?.room_code || 'Unknown' },
                { label: 'Building', value: room?.building || 'Unknown' },
                { label: 'Floor', value: room?.floor || 'Unknown' },
                schedule && schedule.subject_name && { label: 'Subject', value: schedule.subject_name },
                schedule && schedule.instructor_name && { label: 'Instructor', value: schedule.instructor_name },
                schedule && schedule.start_time && schedule.end_time && {
                  label: 'Time',
                  value: `${formatTime(schedule.start_time)} – ${formatTime(schedule.end_time)}`,
                },
                schedule && schedule.sections && { label: 'Section', value: sectionLabel(schedule.sections) },
              ].filter(item => item !== false && item !== null && item !== undefined)}
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

            {step === STEPS.TYPE_CONDITION && (
              <div className="form-stack">
                <div>
                  <p className="mb-2 text-[0.8125rem] font-medium text-ink">Submission type</p>
                  <SegmentedControl
                    name="submission-type"
                    columns={2}
                    value={submissionType}
                    onChange={(value) => {
                      setSubmissionType(value)
                      setCondition('clean')
                    }}
                    options={[
                      { value: 'before', label: 'Before class', icon: 'bi bi-camera-fill' },
                      { value: 'after', label: 'After class', icon: 'bi bi-clipboard-check' },
                    ]}
                  />
                </div>

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

                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything worth noting about the room…"
                />

                <Button
                  variant="primary"
                  size="lg"
                  iconEnd="bi bi-arrow-right"
                  onClick={() => setStep(STEPS.CAMERA)}
                  block
                >
                  Continue
                </Button>
              </div>
            )}

            {step === STEPS.CAMERA && (
              <div>
                <CameraCapture onCapture={handlePhotoCaptured} autoStart />
                <Button
                  variant="ghost"
                  icon="bi bi-arrow-left"
                  onClick={() => setStep(STEPS.TYPE_CONDITION)}
                  className="mt-5"
                >
                  Back
                </Button>
              </div>
            )}

            {step === STEPS.PREVIEW && (
              <div>
                <PhotoPreview
                  dataUrl={photoPreview}
                  alt={`${isBefore ? 'Before' : 'After'} condition for ${room.room_name}`}
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
