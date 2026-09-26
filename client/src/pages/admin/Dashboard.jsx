import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { analyticsService } from '../../services/analyticsService'
import { occupationService } from '../../services/occupationService'
import {
  biCalendar,
  biClipboard,
  biDoorOpen,
  biExclamation,
  biGraph,
  biJournal,
  biPeople,
  biSettings,
} from '../../utils/icons'
import {
  BentoGrid,
  Card,
  CardBody,
  CardTitle,
  IconTile,
  PageHeader,
  Progress,
  SkeletonBento,
  SkeletonPage,
  SkeletonPanel,
  StatCard,
} from '../../components/ui'

const quickActions = [
  { label: 'Manage Sections', to: '/admin/students', icon: biPeople },
  { label: 'Manage Rooms', to: '/admin/rooms', icon: biDoorOpen },
  { label: 'Manage Schedules', to: '/admin/schedules', icon: biCalendar },
  { label: 'View Occupations', to: '/admin/occupations', icon: biClipboard },
  { label: 'View Reports', to: '/admin/reports', icon: biExclamation },
  { label: 'Analytics', to: '/admin/analytics', icon: biGraph },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: biJournal },
  { label: 'Settings', to: '/admin/settings', icon: biSettings },
]

const EMPTY_STATS = {
  totalSections: 0,
  totalRooms: 0,
  todaysOccupations: 0,
  completed: 0,
  pending: 0,
  reports: 0,
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchDashboardData() {
      try {
        const [overview, occupations] = await Promise.all([
          analyticsService.getOverview(),
          occupationService.getAll({ date: new Date().toISOString().split('T')[0] }),
        ])
        if (cancelled) return

        if (overview.success && occupations.success) {
          const todayOccupations = occupations.data || []
          setStats({
            totalSections: overview.data?.totalSections || 0,
            totalRooms: overview.data?.totalRooms || 0,
            todaysOccupations: todayOccupations.length,
            completed: todayOccupations.filter((item) => item.status === 'completed').length,
            pending: todayOccupations.filter((item) => item.status === 'active').length,
            reports: overview.data?.totalReports || 0,
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
        subtitle={`Welcome back, ${user?.full_name || 'Administrator'}`}
      />

      {loading ? (
        <SkeletonPage>
          <SkeletonBento
            rows={3}
            cells={[
              'col-span-2 row-span-2',
              '',
              '',
              '',
              '',
              'col-span-2 lg:col-span-4',
            ]}
            className="mb-8"
          />
          <SkeletonPanel lines={5} />
        </SkeletonPage>
      ) : (
        <>
          <BentoGrid rows={3} className="mb-8">
            <StatCard
              variant="feature"
              className="col-span-2 row-span-2"
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
            <StatCard label="Completed" value={stats.completed} />
            <StatCard label="In Progress" value={stats.pending} />
            <StatCard label="Total Sections" value={stats.totalSections} />
            <StatCard label="Total Rooms" value={stats.totalRooms} />
            <StatCard
              className="col-span-2 lg:col-span-4"
              label="Reports"
              value={stats.reports}
            />
          </BentoGrid>

          <Card>
            <CardBody>
              <CardTitle className="mb-4">Quick actions</CardTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-lg border border-line bg-surface p-4 text-center transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm"
                  >
                    <IconTile icon={action.icon} tone="accent" size="sm" />
                    <span className="text-sm font-medium text-ink">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </>
  )
}
