import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { analyticsService } from '../../services/analyticsService'
import { excuseService } from '../../services/excuseService'
import { occupationService } from '../../services/occupationService'
import { reportService } from '../../services/reportService'
import { formatDate } from '../../lib/format'
import {
  biClipboard,
  biExclamation,
} from '../../utils/icons'
import {
  IconTile,
  PageHeader,
  Progress,
  SkeletonPage,
  SkeletonPanel,
  StatCard,
} from '../../components/ui'

const EMPTY_STATS = {
  todaysOccupations: 0,
  completed: 0,
  pending: 0,
  reports: 0,
  pendingReports: 0,
  pendingExcuses: 0,
}

/**
 * A queue an admin has to clear, surfaced on the dashboard rather than buried
 * in a list page. The count is the number waiting, and the whole tile links to
 * the filtered view that resolves it.
 */
function AttentionTile({ to, icon, tone, title, description, count, waitingLabel }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm"
    >
      <IconTile icon={icon} tone={tone} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-muted">{description}</span>
      </span>
      <span className="text-right">
        <span className="block text-xl font-semibold tabular text-ink">{count}</span>
        <span className="block text-[0.6875rem] tracking-wide text-ink-subtle uppercase">
          {waitingLabel}
        </span>
      </span>
    </Link>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const [overview, occupations, reports, pendingExcuses] = await Promise.all([
          analyticsService.getOverview(),
          occupationService.getAll({ date: new Date().toISOString().split('T')[0] }),
          reportService.getAll(),
          excuseService.getAll('pending'),
        ])
        if (cancelled) return

        if (overview.success && occupations.success) {
          const todayOccupations = occupations.data || []
          const allReports = reports.success ? reports.data || [] : []
          setStats({
            todaysOccupations: todayOccupations.length,
            completed: todayOccupations.filter((item) => item.status === 'completed').length,
            pending: todayOccupations.filter((item) => item.status === 'active').length,
            reports: overview.data?.totalReports || allReports.length,
            pendingReports: allReports.filter((report) => report.status === 'pending').length,
            pendingExcuses: pendingExcuses.success ? (pendingExcuses.data || []).length : 0,
          })
        }
      } catch {
        // Dashboard degrades to zeroed stats rather than an error screen.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDashboardData()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.full_name || 'Administrator'} · ${formatDate(new Date())}`}
      />

      {loading ? (
        <SkeletonPage>
          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            <SkeletonPanel lines={4} className="lg:col-span-2" />
            <SkeletonPanel lines={4} />
          </div>
          <SkeletonPanel lines={3} />
        </SkeletonPage>
      ) : (
        <>
          {/* Only the numbers that change what the admin does next: how much of
              today is done, and how much review work is queued. The breakdown
              numbers live in the hint and the attention tiles below. */}
          <div className="mb-8 grid gap-4 lg:grid-cols-3">
            <StatCard
              variant="feature"
              className="lg:col-span-2"
              label="Today's Occupations"
              value={stats.todaysOccupations}
              hint={`${stats.completed} completed · ${stats.pending} in progress`}
              footer={
                <Progress
                  value={stats.completed}
                  max={stats.todaysOccupations || 1}
                  tone="ok"
                  label="Share of today's occupations completed"
                />
              }
            />
            <StatCard
              label="Reports"
              value={stats.reports}
              hint={`${stats.pendingReports} awaiting review`}
            />
          </div>

          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-ink">Needs attention</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <AttentionTile
                to="/admin/excuse-requests"
                icon={biClipboard}
                tone={stats.pendingExcuses > 0 ? 'warn' : 'ok'}
                title="Excuse requests"
                description="Student exemption requests awaiting a decision"
                count={stats.pendingExcuses}
                waitingLabel="pending"
              />
              <AttentionTile
                to="/admin/reports"
                icon={biExclamation}
                tone={stats.pendingReports > 0 ? 'warn' : 'ok'}
                title="Room reports"
                description="Cleanliness and damage reports awaiting review"
                count={stats.pendingReports}
                waitingLabel="pending"
              />
            </div>
          </div>

        </>
      )}
    </>
  )
}
