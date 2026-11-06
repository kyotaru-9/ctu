import { useCallback, useEffect, useMemo, useState } from 'react'
import { roomService } from '../../services/roomService'
import { scheduleService } from '../../services/scheduleService'
import { sectionService } from '../../services/sectionService'
import { educatorService } from '../../services/educatorService'
import SchedulesBatchUploadModal from '../../features/schedules/SchedulesBatchUploadModal'
import { biCheckSquare, biCloudUpload, biPlus, biTrash } from '../../utils/icons'
import { DAY_NAMES_LIST, dayName, formatDateTime, formatTime, sectionLabel } from '../../lib/format'
import {
  ACTIVE_STATUS,
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DetailList,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  ScrollX,
  Select,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

const BLANK_FORM = {
  section_id: '',
  room_id: '',
  subject_name: '',
  educator_id: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([])
  const [sections, setSections] = useState([])
  const [rooms, setRooms] = useState([])
  const [educators, setEducators] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulesRes, sectionsRes, roomsRes, educatorsRes] = await Promise.all([
        scheduleService.getAll(),
        sectionService.getAll(),
        roomService.getAll(),
        educatorService.getActive(),
      ])
      if (schedulesRes.success) setSchedules(schedulesRes.data)
      if (sectionsRes.success) setSections(sectionsRes.data)
      if (roomsRes.success) setRooms(roomsRes.data)
      if (educatorsRes.success) setEducators(educatorsRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const filteredSchedules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return schedules

    return schedules.filter((schedule) =>
      [
        schedule.section?.section_name,
        schedule.section?.program,
        schedule.room?.room_code,
        schedule.subject_name,
        schedule.educator?.name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [schedules, searchTerm])

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function toFormData(schedule) {
    return {
      section_id: schedule.section_id || '',
      room_id: schedule.room_id || '',
      subject_name: schedule.subject_name || '',
      educator_id: schedule.educator_id || '',
      day_of_week: schedule.day_of_week !== undefined && schedule.day_of_week !== null
        ? String(schedule.day_of_week)
        : '',
      start_time: schedule.start_time?.slice(0, 5) || '',
      end_time: schedule.end_time?.slice(0, 5) || '',
    }
  }

  // The list row is enough to render the table, but the detail view and the
  // edit form both read fields only the single-row select returns, so they open
  // on the list row and then fill in from getById.
  const openDetails = useCallback(async (schedule) => {
    setSelected(schedule)
    setDetail(schedule)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await scheduleService.getById(schedule.id)
      if (response.success && response.data) {
        setDetail(response.data)
      } else {
        setDetailError(response.message || 'Failed to load schedule details')
      }
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Failed to load schedule details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetails = useCallback(() => {
    setSelected(null)
    setDetail(null)
    setDetailError('')
    setDetailLoading(false)
  }, [])

  function handleOpenAdd() {
    setEditingSchedule(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setEditLoading(false)
    setShowForm(true)
  }

  async function handleOpenEdit(schedule) {
    setEditingSchedule(schedule)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setEditLoading(true)
    setShowForm(true)
    try {
      const response = await scheduleService.getById(schedule.id)
      if (response.success && response.data) {
        setFormData(toFormData(response.data))
      } else {
        setError(response.message || 'Failed to load schedule')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedule')
    } finally {
      setEditLoading(false)
    }
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditLoading(false)
  }

  function validate() {
    const errors = {}

    if (!formData.section_id) errors.section_id = 'Select a section.'
    if (!formData.room_id) errors.room_id = 'Select a room.'
    if (!formData.subject_name.trim()) errors.subject_name = 'Subject name is required.'
    if (formData.day_of_week === '') errors.day_of_week = 'Select a day.'
    if (!formData.start_time) errors.start_time = 'Start time is required.'
    if (!formData.end_time) errors.end_time = 'End time is required.'
    if (formData.start_time && formData.end_time && formData.end_time <= formData.start_time) {
      errors.end_time = 'End time must be after the start time.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (editLoading) return
    if (!validate()) return
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        ...formData,
        day_of_week: parseInt(formData.day_of_week, 10),
      }

      const response = editingSchedule
        ? await scheduleService.update(editingSchedule.id, payload)
        : await scheduleService.create(payload)

      if (!response.success) {
        setError(response.message || 'Failed to save schedule')
        return
      }

      handleCloseForm()
      await fetchSchedules()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save schedule')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set())
      return !on
    })
  }

  function toggleScheduleSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedSchedules = schedules.filter((schedule) => selectedIds.has(schedule.id))

  const allVisibleSelected =
    filteredSchedules.length > 0 &&
    filteredSchedules.every((schedule) => selectedIds.has(schedule.id))

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        filteredSchedules.forEach((schedule) => next.delete(schedule.id))
      } else {
        filteredSchedules.forEach((schedule) => next.add(schedule.id))
      }
      return next
    })
  }

  /** Bulk delete — same per-schedule endpoint, run in parallel. */
  async function handleBulkDelete() {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedSchedules.map((schedule) => scheduleService.delete(schedule.id))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${selectedSchedules.length} schedules could not be deleted.`)
      }
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      await fetchSchedules()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete schedules')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Schedules"
        subtitle="Manage class schedules and room assignments"
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
              Add schedule
            </Button>
          </>
        }
      />

      {error && !showForm && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {selectMode && selectedSchedules.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium text-ink">{selectedSchedules.length} selected</span>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <Button
            size="sm"
            variant="danger"
            icon={biTrash}
            onClick={() => setBulkDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      )}

      <TableCard
        title="Class schedules"
        subtitle={`${filteredSchedules.length} of ${schedules.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search section, room, subject…"
        loading={loading}
        isEmpty={filteredSchedules.length === 0}
        empty={
          <EmptyState
            icon="bi-calendar3"
            title="No schedules found"
            description={
              searchTerm
                ? 'No schedules match your search.'
                : 'Create a schedule to link a section to a room.'
            }
          />
        }
      >
        <ScrollX minW="58rem">
          <Table>
            <THead>
              <tr>
                {selectMode && (
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all schedules"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                    />
                  </TH>
                )}
                <TH>Section</TH>
                <TH>Room</TH>
                <TH>Subject</TH>
                <TH>Instructor</TH>
                <TH>Day</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {filteredSchedules.map((schedule) => (
                <TR
                  key={schedule.id}
                  className={selectMode ? undefined : 'cursor-pointer'}
                  title={selectMode ? undefined : 'View schedule details'}
                  onClick={() =>
                    selectMode ? toggleScheduleSelection(schedule.id) : openDetails(schedule)
                  }
                >
                  {selectMode && (
                    <TD onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select schedule ${schedule.id}`}
                        checked={selectedIds.has(schedule.id)}
                        onChange={() => toggleScheduleSelection(schedule.id)}
                        className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                      />
                    </TD>
                  )}
                  <TD className="font-medium">{sectionLabel(schedule.section)}</TD>
                  <TD className="tabular">{schedule.room?.room_code || '—'}</TD>
                  <TD>{schedule.subject_name}</TD>
                  <TD>{schedule.educator?.name || '—'}</TD>
                  <TD className="whitespace-nowrap">{dayName(schedule.day_of_week)}</TD>
                  <TD className="tabular whitespace-nowrap">{formatTime(schedule.start_time)}</TD>
                  <TD className="tabular whitespace-nowrap">{formatTime(schedule.end_time)}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(schedule.is_active))} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      <Modal
        open={Boolean(selected)}
        onClose={closeDetails}
        title="Schedule details"
        size="lg"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              const target = detail || selected
              closeDetails()
              handleOpenEdit(target)
            }}
          >
            Edit schedule
          </Button>
        }
      >
        {selected && detail && (
          <div className="flex flex-col gap-6">
            {detailError && (
              <Alert tone="bad" onDismiss={() => setDetailError('')}>
                {detailError}
              </Alert>
            )}

            <DetailList
              items={[
                { label: 'Section', value: sectionLabel(detail.section) },
                detail.section?.shift && {
                  label: 'Shift',
                  value: (
                    <Badge tone={detail.section.shift === 'day' ? 'info' : 'warn'}>
                      {detail.section.shift === 'day' ? 'Day' : 'Night'}
                    </Badge>
                  ),
                },
                detail.section?.mayor_name && { label: 'Mayor', value: detail.section.mayor_name },
                { label: 'Room', value: detail.room?.room_code || '—' },
                detail.room?.floor && { label: 'Floor', value: detail.room.floor },
                { label: 'Subject', value: detail.subject_name },
                { label: 'Instructor', value: detail.educator?.name || '—' },
                detail.educator?.department && { label: 'Department', value: detail.educator.department },
                { label: 'Day', value: dayName(detail.day_of_week) },
                {
                  label: 'Time',
                  value: `${formatTime(detail.start_time)} – ${formatTime(detail.end_time)}`,
                },
                {
                  label: 'Status',
                  value: <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(detail.is_active))} />,
                },
                { label: 'Created', value: formatDateTime(detail.created_at) },
                { label: 'Last updated', value: formatDateTime(detail.updated_at) },
              ]}
            />

            {detailLoading && <LoadingBlock label="Loading schedule…" compact />}
          </div>
        )}
      </Modal>

      <Modal
        open={showForm}
        onClose={handleCloseForm}
        title={editingSchedule ? 'Edit schedule' : 'Add schedule'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseForm} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="schedule-form"
              loading={submitting}
              disabled={editLoading}
            >
              {editingSchedule ? 'Update schedule' : 'Create schedule'}
            </Button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          {editLoading ? (
            <LoadingBlock label="Loading schedule…" />
          ) : (
            <>
              <div className="form-grid">
                <Select
                  label="Section"
                  required
                  value={formData.section_id}
                  onChange={(event) => update('section_id', event.target.value)}
                  error={fieldErrors.section_id}
                  placeholder="Select a section"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {sectionLabel(section)} ({section.shift})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Room"
                  required
                  value={formData.room_id}
                  onChange={(event) => update('room_id', event.target.value)}
                  error={fieldErrors.room_id}
                  placeholder="Select a room"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_code}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Subject"
                  required
                  value={formData.subject_name}
                  onChange={(event) => update('subject_name', event.target.value)}
                  error={fieldErrors.subject_name}
                />
                <Select
                  label="Instructor"
                  value={formData.educator_id}
                  onChange={(event) => update('educator_id', event.target.value)}
                  placeholder="Select an instructor"
                >
                  {educators.map((educator) => (
                    <option key={educator.id} value={educator.id}>
                      {educator.name} ({educator.department})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="form-grid-3">
                <Select
                  label="Day"
                  required
                  value={formData.day_of_week}
                  onChange={(event) => update('day_of_week', event.target.value)}
                  error={fieldErrors.day_of_week}
                  placeholder="Select a day"
                  options={DAY_NAMES_LIST.map((day, index) => ({ value: String(index), label: day }))}
                />
                <Input
                  label="Start time"
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(event) => update('start_time', event.target.value)}
                  error={fieldErrors.start_time}
                />
                <Input
                  label="End time"
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(event) => update('end_time', event.target.value)}
                  error={fieldErrors.end_time}
                />
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkSaving}
        title={`Delete ${selectedSchedules.length} schedule${selectedSchedules.length === 1 ? '' : 's'}`}
        description="Permanently delete the selected schedules? Recorded occupations keep their history but stop naming the class. This cannot be undone."
        confirmLabel="Delete schedules"
        tone="bad"
      />

      {/* The section and room lists are already on this page, so the import
          reuses them rather than fetching a second copy to validate against. */}
      <SchedulesBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchSchedules}
        sections={sections}
        rooms={rooms}
      />
    </>
  )
}
