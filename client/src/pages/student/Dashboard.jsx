import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { reportService } from '../../services/reportService'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import {
  biCalendar,
  biCamera,
  biClockHistory,
  biDoorOpen,
  biExclamation,
  biQRCode,
} from '../../utils/icons'
import { formatDateTime, formatTime, todayIso, welcomeText } from '../../lib/format'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ComplianceRing,
  EmptyState,
  IconTile,
  SkeletonCards,
  SkeletonPage,
  SkeletonPanel,
  PageHeader,
  REPORT_STATUS,
  StatCard,
  StatGrid,
  StatusBadge,
} from '../../components/ui'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [todaysSchedule, setTodaysSchedule] = useState([])
  const [submissionStatus, setSubmissionStatus] = useState({ before: null, after: null })
  const [recentReports, setRecentReports] = useState([])
  const [compliance, setCompliance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const today = new Date().getDay()
        const [scheduleRes, submissionsRes, reportsRes] = await Promise.all([
          scheduleService.getMySchedules(),
          submissionService.getMySubmissions(),
          reportService.getMyReports({ limit: 5 }),
        ])
        if (cancelled) return

        const allSchedules = scheduleRes.success ? scheduleRes.data || [] : []
        setTodaysSchedule(allSchedules.filter((item) => item.day_of_week === today))

        if (submissionsRes.success) {
          const submissions = submissionsRes.data || []
          const todayStr = todayIso()
          const todaysSubmissions = submissions.filter(
            (item) => item.submitted_at && item.submitted_at.startsWith(todayStr)
          )

          setSubmissionStatus({
            before: todaysSubmissions.find((item) => item.submission_type === 'before') ?? null,
            after: todaysSubmissions.find((item) => item.submission_type === 'after') ?? null,
          })

          const totalExpected = allSchedules.length * 2
          setCompliance(
            totalExpected > 0 ? Math.round((todaysSubmissions.length / totalExpected) * 100) : 0
          )
        }

        if (reportsRes.success) setRecentReports(reportsRes.data || [])
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboardData()
    return () => {
      cancelled = true
    }
  }, [])

  const currentRoom = useMemo(
    () => todaysSchedule[0]?.rooms ?? todaysSchedule[0]?.room ?? null,
    [todaysSchedule]
  )

  if (loading) {
    return (
      <SkeletonPage>
        <SkeletonCards count={4} columns={4} className="mb-6" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonPanel lines={7} className="lg:col-span-2" />
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={6} className="lg:col-span-2" />
          <SkeletonPanel lines={3} />
        </div>
      </SkeletonPage>
    )
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={welcomeText(user)}
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <StatGrid columns={4} className="mb-6">
        <StatCard label="Today's classes" value={todaysSchedule.length} />
        <StatCard label="Before submitted" value={submissionStatus.before ? 1 : 0} />
        <StatCard label="After pending" value={submissionStatus.after ? 0 : 1} />
        <StatCard label="Compliance" value={`${compliance}%`} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Today's schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&rsquo;s schedule</CardTitle>
            <Link
              to="/student/schedule"
              className="text-sm font-medium text-accent transition-opacity hover:opacity-75"
            >
              View all
            </Link>
          </CardHeader>

          {todaysSchedule.length === 0 ? (
            <EmptyState
              compact
              icon={biCalendar}
              title="No classes today"
              description="You have no scheduled classes for today."
            />
          ) : (
            <CardBody className="px-0 py-2">
              <ul className="flex flex-col">
                {todaysSchedule.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.subject_name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {item.instructor_name || '—'} · {item.rooms?.room_name || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="tabular text-sm text-ink">
                        {formatTime(item.start_time)} – {formatTime(item.end_time)}
                      </span>
                      <Badge tone="accent">Scheduled</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>

        {/* Current room */}
        <Card>
          <CardHeader>
            <CardTitle>Current room</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center text-center">
            <IconTile
              icon={biDoorOpen}
              tone={currentRoom ? 'accent' : 'neutral'}
              size="lg"
              className="mb-4"
            />
            {currentRoom ? (
              <>
                <p className="text-base font-semibold text-ink">{currentRoom.room_name}</p>
                <p className="tabular mt-1 text-sm text-ink-muted">{currentRoom.room_code}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {[currentRoom.building, currentRoom.floor && `Floor ${currentRoom.floor}`]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">No class scheduled</p>
            )}
          </CardBody>
        </Card>

        {/* Submission status */}
        <Card>
          <CardHeader>
            <CardTitle>Today&rsquo;s submissions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'before', label: 'Before', record: submissionStatus.before },
                { key: 'after', label: 'After', record: submissionStatus.after },
              ].map(({ key, label, record }) => (
                <div
                  key={key}
                  className="rounded-md border border-line bg-surface-sunken p-4 text-center"
                >
                  <IconTile
                    icon={biCamera}
                    tone={record ? 'ok' : 'neutral'}
                    size="sm"
                    className="mx-auto mb-3"
                  />
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="mt-1.5">
                    <Badge tone={record ? 'ok' : 'warn'}>
                      {record ? 'Completed' : 'Pending'}
                    </Badge>
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <Button as={Link} to="/student/scan" variant="primary" size="lg" icon={biQRCode} block>
              Scan room QR
            </Button>
            <Button as={Link} to="/student/submit" variant="accent-outline" icon={biCamera} block>
              Submit room condition
            </Button>
            <Button as={Link} to="/student/reports" variant="secondary" icon={biExclamation} block>
              Report a problem
            </Button>
            <Button as={Link} to="/student/history" variant="ghost" icon={biClockHistory} block>
              View history
            </Button>
          </CardBody>
        </Card>

        {/* Recent reports */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent reports</CardTitle>
            <Link
              to="/student/reports"
              className="text-sm font-medium text-accent transition-opacity hover:opacity-75"
            >
              View all
            </Link>
          </CardHeader>

          {recentReports.length === 0 ? (
            <EmptyState
              compact
              icon={biExclamation}
              title="No reports filed"
              description="Reports you file about a room will appear here."
            />
          ) : (
            <CardBody className="px-0 py-2">
              <ul className="flex flex-col">
                {recentReports.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {report.reason?.name || report.other_reason || 'Report'} in{' '}
                        {report.room?.room_code || '—'}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {formatDateTime(report.reported_at)}
                      </p>
                    </div>
                    <StatusBadge map={REPORT_STATUS} value={report.status} />
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center text-center">
            <ComplianceRing value={compliance} />
            <p className="mt-4 text-sm text-ink-muted">Section compliance rate</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
