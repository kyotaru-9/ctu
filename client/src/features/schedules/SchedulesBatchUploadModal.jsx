import { useMemo, useState } from 'react'
import { DAY_NAMES_LIST, sectionLabel } from '../../lib/format'
import { scheduleService } from '../../services/scheduleService'
import { Badge, Select } from '../../components/ui'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose. A file typed by hand in Excel
 * arrives as "Room Code", "ROOM_CODE" or "Room" depending on who made it, and
 * rejecting the whole import over capitalisation is not a useful trade. The bare
 * "from"/"to" are left out even though they read well for a time column: they are
 * common enough as ordinary words to capture the wrong column by accident.
 */
const COLUMN_ALIASES = {
  room_code: ['room', 'room code', 'room_code', 'roomcode', 'room number', 'code'],
  subject: ['subject', 'subject name', 'subject_name', 'course', 'course title'],
  instructor: ['instructor', 'instructor name', 'instructor_name', 'teacher', 'faculty'],
  day: ['day', 'days', 'day of week', 'day_of_week', 'weekday'],
  start: ['start', 'start time', 'start_time', 'from time', 'time start'],
  end: ['end', 'end time', 'end_time', 'to time', 'time end'],
}

// Instructor is the only optional column, matching the single-schedule form: a
// class can sit in the timetable before its instructor has been decided.
const REQUIRED_COLUMNS = ['room_code', 'subject', 'day', 'start', 'end']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['room', 'subject', 'instructor', 'day', 'start', 'end'],
  ['202', 'MMW', 'Domnena Anog', 3, '0700', '1200'],
]

/**
 * Reads a time the way a hand-made sheet writes one: 0700, 700, 07:00 and 7:00,
 * each of them with or without AM/PM. The meridiem case is not hypothetical —
 * a column Excel has formatted as a time is read back as its display text, so
 * "7:00 PM" is what a 24-hour author actually typed into that column.
 * Returns HH:MM, or null if the value is not a real time of day.
 */
function normalizeTime(value) {
  const text = String(value ?? '').trim()
  const meridiem = /(am|pm)/i.exec(text)?.[1]?.toLowerCase()
  const digits = (meridiem ? text.replace(/[ap]m/i, '') : text).replace(/[:\s]/g, '')

  // A bare hour is only allowed alongside AM/PM, since "7" alone is not a time.
  const hourOnly = Boolean(meridiem) && /^\d{1,2}$/.test(digits)
  if (!hourOnly && !/^\d{3,4}$/.test(digits)) return null

  let hours = digits.length === 3 ? `0${digits[0]}` : digits.padStart(2, '0').slice(0, 2)
  const minutes = digits.length <= 2 ? '00' : digits.slice(-2)

  if (meridiem) {
    const hour = Number(hours)
    if (hour < 1 || hour > 12) return null
    // 12 AM is midnight and 12 PM is noon, so neither simply gains or loses 12.
    if (meridiem === 'am') {
      hours = hour === 12 ? '00' : hours
    } else {
      hours = hour === 12 ? '12' : String(hour + 12).padStart(2, '0')
    }
  } else if (Number(hours) > 23) {
    return null
  }

  if (Number(minutes) > 59) return null

  return `${hours}:${minutes}`
}

/**
 * Batch schedule import. Every row becomes one class for the chosen section.
 *
 * `uniqueBy` is deliberately absent. The duplicate rule is a room being occupied
 * at the same time on the same day, and the sheet's day and time columns are
 * normalised before they are stored — so "0700" and "07:00" are the same slot and
 * only the server, holding the normalised values, can compare them correctly.
 */
export default function SchedulesBatchUploadModal({ open, onClose, onImported, sections, rooms }) {
  const [sectionId, setSectionId] = useState('')

  const roomCodes = useMemo(() => new Set(rooms.map((room) => room.room_code)), [rooms])

  /**
   * Normalises one parsed row and names the problem that would stop it importing.
   * Runs over the whole preview, so a bad row is visible before anything is sent
   * rather than coming back as a failure after the fact.
   */
  function reviewRow(row, allRows) {
    const missing = REQUIRED_COLUMNS.filter((column) => !row[column])
    if (missing.length) return { ...row, issue: `Missing ${missing.join(', ')}` }

    /*
       An unknown room code fails the whole file, so the codes are gathered across
       every row rather than tested one at a time. Naming them all here is what
       lets the admin fix the sheet in one pass, instead of discovering the next
       bad room on the next upload.
    */
    const unknown = [
      ...new Set(allRows.map((entry) => entry.room_code).filter((code) => code && !roomCodes.has(code))),
    ]
    if (unknown.length) {
      return {
        ...row,
        issue: unknown.length === 1 ? `Unknown room ${unknown[0]}` : `Unknown rooms ${unknown.join(', ')}`,
      }
    }

    const day = Number(row.day)
    const start = normalizeTime(row.start)
    const end = normalizeTime(row.end)

    const problem = !Number.isInteger(day) || day < 1 || day > 7
      ? `Day must be 1 to 7, got "${row.day}"`
      : !start
        ? `Could not read start time "${row.start}"`
        : !end
          ? `Could not read end time "${row.end}"`
          : end <= start
            ? 'End time is not after the start time'
            : null

    // day_number and the normalised times ride along so the preview and the
    // payload can show and send what will actually be stored.
    return { ...row, issue: problem, day_number: day, start_time: start, end_time: end }
  }

  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload schedules"
      entityLabel="schedule"
      pluralLabel="schedules"
      intro={
        <>
          The first sheet needs a header row with <strong>room</strong>, <strong>subject</strong>,{' '}
          <strong>instructor</strong>, <strong>day</strong>, <strong>start</strong> and{' '}
          <strong>end</strong>. Each row becomes one class for the section chosen above.{' '}
          <strong>Room</strong> must match a room code that already exists — if any code is unknown,
          nothing is imported. <strong>Day</strong> runs from <strong>1 = Sunday</strong> to{' '}
          <strong>7 = Saturday</strong>, and a time can be written <strong>0700</strong>,{' '}
          <strong>07:00</strong> or <strong>7:00 PM</strong>.
        </>
      }
      contextSlot={
        <Select
          label="Section"
          required
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          placeholder="Select the section these schedules belong to"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {sectionLabel(section)} ({section.shift})
            </option>
          ))}
        </Select>
      }
      contextReady={Boolean(sectionId)}
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['room', 'subject', 'instructor', 'day', 'start', 'end']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-schedules-template.xlsx"
      columns={[
        { field: 'room_code', label: 'Room', className: 'tabular font-medium' },
        { field: 'subject', label: 'Subject' },
        { field: 'instructor', label: 'Instructor' },
        {
          field: 'day',
          label: 'Day',
          // The day number is shown resolved to its name. A row that failed has
          // already been named in the first column, so this does not repeat it.
          render: (row) =>
            row.day_number >= 1 && row.day_number <= 7 ? (
              <Badge tone="info">
                {DAY_NAMES_LIST[row.day_number - 1]} ({row.day_number})
              </Badge>
            ) : (
              row.day || '—'
            ),
        },
        {
          field: 'start_time',
          label: 'Start',
          className: 'tabular',
          render: (row) => row.start_time || row.start || '—',
        },
        {
          field: 'end_time',
          label: 'End',
          className: 'tabular',
          render: (row) => row.end_time || row.end || '—',
        },
      ]}
      reviewRow={reviewRow}
      buildPayload={(row) => ({
        room_code: row.room_code,
        subject: row.subject,
        instructor: row.instructor,
        day: Number(row.day),
        start: row.start_time,
        end: row.end_time,
      })}
      submit={async (rows) => {
        const response = await scheduleService.batchCreate(sectionId, rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import schedules"
    />
  )
}