import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { roomService } from '../../services/roomService'
import RoomsBatchUploadModal from '../../features/rooms/RoomsBatchUploadModal'
import AuditLogCalendar from '../../features/audit/AuditLogCalendar'
import { formatDate } from '../../lib/format'
import {
  biArrowRepeat,
  biCalendar,
  biCheckSquare,
  biCloudUpload,
  biDownload,
  biPlus,
  biPrinter,
  biQRCode,
  biToggleOff,
  biTrash,
} from '../../utils/icons'
import {
  ACTIVE_STATUS,
  Alert,
  BentoGrid,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  OCCUPATION_STATUS,
  PageHeader,
  Progress,
  ScrollX,
  Select,
  SkeletonBento,
  StatCard,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
  Textarea,
} from '../../components/ui'

const BLANK_FORM = { room_code: '', floor: '', description: '' }

const FLOOR_OPTIONS = [
  { value: 'First Floor', label: 'First Floor' },
  { value: 'Second Floor', label: 'Second Floor' },
  { value: 'Third Floor', label: 'Third Floor' },
]

const CASCADE_LABELS = {
  schedules: 'schedule',
  occupations: 'occupation',
  submissions: 'room submission',
  reports: 'report',
}

/**
 * Names the rows a room delete takes with it. Everything here references
 * rooms(id) ON DELETE CASCADE, so the counts are exact rather than a warning
 * about "your data". Deactivating the room instead keeps all of this.
 */
function CascadeList({ impact }) {
  const destroying = Object.keys(CASCADE_LABELS)
    .map((key) => [key, impact?.[key] ?? 0])
    .filter(([, count]) => count > 0)

  if (destroying.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        This room has no schedules, occupations, submissions or reports, so deleting it takes
        nothing else with it.
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-md border border-bad/30 bg-bad-soft p-3">
      <p className="text-xs font-semibold tracking-wide text-bad uppercase">Also deleted</p>
      <ul className="mt-2 flex flex-col gap-1">
        {destroying.map(([key, count]) => (
          <li key={key} className="text-sm text-ink">
            {count} {CASCADE_LABELS[key]}
            {count === 1 ? '' : 's'}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminRooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formData, setFormData] = useState(BLANK_FORM)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [viewStats, setViewStats] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [statsDate, setStatsDate] = useState(null)
  const [showStatsDayPicker, setShowStatsDayPicker] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkFloorOpen, setBulkFloorOpen] = useState(false)
  const [bulkFloor, setBulkFloor] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [qrBatch, setQrBatch] = useState(null)
  const [qrBatchUrls, setQrBatchUrls] = useState({})
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteImpact, setBulkDeleteImpact] = useState(null)
  const [bulkDeleteImpactLoading, setBulkDeleteImpactLoading] = useState(false)
  const [statsCalendarMonth, setStatsCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const response = await roomService.getAll()
      if (response.success) {
        setRooms(response.data)
        setSelectedIds((current) => {
          const alive = new Set(response.data.map((room) => room.id))
          return new Set([...current].filter((id) => alive.has(id)))
        })
        return response.data
      } else {
        setError(response.message || 'Failed to load rooms')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  // Generates every selected room's QR up front so the batch modal renders
  // them all at once instead of one spinner per card.
  useEffect(() => {
    if (!qrBatch) {
      setQrBatchUrls({})
      return
    }

    let cancelled = false
    const urls = {}
    Promise.all(
      qrBatch.map(async (room) => {
        try {
          urls[room.id] = await QRCode.toDataURL(
            `${window.location.origin}/scan/${room.qr_token}`,
            { width: 512, margin: 2 }
          )
        } catch {
          urls[room.id] = ''
        }
      })
    ).then(() => {
      if (!cancelled) setQrBatchUrls({ ...urls })
    })

    return () => {
      cancelled = true
    }
  }, [qrBatch])

  const activeCount = rooms.filter((room) => room.is_active).length

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rooms

    return rooms.filter((room) =>
      [room.room_code, room.floor, room.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [rooms, searchTerm])

  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set())
      return !on
    })
  }

  function toggleRoomSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected =
    filteredRooms.length > 0 && filteredRooms.every((room) => selectedIds.has(room.id))

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        filteredRooms.forEach((room) => next.delete(room.id))
      } else {
        filteredRooms.forEach((room) => next.add(room.id))
      }
      return next
    })
  }

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function handleOpenAdd() {
    setEditingRoom(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(room) {
    setEditingRoom(room)
    setFormData({
      room_code: room.room_code || '',
      floor: room.floor || '',
      description: room.description || '',
    })
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function validate() {
    const errors = {}
    if (!formData.room_code.trim()) {
      errors.room_code = 'Room code is required.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setError('')

    try {
      const response = editingRoom
        ? await roomService.update(editingRoom.id, formData)
        : await roomService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save room')
        return
      }

      setShowForm(false)
      await fetchRooms()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save room')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Opens the overview modal on the row it was clicked from, then fills in the
   * aggregated stats — the same open-then-load pattern the section overview
   * uses.
   */
  async function openView(room) {
    setViewTarget(room)
    setViewStats(null)
    setViewError('')
    setStatsDate(null)
    setViewLoading(true)
    try {
      const response = await roomService.getStats(room.id)
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load room stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load room stats')
    } finally {
      setViewLoading(false)
    }
  }

  /**
   * Refetches the overview scoped to one day. Schedules are a point-in-time
   * total, so the server leaves them unfiltered — only occupations,
   * submissions and reports narrow to the picked date.
   */
  async function applyStatsDate(day) {
    if (!viewTarget) return
    setStatsDate(day)
    setViewStats(null)
    setViewError('')
    setViewLoading(true)
    try {
      const response = await roomService.getStats(viewTarget.id, { date: day })
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load room stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load room stats')
    } finally {
      setViewLoading(false)
    }
  }

  function clearStatsDate() {
    setStatsDate(null)
    if (viewTarget) openView(viewTarget)
  }

  function closeView() {
    setViewTarget(null)
    setViewStats(null)
    setViewError('')
    setViewLoading(false)
    setStatsDate(null)
    setShowStatsDayPicker(false)
  }

  const selectedRooms = rooms.filter((room) => selectedIds.has(room.id))

  /**
   * Runs one update against every selected room and reports how many failed.
   * Selection is cleared afterwards either way — a partial failure is surfaced
   * through the error alert and the list re-syncs from the server.
   */
  async function runBulkUpdate(patch, failureMessage) {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedRooms.map((room) => roomService.update(room.id, patch))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${results.length} rooms could not be updated. ${failureMessage}`)
      }
      setSelectedIds(new Set())
      await fetchRooms()
      return failed === 0
    } catch (err) {
      setError(err.response?.data?.message || failureMessage)
      return false
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleBulkFloor() {
    const ok = await runBulkUpdate(
      { floor: bulkFloor.trim() || null },
      'Failed to update the floor'
    )
    if (ok) {
      setBulkFloorOpen(false)
      setBulkFloor('')
    }
  }

  async function handleBulkDisable() {
    const ok = await runBulkUpdate({ is_active: false }, 'Failed to disable rooms')
    if (ok) setBulkDisableOpen(false)
  }

  /**
   * Rotates the QR token on every selected room. Old printed codes stop
   * working immediately, so this is a deliberate bulk action behind the same
   * selection bar as disable and delete.
   */
  async function handleBulkRegenerateQR() {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedRooms.map((room) => roomService.regenerateQR(room.id))
      )
      const succeeded = new Set(
        results
          .map((result, index) =>
            result.status === 'fulfilled' && result.value?.success !== false
              ? selectedRooms[index].id
              : null
          )
          .filter(Boolean)
      )
      const failed = results.length - succeeded.size
      if (failed > 0) {
        setError(`${failed} of ${results.length} QR codes could not be regenerated.`)
      }
      setSelectedIds(new Set())
      const fresh = await fetchRooms()
      // Show the new codes straight away — the batch modal renders from fresh
      // rows so the tokens it encodes are the regenerated ones, not stale ones.
      if (succeeded.size > 0) {
        setQrBatch((fresh ?? []).filter((room) => succeeded.has(room.id)))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate QR codes')
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleBulkDelete() {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedRooms.map((room) => roomService.delete(room.id))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${results.length} rooms could not be deleted.`)
      }
      setSelectedIds(new Set())
      await fetchRooms()
      if (failed === 0) {
        setBulkDeleteOpen(false)
        setBulkDeleteImpact(null)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete rooms')
    } finally {
      setBulkSaving(false)
    }
  }

  function openBulkQr() {
    setQrBatch(selectedRooms)
  }

  /**
   * A single selected room gets the same cascade-cost preview the old
   * per-row delete dialog showed; bulk deletes keep the generic warning.
   */
  function openBulkDelete() {
    setBulkDeleteOpen(true)
    setBulkDeleteImpact(null)
    if (selectedRooms.length !== 1) return

    setBulkDeleteImpactLoading(true)
    roomService
      .getDeleteImpact(selectedRooms[0].id)
      .then((response) => {
        if (response.success) setBulkDeleteImpact(response.data)
      })
      .catch(() => {})
      .finally(() => setBulkDeleteImpactLoading(false))
  }

  function downloadQr(room, dataUrl) {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `QR_${room.room_code}.png`
    link.click()
  }

  return (
    <>
      <PageHeader
        title="Rooms"
        subtitle="Manage classrooms and their QR codes"
        actions={
          <>
            <Button
              variant={selectMode ? 'primary' : 'secondary'}
              icon={biCheckSquare}
              onClick={toggleSelectMode}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button variant="secondary" icon={biCloudUpload} onClick={() => setShowBatchUpload(true)}>
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add room
            </Button>
          </>
        }
      />

      {error && !showForm && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {loading ? (
        <SkeletonBento
          cells={['col-span-2 row-span-2', 'col-span-2', 'col-span-2']}
          className="mb-6"
        />
      ) : (
        <BentoGrid className="mb-6">
          <StatCard
            variant="feature"
            className="col-span-2 row-span-2"
            label="Total rooms"
            value={rooms.length}
            hint={`${activeCount} active · ${rooms.length - activeCount} inactive`}
            footer={
              <Progress
                value={activeCount}
                max={rooms.length || 1}
                tone="ok"
                label="Share of rooms that are active"
              />
            }
          />
          <StatCard className="col-span-2" label="Active" value={activeCount} />
          <StatCard className="col-span-2" label="Inactive" value={rooms.length - activeCount} />
        </BentoGrid>
      )}

      {selectMode && selectedRooms.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium text-ink">{selectedRooms.length} selected</span>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              selectedRooms.length === 1
                ? handleOpenEdit(selectedRooms[0])
                : setBulkFloorOpen(true)
            }
          >
            {selectedRooms.length === 1 ? 'Edit room' : 'Edit floor'}
          </Button>
          <Button size="sm" variant="secondary" icon={biQRCode} onClick={openBulkQr}>
            QR codes
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={biArrowRepeat}
            onClick={handleBulkRegenerateQR}
            loading={bulkSaving}
          >
            Regenerate QR
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={biToggleOff}
            onClick={() => setBulkDisableOpen(true)}
          >
            Disable
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon={biTrash}
            onClick={openBulkDelete}
          >
            Delete
          </Button>
        </div>
      )}

      <TableCard
        title="Classrooms"
        subtitle={`${filteredRooms.length} of ${rooms.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search code, floor, description…"
        loading={loading}
        isEmpty={filteredRooms.length === 0}
        empty={
          <EmptyState
            icon="bi-door-open"
            title="No rooms found"
            description={
              searchTerm
                ? 'No rooms match your search.'
                : 'Add a classroom to generate its QR code.'
            }
          />
        }
      >
        <ScrollX minW="40rem">
          <Table>
            <THead>
              <tr>
                {selectMode && (
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all rooms"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                    />
                  </TH>
                )}
                <TH>Code</TH>
                <TH>Floor</TH>
                <TH>Description</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {filteredRooms.map((room) => (
                <TR
                  key={room.id}
                  className="cursor-pointer"
                  title={selectMode ? undefined : 'View room overview'}
                  onClick={() => (selectMode ? toggleRoomSelection(room.id) : openView(room))}
                >
                  {selectMode && (
                    <TD onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select room ${room.room_code}`}
                        checked={selectedIds.has(room.id)}
                        onChange={() => toggleRoomSelection(room.id)}
                        className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                      />
                    </TD>
                  )}
                  <TD className="tabular font-medium">{room.room_code}</TD>
                  <TD className="tabular">{room.floor || '—'}</TD>
                  <TD className="max-w-xs truncate">{room.description || '—'}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(room.is_active))} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      {/* Add / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingRoom ? 'Edit room' : 'Add room'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="room-form" loading={submitting}>
              {editingRoom ? 'Update room' : 'Create room'}
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Input
              label="Room code"
              required
              value={formData.room_code}
              onChange={(event) => update('room_code', event.target.value)}
              error={fieldErrors.room_code}
              disabled={Boolean(editingRoom)}
              hint={editingRoom ? 'Room code cannot be changed' : undefined}
            />
            <Select
              label="Floor"
              value={formData.floor}
              onChange={(event) => update('floor', event.target.value)}
              placeholder="Select floor"
              options={FLOOR_OPTIONS}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </form>
      </Modal>

      {/* Batch import */}
      <RoomsBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchRooms}
      />

      {/* Day picker for the overview stats — same calendar the audit log
          browser uses. No per-day counts here: the stats endpoint only returns
          aggregates, so days are pickable but unmarked. */}
      <Modal
        open={showStatsDayPicker}
        onClose={() => setShowStatsDayPicker(false)}
        title="Filter overview by date"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowStatsDayPicker(false)}>
            Cancel
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Pick a day to count only that day&apos;s occupations, submissions and reports.
          </p>

          <AuditLogCalendar
            month={statsCalendarMonth}
            onMonthChange={setStatsCalendarMonth}
            counts={{}}
            selected={[]}
            onSelect={() => {}}
            onPickDay={(day) => {
              setShowStatsDayPicker(false)
              applyStatsDate(day)
            }}
          />
        </div>
      </Modal>

      {/* Room overview */}
      <Modal
        open={Boolean(viewTarget)}
        onClose={closeView}
        title={viewTarget ? `Room overview — ${viewTarget.room_code}` : 'Room overview'}
        size="lg"
        bodyClassName="no-scrollbar"
      >
        {viewTarget && (
          <div className="flex flex-col gap-4">
            {viewError && (
              <Alert tone="bad" onDismiss={() => setViewError('')}>
                {viewError}
              </Alert>
            )}

            {viewLoading && <LoadingBlock label="Loading room stats…" compact />}

            {viewStats && !viewLoading && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    icon={biCalendar}
                    onClick={() => setShowStatsDayPicker(true)}
                  >
                    {statsDate ? 'Change date' : 'Filter by date'}
                  </Button>
                  {statsDate && (
                    <Button variant="ghost" size="xs" onClick={clearStatsDate}>
                      Clear · {formatDate(statsDate)}
                    </Button>
                  )}
                </div>

                {statsDate && (
                  <Alert tone="info">
                    Occupations, submissions and reports are counted for {formatDate(statsDate)}
                    only. Schedules are a total and stay unfiltered.
                  </Alert>
                )}

                <div className="flex min-w-0 flex-col justify-between gap-5 rounded-lg border border-line bg-surface p-5 shadow-xs sm:p-6">
                  <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-[7fr_3fr]">
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <p className="text-pretty text-xs leading-tight font-medium tracking-wide text-ink-muted uppercase">
                        Room
                      </p>
                      <div>
                        <p className="tabular text-4xl leading-none font-semibold tracking-tight text-ink sm:text-5xl">
                          {viewTarget.room_code}
                        </p>
                        <p className="mt-2 text-sm text-ink-muted">
                          {[viewTarget.floor ? `Floor ${viewTarget.floor}` : null, viewTarget.description]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-center border-line sm:border-l sm:pl-6">
                      <div className="text-center">
                        {!viewTarget.is_active ? (
                          <p className="text-2xl font-semibold text-bad sm:text-3xl">Unavailable</p>
                        ) : viewStats.current?.occupiedBy ? (
                          <>
                            <p className="text-2xl font-semibold text-warn sm:text-3xl">Occupied</p>
                            <p className="mt-1 text-sm text-ink-muted">
                              {viewStats.current.occupiedBy.section
                                ? `${viewStats.current.occupiedBy.section.program} ${viewStats.current.occupiedBy.section.year_level}${viewStats.current.occupiedBy.section.section_name}`
                                : '—'}
                            </p>
                          </>
                        ) : (
                          <p className="text-2xl font-semibold text-ok sm:text-3xl">Available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <BentoGrid cols={3} rows={1}>
                  <StatCard label="Schedules" value={viewStats.schedules} />
                  <StatCard
                    label="Occupations"
                    value={viewStats.occupations.total}
                    hint={
                      Object.entries(viewStats.occupations.byStatus)
                        .map(([status, count]) => `${count} ${status}`)
                        .join(' · ') || 'none yet'
                    }
                  />
                  <StatCard
                    label="Submissions"
                    value={viewStats.submissions.total}
                    hint={`${viewStats.submissions.before} before · ${viewStats.submissions.after} after`}
                  />
                </BentoGrid>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Occupations ({viewStats.occupations.total})</CardTitle>
                    </CardHeader>
                    <CardBody>
                      {viewStats.occupations.list.length === 0 ? (
                        <p className="py-4 text-center text-sm text-ink-muted">
                          No occupation records for this room yet.
                        </p>
                      ) : (
                        <ScrollX minW="24rem">
                          <Table>
                            <THead>
                              <tr>
                                <TH>Date</TH>
                                <TH>Section</TH>
                                <TH>Subject</TH>
                                <TH>Status</TH>
                              </tr>
                            </THead>
                            <TBody>
                              {viewStats.occupations.list.map((occupation) => (
                                <TR key={occupation.id}>
                                  <TD className="whitespace-nowrap">
                                    {formatDate(occupation.occupation_date)}
                                  </TD>
                                  <TD>
                                    {occupation.section
                                      ? `${occupation.section.program} ${occupation.section.year_level}${occupation.section.section_name}`
                                      : '—'}
                                  </TD>
                                  <TD>{occupation.schedule?.subject_name || '—'}</TD>
                                  <TD>
                                    <StatusBadge map={OCCUPATION_STATUS} value={occupation.status} />
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        </ScrollX>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Reports by reason ({viewStats.reports.total})</CardTitle>
                    </CardHeader>
                    <CardBody>
                      {viewStats.reports.byReason.length === 0 ? (
                        <p className="py-4 text-center text-sm text-ink-muted">
                          No reports filed for this room.
                        </p>
                      ) : (
                        <ScrollX minW="24rem">
                          <Table>
                            <THead>
                              <tr>
                                <TH>Reason</TH>
                                <TH align="right">Count</TH>
                              </tr>
                            </THead>
                            <TBody>
                              {viewStats.reports.byReason.map((row) => (
                                <TR key={row.reason}>
                                  <TD>{row.reason}</TD>
                                  <TD align="right" className="tabular">
                                    {row.count}
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        </ScrollX>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Bulk edit floor */}
      <Modal
        open={bulkFloorOpen}
        onClose={() => setBulkFloorOpen(false)}
        title={`Edit floor — ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBulkFloorOpen(false)}
              disabled={bulkSaving}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBulkFloor} loading={bulkSaving}>
              Apply floor
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p className="text-sm text-ink-muted">
            Every selected room gets the same floor. Leave it empty to clear the floor.
          </p>
          <Select
            label="Floor"
            value={bulkFloor}
            onChange={(event) => setBulkFloor(event.target.value)}
            placeholder="Clear floor"
            options={FLOOR_OPTIONS}
          />
        </div>
      </Modal>

      {/* Bulk QR codes */}
      <Modal
        open={Boolean(qrBatch)}
        onClose={() => setQrBatch(null)}
        title={`QR codes — ${qrBatch?.length ?? 0} room${(qrBatch?.length ?? 0) === 1 ? '' : 's'}`}
        size="lg"
        footer={
          qrBatch?.length === 1 ? (
            <Button
              variant="accent-outline"
              icon={biPrinter}
              onClick={() => navigate(`/admin/qr-print/${qrBatch[0].id}`)}
            >
              Print sheet
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(qrBatch ?? []).map((room) => (
            <div
              key={room.id}
              className="flex flex-col items-center rounded-md border border-line bg-surface-sunken p-4 text-center"
            >
              <div className="qr-frame mb-3 w-full">
                {qrBatchUrls[room.id] ? (
                  <img
                    src={qrBatchUrls[room.id]}
                    alt={`QR code for room ${room.room_code}`}
                    className="h-auto w-full max-w-40"
                  />
                ) : (
                  <div className="grid aspect-square w-full max-w-40 place-items-center rounded-md bg-surface text-sm text-ink-muted">
                    Generating…
                  </div>
                )}
              </div>
              <p className="tabular text-sm font-semibold text-ink">{room.room_code}</p>
              <Button
                variant="accent-outline"
                size="xs"
                icon={biDownload}
                className="mt-2"
                disabled={!qrBatchUrls[room.id]}
                onClick={() => downloadQr(room, qrBatchUrls[room.id])}
              >
                Download
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* Bulk disable */}
      <ConfirmDialog
        open={bulkDisableOpen}
        onClose={() => setBulkDisableOpen(false)}
        onConfirm={handleBulkDisable}
        loading={bulkSaving}
        title="Disable rooms"
        description={`Deactivate ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}? Their QR codes stop working and students can no longer scan them. History is kept.`}
        confirmLabel="Disable"
        tone="bad"
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => {
          setBulkDeleteOpen(false)
          setBulkDeleteImpact(null)
        }}
        onConfirm={handleBulkDelete}
        loading={bulkSaving}
        title={selectedRooms.length === 1 ? 'Delete room' : 'Delete rooms'}
        description={
          selectedRooms.length === 1
            ? `Permanently delete room ${selectedRooms[0]?.room_code}? Its QR code stops working immediately. To close a room without losing its history, use Disable instead.`
            : `Permanently delete ${selectedRooms.length} rooms? Their QR codes stop working immediately and everything attached — schedules, occupations, submissions and reports — is deleted with them. This cannot be undone.`
        }
        confirmLabel="Delete permanently"
      >
        {selectedRooms.length === 1 &&
          (bulkDeleteImpactLoading ? (
            <p className="mt-3 text-sm text-ink-muted">Checking what this room owns…</p>
          ) : (
            bulkDeleteImpact && <CascadeList impact={bulkDeleteImpact} />
          ))}
      </ConfirmDialog>
    </>
  )
}

