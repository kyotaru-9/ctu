import { useCallback, useEffect, useState } from 'react'
import { cx } from '../../lib/cx'
import { excuseService } from '../../services/excuseService'
import { scheduleService } from '../../services/scheduleService'
import { rotationalService } from '../../services/rotationalService'
import { formatDate } from '../../lib/format'
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from '../../components/ui'

const EXCUSE_TYPES = [
  { value: 'all_day', label: 'All Day' },
  { value: 'room_schedule', label: 'Room Schedule' },
  { value: 'area_assignment', label: 'Area Assignment' },
]

const EXCUSE_STATUS = {
  pending: { text: 'Pending', tone: 'warn' },
  approved: { text: 'Approved', tone: 'ok' },
  rejected: { text: 'Rejected', tone: 'bad' },
}

export default function StudentExcuses() {
  const [excuses, setExcuses] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [schedules, setSchedules] = useState([])
  const [assignments, setAssignments] = useState([])
  const [formData, setFormData] = useState({
    excuse_date: new Date().toISOString().split('T')[0],
    excuse_type: 'all_day',
    room_id: '',
    area_id: '',
    schedule_id: '',
    reason: '',
    image: null,
  })

  const fetchExcuses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await excuseService.getMyRequests()
      if (response.success) {
        setExcuses(response.data)
      } else {
        setError(response.message || 'Failed to load excuse requests')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load excuse requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExcuses()
  }, [fetchExcuses])

  const fetchSchedulesAndAssignments = useCallback(async () => {
    try {
      const [schedulesRes, assignmentsRes] = await Promise.all([
        scheduleService.getMySchedules(),
        rotationalService.getWeeklySchedule()
      ])
      if (schedulesRes.success) setSchedules(schedulesRes.data || [])
      if (assignmentsRes.success) setAssignments(assignmentsRes.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules and assignments')
    }
  }, [])

  const openModal = useCallback(async () => {
    await fetchSchedulesAndAssignments()
    setFormData({
      excuse_date: new Date().toISOString().split('T')[0],
      excuse_type: 'all_day',
      room_id: '',
      area_id: '',
      schedule_id: '',
      reason: '',
      image: null,
    })
    setFieldErrors({})
    setModalOpen(true)
  }, [fetchSchedulesAndAssignments])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setFormData({
      excuse_date: '',
      excuse_type: 'all_day',
      room_id: '',
      area_id: '',
      schedule_id: '',
      reason: '',
      image: null,
    })
    setFieldErrors({})
  }, [])

  function updateField(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function validate() {
    const errors = {}
    const today = new Date().toISOString().split('T')[0]

    if (!formData.excuse_date) {
      errors.excuse_date = 'Excuse date is required.'
    } else if (formData.excuse_date < today) {
      errors.excuse_date = 'Excuse date cannot be in the past.'
    }
    if (formData.excuse_type === 'room_schedule' && !formData.schedule_id) {
      errors.schedule_id = 'Select a schedule.'
    }
    if (formData.excuse_type === 'area_assignment' && !formData.area_id) {
      errors.area_id = 'Select an area assignment.'
    }
    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required.'
    }
    if (!formData.image) {
      errors.image = 'Proof image is required.'
    } else if (!formData.image.type.startsWith('image/')) {
      errors.image = 'File must be an image.'
    } else if (formData.image.size > 10 * 1024 * 1024) {
      errors.image = 'Image must be 10 MB or smaller.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    setError('')

    try {
      const formDataToSend = new FormData()
      Object.keys(formData).forEach((key) => {
        if (key !== 'image' && formData[key]) {
          formDataToSend.append(key, formData[key])
        }
      })
      if (formData.image) {
        formDataToSend.append('image', formData.image)
      }

      const response = await excuseService.createRequest(formDataToSend)
      if (response.success) {
        await fetchExcuses()
        closeModal()
      } else {
        setError(response.message || 'Failed to submit excuse request')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit excuse request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Excuse Requests"
        subtitle="Request exemptions from room or rotational cleaning duties"
        actions={
          <Button variant="primary" onClick={openModal}>
            + Request Excuse
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-ink-muted">Loading excuse requests…</div>
        </div>
      ) : excuses.length === 0 ? (
        <EmptyState
          icon="bi-file-earmark-text"
          title="No excuse requests"
          description="You haven't submitted any excuse requests yet."
        />
      ) : (
        <div className="space-y-3">
          {excuses.map((excuse) => (
            <div
              key={excuse.id}
              className="rounded-lg border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium text-ink">{formatDate(excuse.excuse_date)}</span>
                    <StatusBadge map={EXCUSE_STATUS} value={excuse.status} />
                  </div>
                  <p className="mb-1 text-sm text-ink-muted">
                    {EXCUSE_TYPES.find((t) => t.value === excuse.excuse_type)?.label}
                  </p>
                  <p className="text-sm text-ink">{excuse.reason}</p>
                  {excuse.admin_note && (
                    <p className="mt-2 text-xs text-ink-muted">
                      <span className="font-medium">Admin note:</span> {excuse.admin_note}
                    </p>
                  )}
                </div>
                {excuse.proof_image_url && (
                  <img
                    src={excuse.proof_image_url}
                    alt="Proof"
                    className="ml-4 h-20 w-20 rounded border border-line object-cover"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Request Excuse"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>
              Submit Request
            </Button>
          </>
        }
      >
        {error && (
          <Alert tone="bad" onDismiss={() => setError('')} className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Excuse Date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={formData.excuse_date}
            onChange={(event) => updateField('excuse_date', event.target.value)}
            error={fieldErrors.excuse_date}
            required
          />

          <Select
            label="Excuse Type"
            options={EXCUSE_TYPES}
            value={formData.excuse_type}
            onChange={(event) => updateField('excuse_type', event.target.value)}
            required
          />

          {formData.excuse_type === 'room_schedule' && (
            <Select
              label="Schedule"
              options={schedules.map(s => ({ value: s.id, label: `${s.subject_name} - ${s.rooms?.room_code || 'No Room'} (${s.day_of_week})` }))}
              value={formData.schedule_id}
              onChange={(event) => updateField('schedule_id', event.target.value)}
              error={fieldErrors.schedule_id}
              required
            />
          )}

          {formData.excuse_type === 'area_assignment' && (
            <Select
              label="Area Assignment"
              options={assignments.map(a => ({ value: a.id, label: `${a.area?.area_name || 'Unknown'} (Day ${a.day_of_week})` }))}
              value={formData.area_id}
              onChange={(event) => updateField('area_id', event.target.value)}
              error={fieldErrors.area_id}
              required
            />
          )}

          <Textarea
            label="Reason"
            value={formData.reason}
            onChange={(event) => updateField('reason', event.target.value)}
            error={fieldErrors.reason}
            placeholder="Explain why you need an exemption…"
            rows={3}
            required
          />

          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Proof Image <span className="text-bad">*</span>
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => updateField('image', event.target.files[0] || null)}
              aria-invalid={Boolean(fieldErrors.image) || undefined}
              className={cx(
                'block w-full rounded-md border bg-surface p-2 text-sm',
                fieldErrors.image ? 'border-bad' : 'border-line'
              )}
              required
            />
            {fieldErrors.image ? (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-bad">
                <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                {fieldErrors.image}
              </p>
            ) : (
              formData.image && (
                <p className="mt-2 text-xs text-ink-muted">
                  Selected: {formData.image.name}
                </p>
              )
            )}
          </div>

          <p className="text-xs text-ink-muted">
            Your request will need admin approval.
          </p>
        </form>
      </Modal>
    </>
  )
}
