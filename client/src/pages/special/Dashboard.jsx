import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { submissionService } from '../../services/submissionService'
import { formatTime, welcomeText } from '../../lib/format'
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
        const response = await submissionService.getDashboardData()
        if (cancelled) return

        if (response.success) {
          const { todaysSchedule, submissionStatus: status } = response.data
          setTodaysSchedule(todaysSchedule || [])
          setSubmissionStatus(status || { before: null, after: null })

          // Calculate compliance
          const totalExpected = (todaysSchedule?.length || 0) * 2
          const submittedCount = (status.before ? 1 : 0) + (status.after ? 1 : 0)
          setCompliance(
            totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 0
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
        <StatCard label="Today's classes" value={todaysSchedule.length} />
        <StatCard label="Before submitted" value={submissionStatus.before ? 1 : 0} />
        <StatCard label="After pending" value={submissionStatus.after ? 0 : 1} />
        <StatCard label="Compliance" value={`${compliance}%`} />
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
                        {item.educator?.name || '—'} · {item.rooms?.room_code || '—'}
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
