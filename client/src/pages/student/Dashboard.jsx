import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { submissionService } from '../../services/submissionService'
import {
  biCalendar,
  biCamera,
  biClockHistory,
  biExclamation,
  biQRCode,
} from '../../utils/icons'
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
  Skeleton,
  SkeletonPage,
  PageHeader,
} from '../../components/ui'

export default function StudentDashboard() {
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
          const { todaysSchedule, submissionStatus: status, compliance: comp } = response.data
          setTodaysSchedule(todaysSchedule || [])
          setSubmissionStatus(status || { before: null, after: null })
          setCompliance(comp || 0)
        } else {
          setError(response.message || 'Failed to load dashboard')
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardBody className="flex flex-col items-center justify-center gap-3 py-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2" aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="mx-auto h-8 w-12" />
                    <Skeleton className="mx-auto mt-2 h-2 w-20" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-3" aria-hidden="true">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-line bg-surface p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-2 h-2 w-24" />
                      </div>
                      <Skeleton className="h-2 w-12 shrink-0" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-md border border-line bg-surface-sunken p-4 text-center">
                    <Skeleton className="mx-auto h-10 w-10" />
                    <Skeleton className="mx-auto mt-3 h-3 w-16" />
                    <Skeleton className="mx-auto mt-2 h-2 w-20" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center justify-center gap-3 py-6">
            <ComplianceRing value={compliance} size="sm" />
            <p className="text-sm font-medium text-ink">{compliance}%</p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's stats</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-ink">{todaysSchedule.length}</p>
                <p className="mt-1 text-xs text-ink-muted">Today's classes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-ink">{submissionStatus.before ? 1 : 0}</p>
                <p className="mt-1 text-xs text-ink-muted">Before submitted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-ink">{submissionStatus.after ? 0 : 1}</p>
                <p className="mt-1 text-xs text-ink-muted">After pending</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
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
            <CardBody>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {todaysSchedule.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{item.subject_name}</p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {item.educator?.name || '—'}
                        </p>
                      </div>
                      <Badge tone="accent" className="shrink-0">
                        {formatTime(item.start_time)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <i className="bi bi-geo-alt" />
                        {item.rooms?.room_code || '—'}
                      </span>
                      <span>·</span>
                      <span>{formatTime(item.start_time)} – {formatTime(item.end_time)}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                  to: '/student/submit',
                  label: 'Before',
                  icon: biCamera,
                  done: submissionStatus.before,
                },
                {
                  to: '/student/submit',
                  label: 'After',
                  icon: biCamera,
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
      </div>
    </>
  )
}
