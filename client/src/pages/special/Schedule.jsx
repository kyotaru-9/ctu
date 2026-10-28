import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import { DAY_NAMES_LIST, currentDayIndex, dayName, formatTime, todayIso } from '../../lib/format'
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
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-4">
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Time</p>
                        <p className="mt-1 text-sm text-ink">{formatTime(item.start_time)} – {formatTime(item.end_time)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Subject</p>
                        <p className="mt-1 text-sm text-ink">{item.subject_name}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Instructor</p>
                        <p className="mt-1 text-sm text-ink">{item.educator?.name || item.educator_id || '—'}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Room</p>
                        <p className="mt-1 text-sm text-ink">{item.rooms?.room_code || '—'}</p>
                      </Card>
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
          <ScrollX minW="48rem">
            <Table>
              <THead>
                <tr>
                  <TH>Day</TH>
                  <TH>Time</TH>
                  <TH>Subject</TH>
                  <TH>Instructor</TH>
                  <TH>Room</TH>
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
                    <TD>{item.educator?.name || '—'}</TD>
                    <TD>{item.rooms?.room_code || '—'}</TD>
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
