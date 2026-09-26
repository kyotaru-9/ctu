import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import { currentDayIndex, formatTime, todayIso, welcomeText } from '../../lib/format'
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
  StatCard,
  StatGrid,
} from '../../components/ui'

export default function SpecialDashboard() {
  const { user } = useAuth()
  const [todaysSchedule, setTodaysSchedule] = useState([])
  const [submissionStatus, setSubmissionStatus] = useState({ before: null, after: null })
  const [compliance, setCompliance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const today = currentDayIndex()
        const [scheduleRes, submissionsRes] = await Promise.all([
          scheduleService.getMySchedules(),
          submissionService.getMySubmissions(),
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
        subtitle={welcomeText(user, 'Special')}
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <StatGrid columns={4} className="mb-6">
        <StatCard
          label="Today's classes"
          value={todaysSchedule.length}
          icon="bi bi-calendar3"
          tone="accent"
        />
        <StatCard
          label="Before submitted"
          value={submissionStatus.before ? 1 : 0}
          icon="bi bi-check-circle-fill"
          tone={submissionStatus.before ? 'ok' : 'neutral'}
        />
        <StatCard
          label="After pending"
          value={submissionStatus.after ? 0 : 1}
          icon="bi bi-clock"
          tone={submissionStatus.after ? 'ok' : 'warn'}
        />
        <StatCard
          label="Compliance"
          value={`${compliance}%`}
          icon="bi bi-graph-up"
          tone="info"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&rsquo;s schedule</CardTitle>
            <Link
              to="/special/schedule"
              className="text-sm font-medium text-accent transition-opacity hover:opacity-75"
            >
              View all
            </Link>
          </CardHeader>

          {todaysSchedule.length === 0 ? (
            <EmptyState
              compact
              icon="bi bi-calendar3"
              title="No classes today"
              description="You have no scheduled classes for today."
            />
          ) : (
            <ul className="-mx-4 flex flex-col sm:-mx-5">
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
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  to: '/special/before',
                  label: 'Before',
                  icon: 'bi bi-camera-fill',
                  done: submissionStatus.before,
                },
                {
                  to: '/special/after',
                  label: 'After',
                  icon: 'bi bi-clipboard-check',
                  done: submissionStatus.after,
                },
              ].map(({ to, label, icon, done }) => (
                <Link
                  key={label}
                  to={to}
                  className="rounded-md border border-line bg-surface-sunken p-4 text-center transition-colors hover:border-line-strong hover:bg-line/40"
                >
                  <IconTile icon={icon} tone={done ? 'ok' : 'neutral'} size="sm" className="mx-auto mb-3" />
                  <p className="text-sm font-medium text-ink">{label}</p>
                  <p className="mt-1.5">
                    <Badge tone={done ? 'ok' : 'warn'}>{done ? 'Completed' : 'Pending'}</Badge>
                  </p>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <Button as={Link} to="/special/before" variant="primary" size="lg" icon="bi bi-camera-fill" block>
              Submit before photo
            </Button>
            <Button as={Link} to="/special/after" variant="accent-outline" icon="bi bi-clipboard-check" block>
              Submit after photo
            </Button>
            <Button as={Link} to="/special/reports" variant="secondary" icon="bi bi-exclamation-triangle" block>
              Report a problem
            </Button>
            <Button as={Link} to="/special/history" variant="ghost" icon="bi bi-clock-history" block>
              View history
            </Button>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center justify-center gap-5 py-6 sm:flex-row">
            <ComplianceRing value={compliance} />
            <div className="text-center sm:text-start">
              <p className="text-sm font-medium text-ink">Section compliance rate</p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Based on the before and after photos submitted today against your scheduled
                classes.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
