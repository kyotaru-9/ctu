import { useCallback, useEffect, useMemo, useState } from 'react'
import { roomService } from '../../services/roomService'
import { scheduleService } from '../../services/scheduleService'
import { sectionService } from '../../services/sectionService'
import { biPencil, biPlus, biToggleOff, biToggleOn, biTrash } from '../../utils/icons'
import { DAY_NAMES_LIST, dayName, formatTime, sectionLabel } from '../../lib/format'
import {
  ACTIVE_STATUS,
  ActionButton,
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
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

  function handleOpenAdd() {
    setEditingSchedule(null)
    setFormData(BLANK_FORM)
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(schedule) {
    setEditingSchedule(schedule)
    setFormData({
      section_id: schedule.section_id || '',
      room_id: schedule.room_id || '',
      subject_name: schedule.subject_name || '',
      instructor_name: schedule.instructor_name || '',
      day_of_week: schedule.day_of_week !== undefined && schedule.day_of_week !== null
        ? String(schedule.day_of_week)
        : '',
      start_time: schedule.start_time?.slice(0, 5) || '',
      end_time: schedule.end_time?.slice(0, 5) || '',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

      setShowForm(false)
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
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingSchedule ? 'Edit schedule' : 'Add schedule'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="schedule-form" loading={submitting}>
              {editingSchedule ? 'Update schedule' : 'Create schedule'}
            </Button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

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
