import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { scheduleService } from '../../services/scheduleService'
import { biCalendar, biDoorOpen, biPerson, biQRCode } from '../../utils/icons'
import {
  DAY_NAMES_LIST,
  currentDayIndex,
  dayName,
  formatTime,
  sectionLabel,
} from '../../lib/format'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  IconTile,
  PageHeader,
  ScrollX,
  SkeletonPage,
  SkeletonTable,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '../../components/ui'

export default function StudentSchedule() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchSchedule() {
      try {
        const response = await scheduleService.getMySchedules()
        if (cancelled) return

        if (response.success) {
          setSchedules(response.data || [])
        } else {
          setError(response.message || 'Failed to load schedule')
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load schedule')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSchedule()
    return () => {
      cancelled = true
    }
  }, [])

  const today = currentDayIndex()
  const todaysClasses = useMemo(
    () => schedules.filter((item) => item.day_of_week === today),
    [schedules, today]
  )

  if (loading) return <SkeletonPage><SkeletonTable cols={5} rows={7} /></SkeletonPage>

  return (
    <>
      <PageHeader title="Schedule" subtitle="Your weekly class schedule" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {/* Week strip */}
      <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {DAY_NAMES_LIST.map((day, index) => {
          const isToday = index === today
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
                {schedules.some((item) => item.day_of_week === index)
                  ? `${schedules.filter((item) => item.day_of_week === index).length} class${
                      schedules.filter((item) => item.day_of_week === index).length > 1 ? 'es' : ''
                    }`
                  : '—'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Today's classes */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Today&rsquo;s classes</CardTitle>
          <Badge tone="accent">{dayName(today)}</Badge>
        </CardHeader>

        {todaysClasses.length === 0 ? (
          <EmptyState
            icon={biCalendar}
            title="No classes today"
            description="You have no scheduled classes for today."
          />
        ) : (
          <CardBody className="px-0 py-2">
            <ul className="flex flex-col">
              {todaysClasses.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 border-b border-line px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:px-5"
              >
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
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <IconTile icon={biPerson} size="xs" />
                      {item.instructor_name || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IconTile icon={biDoorOpen} size="xs" />
                      {item.rooms?.room_name || '—'}
                    </span>
                  </p>
                </div>

                <Button
                  as={Link}
                  to="/student/scan"
                  variant="primary"
                  icon={biQRCode}
                  className="shrink-0"
                >
                  Scan QR
                </Button>
              </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>

      {/* Full week */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">{schedules.length} classes per week</p>
        </CardHeader>

        {schedules.length === 0 ? (
          <EmptyState
            icon={biCalendar}
            title="No schedule yet"
            description="Your section has no classes scheduled."
          />
        ) : (
          <ScrollX minW="48rem">
            <Table>
              <THead>
                <tr>
                  <TH>Day</TH>
                  <TH>Time</TH>
                  <TH>Subject</TH>
                  <TH>Instructor</TH>
                  <TH>Room</TH>
                  <TH>Section</TH>
                </tr>
              </THead>
              <TBody>
                {schedules.map((item) => (
                  <TR key={item.id} active={item.day_of_week === today}>
                    <TD className="whitespace-nowrap font-medium">
                      {dayName(item.day_of_week)}
                      {item.day_of_week === today && (
                        <Badge tone="accent" className="ms-2">
                          Today
                        </Badge>
                      )}
                    </TD>
                    <TD className="tabular whitespace-nowrap">
                      {formatTime(item.start_time)} – {formatTime(item.end_time)}
                    </TD>
                    <TD>{item.subject_name}</TD>
                    <TD>{item.instructor_name || '—'}</TD>
                    <TD>{item.rooms?.room_name || '—'}</TD>
                    <TD className="text-ink-muted">{sectionLabel(item.sections)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </ScrollX>
        )}
      </Card>
    </>
  )
}
