import { useCallback, useEffect, useMemo, useState } from 'react'
import { roomService } from '../../services/roomService'
import { scheduleService } from '../../services/scheduleService'
import { sectionService } from '../../services/sectionService'
import { biEye, biPencil, biPlus, biToggleOff, biToggleOn, biTrash } from '../../utils/icons'
import { DAY_NAMES_LIST, dayName, formatDateTime, formatTime, sectionLabel } from '../../lib/format'
import {
  ACTIVE_STATUS,
  ActionButton,
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
  RowActions,
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
  instructor_name: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([])
  const [sections, setSections] = useState([])
  const [rooms, setRooms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulesRes, sectionsRes, roomsRes] = await Promise.all([
        scheduleService.getAll(),
        sectionService.getAll(),
        roomService.getAll(),
      ])
      if (schedulesRes.success) setSchedules(schedulesRes.data)
      if (sectionsRes.success) setSections(sectionsRes.data)
      if (roomsRes.success) setRooms(roomsRes.data)
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
        schedule.instructor_name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [schedules, searchTerm])

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  function toFormData(schedule) {
    return {
      section_id: schedule.section_id || '',
      room_id: schedule.room_id || '',
      subject_name: schedule.subject_name || '',
      instructor_name: schedule.instructor_name || '',
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
    setError('')
    setEditLoading(false)
    setShowForm(true)
  }

  async function handleOpenEdit(schedule) {
    setEditingSchedule(schedule)
    setFormData(BLANK_FORM)
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

  async function handleSubmit(event) {
    event.preventDefault()
    if (editLoading) return
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

  async function handleToggleStatus(schedule) {
    try {
      const response = await scheduleService.update(schedule.id, { is_active: !schedule.is_active })
      if (response.success) await fetchSchedules()
    } catch {
      // Non-critical.
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await scheduleService.delete(deleteTarget.id)
      if (response.success) await fetchSchedules()
    } catch {
      // Ignore.
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Schedules"
        subtitle="Manage class schedules and room assignments"
        actions={
          <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
            Add schedule
          </Button>
        }
      />

      {error && !showForm && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
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
                <TH>Section</TH>
                <TH>Room</TH>
                <TH>Subject</TH>
                <TH>Instructor</TH>
                <TH>Day</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredSchedules.map((schedule) => (
                <TR key={schedule.id}>
                  <TD className="font-medium">{sectionLabel(schedule.section)}</TD>
                  <TD className="tabular">{schedule.room?.room_code || '—'}</TD>
                  <TD>{schedule.subject_name}</TD>
                  <TD>{schedule.instructor_name || '—'}</TD>
                  <TD className="whitespace-nowrap">{dayName(schedule.day_of_week)}</TD>
                  <TD className="tabular whitespace-nowrap">{formatTime(schedule.start_time)}</TD>
                  <TD className="tabular whitespace-nowrap">{formatTime(schedule.end_time)}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(schedule.is_active))} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for ${schedule.subject_name}`}>
                      <ActionButton
                        icon={biEye}
                        label="View schedule details"
                        tone="accent"
                        onClick={() => openDetails(schedule)}
                      />
                      <ActionButton
                        icon={biPencil}
                        label="Edit schedule"
                        tone="accent"
                        onClick={() => handleOpenEdit(schedule)}
                      />
                      <ActionButton
                        icon={schedule.is_active ? biToggleOff : biToggleOn}
                        label={schedule.is_active ? 'Deactivate schedule' : 'Activate schedule'}
                        tone={schedule.is_active ? 'bad' : 'ok'}
                        onClick={() => handleToggleStatus(schedule)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete schedule"
                        tone="bad"
                        onClick={() => setDeleteTarget(schedule)}
                      />
                    </RowActions>
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
          <>
            <Button variant="secondary" onClick={closeDetails}>
              Close
            </Button>
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
          </>
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
                detail.room?.room_name && { label: 'Room name', value: detail.room.room_name },
                detail.room?.building && { label: 'Building', value: detail.room.building },
                detail.room?.floor && { label: 'Floor', value: detail.room.floor },
                { label: 'Subject', value: detail.subject_name },
                { label: 'Instructor', value: detail.instructor_name },
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
                  placeholder="Select a room"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_code} — {room.room_name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Subject"
                  required
                  value={formData.subject_name}
                  onChange={(event) => update('subject_name', event.target.value)}
                />
                <Input
                  label="Instructor"
                  value={formData.instructor_name}
                  onChange={(event) => update('instructor_name', event.target.value)}
                />
              </div>

              <div className="form-grid-3">
                <Select
                  label="Day"
                  required
                  value={formData.day_of_week}
                  onChange={(event) => update('day_of_week', event.target.value)}
                  placeholder="Select a day"
                  options={DAY_NAMES_LIST.map((day, index) => ({ value: String(index), label: day }))}
                />
                <Input
                  label="Start time"
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(event) => update('start_time', event.target.value)}
                />
                <Input
                  label="End time"
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(event) => update('end_time', event.target.value)}
                />
              </div>
            </>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete schedule"
        description={
          deleteTarget
            ? `Delete the ${deleteTarget.subject_name} schedule for ${sectionLabel(deleteTarget.section)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete schedule"
      />
    </>
  )
}
