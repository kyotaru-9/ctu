import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import { DAY_NAMES_LIST, DAY_SHORT, currentDayIndex, dayName, formatTime, sectionLabel, todayIso } from '../../lib/format'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  SkeletonPage,
  SkeletonTable,
  PageHeader,
  ScrollX,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '../../components/ui'

function WeeklyScheduleGrid({ schedules, today }) {
  // Generate 30-minute time slots from 7:00 AM to 6:00 PM
  function generateTimeSlots() {
    const slots = []
    for (let hour = 7; hour < 18; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`)
      slots.push(`${String(hour).padStart(2, '0')}:30`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Convert time string to minutes
  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Calculate how many 30-minute slots a schedule spans
  function getSlotSpan(schedule) {
    const startMins = timeToMinutes(schedule.start_time)
    const endMins = timeToMinutes(schedule.end_time)
    const duration = endMins - startMins
    return Math.max(1, Math.ceil(duration / 30))
  }

  // Get the starting row number (1-based) for a schedule
  function getStartRow(schedule) {
    const startTime = schedule.start_time
    return timeSlots.indexOf(startTime) + 1
  }

  // Group schedules by day
  const schedulesByDay = {}
  DAY_SHORT.forEach((_, dayIndex) => {
    schedulesByDay[dayIndex] = schedules.filter(s => s.day_of_week === dayIndex)
  })

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-8 bg-surface-sunken border-b border-line">
        <div className="p-1.5 text-[0.5625rem] font-semibold text-ink-muted uppercase tracking-wide border-r border-line">
          Time
        </div>
        {DAY_SHORT.map((day, index) => (
          <div
            key={day}
            className={`p-1.5 text-center text-[0.5625rem] font-semibold uppercase tracking-wide border-r border-line last:border-r-0 ${
              index === today ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div
        className="grid grid-cols-8"
        style={{
          gridTemplateRows: `repeat(${timeSlots.length}, 40px)`
        }}
      >
        {/* Time column */}
        <div className="border-r border-line bg-surface-sunken">
          {timeSlots.map((time) => (
            <div key={time} className="p-1.5 text-[0.625rem] text-ink-muted border-b border-line last:border-b-0">
              {formatTime(time)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAY_SHORT.map((day, dayIndex) => {
          const isToday = dayIndex === today
          const daySchedules = schedulesByDay[dayIndex] || []

          return (
            <div
              key={day}
              className={`border-r border-line last:border-r-0 relative ${
                isToday ? 'bg-accent-soft/20' : ''
              }`}
            >
              {/* Render schedule cards with grid positioning */}
              {daySchedules.map((schedule) => {
                const startRow = getStartRow(schedule)
                const span = getSlotSpan(schedule)

                return (
                  <div
                    key={schedule.id}
                    className="absolute inset-0 p-1 border border-line bg-surface shadow-xs"
                    style={{
                      top: `${(startRow - 1) * 40}px`,
                      height: `${span * 40}px`
                    }}
                  >
                    <p className="text-[0.625rem] font-medium text-ink truncate">{schedule.subject_name}</p>
                    <p className="mt-0.5 text-[0.5625rem] text-ink-muted truncate">
                      {schedule.educator?.name || '—'}
                    </p>
                    <p className="mt-0.5 text-[0.5625rem] text-ink-muted truncate">
                      {schedule.rooms?.room_code || '—'}
                    </p>
                    <p className="mt-0.5 text-[0.5rem] text-ink-subtle tabular">
                      {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SpecialSchedule() {
  const [schedules, setSchedules] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [scheduleRes, submissionsRes] = await Promise.all([
          scheduleService.getMySchedules(),
          submissionService.getMySubmissions(),
        ])
        if (cancelled) return

        if (scheduleRes.success) {
          setSchedules(scheduleRes.data || [])
        } else {
          setError(scheduleRes.message || 'Failed to load schedule')
        }

        if (submissionsRes.success) {
          setSubmissions(submissionsRes.data || [])
        }
      } catch (err) {
        if (cancelled) setError(err.response?.data?.message || 'Failed to load data')
      } finally {
        if (cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const today = currentDayIndex()
  const todaysClasses = schedules.filter((item) => item.day_of_week === today)

  const todayStr = todayIso()
  const todaysSubmissions = submissions.filter(
    (item) => item.date && item.date.startsWith(todayStr)
  )

  function hasSubmission(scheduleId, roomId, type) {
    return todaysSubmissions.some(
      (item) => {
        const matchesRoom = item.room?.id === roomId
        const submission = type === 'before' ? item.before : item.after
        const matchesType = submission !== null && submission !== undefined
        return matchesRoom && matchesType
      }
    )
  }

  if (loading) return <SkeletonPage><SkeletonTable cols={5} rows={7} /></SkeletonPage>

  return (
    <>
      <PageHeader title="Schedule" subtitle="Your weekly class schedule" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {DAY_NAMES_LIST.map((day, index) => {
          const isToday = index === today
          const count = schedules.filter((item) => item.day_of_week === index).length
          return (
            <div
              key={day}
              aria-current={isToday ? 'date' : undefined}
              className={
                isToday
                  ? 'rounded-md border border-accent bg-accent-soft px-2 py-3 text-center'
                  : 'rounded-md border border-line bg-surface px-2 py-3 text-center'
              }
            >
              <p
                className={
                  isToday
                    ? 'text-sm font-semibold text-accent-ink'
                    : 'text-sm font-medium text-ink-muted'
                }
              >
                {day.slice(0, 3)}
              </p>
              <p className="mt-0.5 text-[0.6875rem] text-ink-subtle">
                {count > 0 ? `${count} class${count > 1 ? 'es' : ''}` : '—'}
              </p>
            </div>
          )
        })}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Today&rsquo;s classes</CardTitle>
          <Badge tone="accent">{dayName(today)}</Badge>
        </CardHeader>

        {todaysClasses.length === 0 ? (
          <EmptyState
            icon="bi bi-calendar3"
            title="No classes today"
            description="You have no scheduled classes for today."
          />
        ) : (
          <CardBody className="px-0 py-2">
            <ul className="flex flex-col">
              {todaysClasses.map((item) => {
                const beforeDone = hasSubmission(item.id, item.rooms?.id, 'before')
                const afterDone = hasSubmission(item.id, item.rooms?.id, 'after')

                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:px-5"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="shrink-0 rounded-md bg-accent-soft px-4 py-2.5 text-center sm:w-28">
                        <p className="tabular text-sm font-semibold text-accent-ink">
                          {formatTime(item.start_time)}
                        </p>
                        <p className="tabular mt-0.5 text-xs text-ink-muted">
                          {formatTime(item.end_time)}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{item.subject_name}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {item.educator?.name || '—'} · {item.rooms?.room_code || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {beforeDone ? (
                        <Button
                          disabled
                          variant="secondary"
                          icon="bi bi-check-lg"
                          className="flex-1"
                        >
                          Done
                        </Button>
                      ) : (
                        <Button
                          as={Link}
                          to="/special/before"
                          state={{ schedule: item, room: item.rooms }}
                          variant="primary"
                          icon="bi bi-camera-fill"
                          className="flex-1"
                        >
                          Before photo
                        </Button>
                      )}
                      {afterDone ? (
                        <Button
                          disabled
                          variant="secondary"
                          icon="bi bi-check-lg"
                          className="flex-1"
                        >
                          Done
                        </Button>
                      ) : (
                        <Button
                          as={Link}
                          to="/special/after"
                          state={{ schedule: item, room: item.rooms }}
                          variant="secondary"
                          icon="bi bi-clipboard-check"
                          className="flex-1"
                        >
                          After photo
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">{schedules.length} classes per week</p>
        </CardHeader>

        {schedules.length === 0 ? (
          <EmptyState
            icon="bi bi-calendar3"
            title="No schedule yet"
            description="Your section has no classes scheduled."
          />
        ) : (
          <WeeklyScheduleGrid schedules={schedules} today={today} />
        )}
      </Card>
    </>
  )
}
