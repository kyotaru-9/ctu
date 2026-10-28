import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cleaningRecordService } from '../../services/cleaningRecordService'
import { formatDate, formatDateTime, formatTime, sectionLabel } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DetailList,
  EmptyState,
  Modal,
  PageHeader,
  RowActions,
  ScrollX,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'
import {
  biTrash,
} from '../../utils/icons'

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
}

const STATUS_TONES = {
  pending: 'warn',
  completed: 'ok',
}

// Matches the w-48 / max-h-56 classes on the preview below
const PREVIEW_W = 192
const PREVIEW_MAX_H = 224
const GAP = 8
const OPEN_DELAY = 250

function PhotoPreview({ imageUrl, label, rect, id }) {
  const centered = rect.left + rect.width / 2 - PREVIEW_W / 2
  const left = Math.min(Math.max(centered, GAP), window.innerWidth - PREVIEW_W - GAP)
  const flipBelow = rect.top < PREVIEW_MAX_H + GAP

  return createPortal(
    <div
      id={id}
      role="tooltip"
      style={{
        position: 'fixed',
        left,
        zIndex: 50,
        ...(flipBelow
          ? { top: rect.bottom + GAP }
          : { bottom: window.innerHeight - rect.top + GAP }),
      }}
    >
      <img
        src={imageUrl}
        alt={`${label} photo`}
        className="max-h-56 w-48 rounded-md border border-line bg-surface-sunken object-contain shadow-md"
      />
    </div>,
    document.body
  )
}

function PhotoFlag({ imageUrl, label }) {
  const triggerRef = useRef(null)
  const timerRef = useRef(null)
  const [rect, setRect] = useState(null)
  const previewId = useId()

  const previewable = Boolean(imageUrl)

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setRect(null)
  }, [])

  useEffect(() => {
    if (!rect) return undefined

    const onScroll = () => hide()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [rect, hide])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function show() {
    if (!previewable) return

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const trigger = triggerRef.current
      if (trigger) setRect(trigger.getBoundingClientRect())
    }, OPEN_DELAY)
  }

  const badge = imageUrl ? (
    <Badge tone="ok" icon="bi bi-check-lg">
      Done
    </Badge>
  ) : (
    <Badge tone="bad" icon="bi bi-x-lg">
      Missing
    </Badge>
  )

  if (!previewable) return badge

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-zoom-in rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        tabIndex={0}
        aria-describedby={previewId}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {badge}
      </span>
      {rect && <PhotoPreview imageUrl={imageUrl} label={label} rect={rect} id={previewId} />}
    </>
  )
}

function PhotoPanel({ title, imageUrl1, imageUrl2, capturedAt1, capturedAt2 }) {
  const hasPhoto1 = Boolean(imageUrl1)
  const hasPhoto2 = Boolean(imageUrl2)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-muted">Photo 1</p>
              {hasPhoto1 ? (
                <img
                  src={imageUrl1}
                  alt={`${title} photo 1`}
                  className="max-h-32 w-full rounded-md border border-line object-contain"
                />
              ) : (
                <div className="grid h-24 place-items-center rounded-md bg-surface-sunken text-sm text-ink-muted">
                  No photo
                </div>
              )}
              {capturedAt1 && (
                <p className="text-xs text-ink-muted">{formatDateTime(capturedAt1)}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-muted">Photo 2</p>
              {hasPhoto2 ? (
                <img
                  src={imageUrl2}
                  alt={`${title} photo 2`}
                  className="max-h-32 w-full rounded-md border border-line object-contain"
                />
              ) : (
                <div className="grid h-24 place-items-center rounded-md bg-surface-sunken text-sm text-ink-muted">
                  No photo
                </div>
              )}
              {capturedAt2 && (
                <p className="text-xs text-ink-muted">{formatDateTime(capturedAt2)}</p>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default function AdminCleanArea() {
  const [records, setRecords] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const response = await cleaningRecordService.getAll()
      if (response.success) {
        setRecords(response.data)
      } else {
        setError(response.message || 'Failed to load cleaning records')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cleaning records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const openDetails = useCallback((record) => {
    setSelected(record)
  }, [])

  const closeDetails = useCallback(() => {
    setSelected(null)
  }, [])

  function openDeleteDialog(record) {
    setDeleteTarget(record)
    setError('')
  }

  function closeDeleteDialog() {
    setDeleteTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      const response = await cleaningRecordService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete record')
        return
      }
      closeDeleteDialog()
      closeDetails()
      await fetchRecords()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete record')
    } finally {
      setDeleting(false)
    }
  }

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return records

    return records.filter((record) =>
      [
        record.section?.section_name,
        record.section?.program,
        record.area?.name,
        record.area?.floor,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [records, searchTerm])

  return (
    <>
      <PageHeader
        title="Clean Area Records"
        subtitle="View submitted before/after photos for rotational cleaning assignments."
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="All records"
        subtitle={`${filteredRecords.length} of ${records.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search section, area, floor…"
        loading={loading}
        isEmpty={filteredRecords.length === 0}
        empty={
          <EmptyState
            icon="bi-camera"
            title="No cleaning records found"
            description="Cleaning records will appear here when students submit before/after photos."
          />
        }
      >
        <ScrollX minW="60rem">
          <Table>
            <THead>
              <tr>
                <TH>Section</TH>
                <TH>Area</TH>
                <TH>Status</TH>
                <TH>Before</TH>
                <TH>After</TH>
                <TH>Submitted</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredRecords.map((record) => (
                <TR key={record.id}>
                  <TD className="font-medium">{sectionLabel(record.section)}</TD>
                  <TD>{record.area?.name ? `${record.area.name} (${record.area.floor})` : '—'}</TD>
                  <TD>
                    <Badge tone={STATUS_TONES[record.status] || 'info'}>
                      {STATUS_LABELS[record.status] || record.status}
                    </Badge>
                  </TD>
                  <TD>
                    <PhotoFlag imageUrl={record.before_image_url} label="Before" />
                  </TD>
                  <TD>
                    <PhotoFlag imageUrl={record.after_image_url} label="After" />
                  </TD>
                  <TD className="text-sm">{formatDate(record.submitted_at)}</TD>
                  <TD align="right">
                    <div className="flex justify-end gap-2">
                      <ActionButton
                        text="View"
                        label="View record details"
                        tone="accent"
                        onClick={() => openDetails(record)}
                      />
                      <RowActions label={`Actions for record`}>
                        <ActionButton
                          icon={biTrash}
                          label="Delete record"
                          tone="bad"
                          onClick={() => openDeleteDialog(record)}
                        />
                      </RowActions>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      {/* Details modal */}
      <Modal
        open={Boolean(selected)}
        onClose={closeDetails}
        title="Cleaning record details"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeDetails}>
              Close
            </Button>
            <Button
              variant="bad"
              icon={biTrash}
              onClick={() => openDeleteDialog(selected)}
            >
              Delete
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="container">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Status card */}
              <Card className="flex flex-col items-center justify-center p-6">
                <p className="text-sm font-medium text-ink-muted mb-2">Status</p>
                <Badge tone={STATUS_TONES[selected.status]} size="md">{STATUS_LABELS[selected.status]}</Badge>
              </Card>

              {/* Section info card */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Section</p>
                    <p className="text-sm">{sectionLabel(selected.section)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Subject</p>
                    <p className="text-sm">{selected.section?.program || selected.section?.section_name || '—'}</p>
                  </div>
                </div>
              </Card>

              {/* Area info card */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Room</p>
                    <p className="text-sm">{selected.area?.name ? `${selected.area.name} (${selected.area.floor})` : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Condition</p>
                    <Badge tone={STATUS_TONES[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
                  </div>
                </div>
              </Card>

              {/* Before photos - spans 2 columns */}
              <div className="sm:col-span-2">
                <PhotoPanel
                  title="Before photos"
                  imageUrl1={selected.before_image_url}
                  imageUrl2={selected.before_image_url_2}
                  capturedAt1={selected.before_captured_at}
                  capturedAt2={selected.before_captured_at_2}
                />
              </div>

              {/* Date/Time card */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Date</p>
                    <p className="text-sm">{formatDate(selected.submitted_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted">Time</p>
                    <p className="text-sm">{formatTime(selected.submitted_at)}</p>
                  </div>
                </div>
              </Card>

              {/* After photos - spans 2 columns */}
              <div className="sm:col-span-2">
                <PhotoPanel
                  title="After photos"
                  imageUrl1={selected.after_image_url}
                  imageUrl2={selected.after_image_url_2}
                  capturedAt1={selected.after_captured_at}
                  capturedAt2={selected.after_captured_at_2}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete cleaning record"
        message={`Are you sure you want to delete this cleaning record? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="bad"
        onCancel={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
