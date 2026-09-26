import { useCallback, useEffect, useRef, useState } from 'react'
import { reportService } from '../../services/reportService'
import { roomService } from '../../services/roomService'
import { formatDate, formatDateTime } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Badge,
  Button,
  DetailList,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  REPORT_STATUS,
  ScrollX,
  Select,
  StatusBadge,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

const BLANK = { room_id: '', reason_id: '', other_reason: '', description: '', image: null }

function ImageDropzone({ preview, onSelect, onClear, error }) {
  const inputRef = useRef(null)

  function handleChange(event) {
    const selected = event.target.files?.[0]
    if (selected) onSelect(selected)
    event.target.value = ''
  }

  return (
    <div>
      <p className="mb-2 text-[0.8125rem] font-medium text-ink">
        Image proof <span className="text-bad">*</span>
      </p>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Selected proof"
            className="max-h-56 rounded-md border border-line object-contain"
          />
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove image"
            className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-bad shadow-sm transition-colors hover:bg-bad-soft"
          >
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-9 text-center transition-colors hover:border-ink-subtle hover:bg-line/40"
        >
          <span
            aria-hidden="true"
            className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-surface text-base text-ink-subtle"
          >
            <i className="bi bi-cloud-arrow-up" />
          </span>
          <span className="text-sm font-medium text-ink">Choose or capture a photo</span>
          <span className="mt-1 text-xs text-ink-muted">JPG, PNG or WEBP · up to 10 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleChange}
        className="sr-only"
        aria-label="Upload image proof"
      />

      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  )
}

/** Shared report list + filing dialog, used by both student roles. */
export default function ReportsPage({ heading = 'Reports' }) {
  const [reports, setReports] = useState([])
  const [rooms, setRooms] = useState([])
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [imageError, setImageError] = useState('')
  const [formData, setFormData] = useState(BLANK)
  const [preview, setPreview] = useState(null)

  const loadReports = useCallback(async () => {
    const response = await reportService.getMyReports()
    if (response.success) setReports(response.data || [])
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [reportsRes, roomsRes, reasonsRes] = await Promise.all([
          reportService.getMyReports(),
          roomService.getAll({ is_active: true }),
          reportService.getReasons(),
        ])
        if (cancelled) return

        if (reportsRes.success) setReports(reportsRes.data || [])
        if (roomsRes.success) setRooms(roomsRes.data || [])
        if (reasonsRes.success) setReasons(reasonsRes.data || [])
      } catch {
        // Leave lists empty; empty states explain it.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  function resetForm() {
    if (preview) URL.revokeObjectURL(preview)
    setFormData(BLANK)
    setPreview(null)
    setFormError('')
    setImageError('')
  }

  function closeCreate() {
    setShowCreate(false)
    resetForm()
  }

  function handleFileSelect(file) {
    if (!ACCEPTED.includes(file.type)) {
      setImageError('Choose a JPG, PNG or WEBP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setImageError('The image must be smaller than 10 MB.')
      return
    }
    setImageError('')
    setFormData((previous) => ({ ...previous, image: file }))
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const needsOther = reasons.find((reason) => reason.id === formData.reason_id)?.name === 'Other'

    if (!formData.room_id || !formData.reason_id || !formData.image) {
      setFormError('Choose a room, a reason, and attach an image.')
      return
    }
    if (needsOther && !formData.other_reason.trim()) {
      setFormError('Describe the other reason.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const payload = new FormData()
      payload.append('room_id', formData.room_id)
      payload.append('reason_id', formData.reason_id)
      payload.append('other_reason', formData.other_reason)
      payload.append('description', formData.description)
      payload.append('image', formData.image)

      const response = await reportService.create(payload)

      if (response.success) {
        setShowCreate(false)
        resetForm()
        await loadReports()
      } else {
        setFormError(response.message || 'Failed to submit the report.')
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit the report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title={heading}
        subtitle="File and track room cleanliness reports"
        actions={
          <Button variant="primary" icon="bi bi-plus-lg" onClick={() => setShowCreate(true)}>
            Report a room
          </Button>
        }
      />

      <TableCard
        title="Your reports"
        subtitle={`${reports.length} filed`}
        loading={loading}
        isEmpty={reports.length === 0}
        empty={
          <EmptyState
            icon="bi bi-exclamation-triangle"
            title="No reports yet"
            description="If a room is dirty or damaged, file a report with a photo."
            action={
              <Button variant="primary" icon="bi bi-plus-lg" onClick={() => setShowCreate(true)}>
                File your first report
              </Button>
            }
          />
        }
      >
        <ScrollX minW="38rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Room</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH align="right">Details</TH>
              </tr>
            </THead>
            <TBody>
              {reports.map((report) => (
                <TR key={report.id}>
                  <TD className="whitespace-nowrap">{formatDate(report.reported_at)}</TD>
                  <TD className="tabular font-medium">{report.room?.room_code || '—'}</TD>
                  <TD>{report.reason?.name || report.other_reason || '—'}</TD>
                  <TD>
                    <StatusBadge map={REPORT_STATUS} value={report.status} />
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end">
                      <ActionButton
                        text="View"
                        label="View report"
                        tone="accent"
                        onClick={() => setSelected(report)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      {/* File a report */}
      <Modal
        open={showCreate}
        onClose={closeCreate}
        title="Report a room problem"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="report-form" loading={submitting}>
              Submit report
            </Button>
          </>
        }
      >
        <form id="report-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {formError && <Alert tone="bad">{formError}</Alert>}

          <div className="form-grid">
            <Select
              label="Room"
              required
              value={formData.room_id}
              onChange={(event) => update('room_id', event.target.value)}
              placeholder="Select a room"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_code} — {room.room_name}
                </option>
              ))}
            </Select>

            <Select
              label="Reason"
              required
              value={formData.reason_id}
              onChange={(event) => update('reason_id', event.target.value)}
              placeholder="Select a reason"
            >
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </Select>
          </div>

          {reasons.find((reason) => reason.id === formData.reason_id)?.name === 'Other' && (
            <Input
              label="Other reason"
              required
              value={formData.other_reason}
              onChange={(event) => update('other_reason', event.target.value)}
              placeholder="Describe the problem"
            />
          )}

          <Textarea
            label="Description (optional)"
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Anything else the admin should know…"
          />

          <ImageDropzone
            preview={preview}
            onSelect={handleFileSelect}
            onClear={() => {
              setFormData((previous) => ({ ...previous, image: null }))
              if (preview) URL.revokeObjectURL(preview)
              setPreview(null)
            }}
            error={imageError}
          />
        </form>
      </Modal>

      {/* Report detail */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Report details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <DetailList
              items={[
                { label: 'Filed at', value: formatDateTime(selected.reported_at) },
                { label: 'Status', value: <StatusBadge map={REPORT_STATUS} value={selected.status} /> },
                { label: 'Room', value: selected.room?.room_code || '—' },
                { label: 'Reason', value: selected.reason?.name || '—' },
                selected.other_reason && { label: 'Other reason', value: selected.other_reason },
              ]}
            />

            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap text-ink">
                {selected.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Image proof
              </p>
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt="Proof submitted with this report"
                  className="max-h-80 w-full rounded-md border border-line object-contain"
                />
              ) : (
                <p className="text-sm text-ink-muted">No image attached.</p>
              )}
            </div>

            {selected.status !== 'pending' && (
              <Alert tone="info">
                This report is marked <Badge tone="info">{selected.status}</Badge> by an
                administrator.
              </Alert>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
