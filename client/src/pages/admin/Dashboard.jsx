import { Container, Row, Col, Card, CardBody, Button, Spinner } from 'react-bootstrap'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect } from 'react'
import { biPeople, biDoorOpen, biCalendar, biClipboard, biExclamation, biGraph, biJournal, biSettings, biCheckCircle, biClock } from '../../utils/icons'
import { analyticsService } from '../../services/analyticsService'
import { occupationService } from '../../services/occupationService'

const quickActions = [
  { label: 'Manage Sections', href: '/admin/students', icon: biPeople },
  { label: 'Manage Rooms', href: '/admin/rooms', icon: biDoorOpen },
  { label: 'Manage Schedules', href: '/admin/schedules', icon: biCalendar },
  { label: 'View Occupations', href: '/admin/occupations', icon: biClipboard },
  { label: 'View Reports', href: '/admin/reports', icon: biExclamation },
  { label: 'Analytics', href: '/admin/analytics', icon: biGraph },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: biJournal },
  { label: 'Settings', href: '/admin/settings', icon: biSettings },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalSections: 0,
    totalRooms: 0,
    todaysOccupations: 0,
    completed: 0,
    pending: 0,
    reports: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [overview, occupations] = await Promise.all([
          analyticsService.getOverview(),
          occupationService.getAll({ date: new Date().toISOString().split('T')[0] })
        ])

        if (overview.success && occupations.success) {
          const todayOccupations = occupations.data || []
          const completed = todayOccupations.filter(o => o.status === 'completed').length
          const active = todayOccupations.filter(o => o.status === 'active').length

          setStats({
            totalSections: overview.data?.totalSections || 0,
            totalRooms: overview.data?.totalRooms || 0,
            todaysOccupations: todayOccupations.length,
            completed: completed,
            pending: active,
            reports: overview.data?.totalReports || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statCards = [
    { label: 'Total Sections', value: stats.totalSections, icon: biPeople, color: 'primary' },
    { label: 'Total Rooms', value: stats.totalRooms, icon: biDoorOpen, color: 'success' },
    { label: "Today's Occupations", value: stats.todaysOccupations, icon: biCalendar, color: 'info' },
    { label: 'Completed', value: stats.completed, icon: biCheckCircle, color: 'success' },
    { label: 'In Progress', value: stats.pending, icon: biClock, color: 'warning', textColor: 'dark' },
    { label: 'Reports', value: stats.reports, icon: biExclamation, color: 'danger' },
  ]

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Dashboard</h1>
            <p className="text-muted mb-0">Welcome back, {user?.full_name || 'Administrator'}</p>
          </div>
        </div>
        <div className="d-flex justify-content-center my-5">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-0">Dashboard</h1>
          <p className="text-muted mb-0">Welcome back, {user?.full_name || 'Administrator'}</p>
        </div>
      </div>
      
      <Row className="g-3 mb-4">
        {statCards.map((stat, index) => (
          <Col key={index} xs={6} md={4} lg={2}>
            <Card className="stat-card h-100 border-0 shadow-sm">
              <CardBody className="d-flex flex-column align-items-center text-center p-3">
                <div className={`stat-icon bg-${stat.color} bg-gradient text-white mb-2`}>
                  <i className={`bi ${stat.icon}`}></i>
                </div>
                <div className={`fw-bold fs-3 ${stat.textColor || ''}`}>{stat.value}</div>
                <div className="text-muted small">{stat.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      
      <Card className="shadow-sm border-0">
        <CardBody>
          <h5 className="mb-3">Quick Actions</h5>
          <Row className="g-3">
            {quickActions.map((action, index) => (
              <Col key={index} xs={6} md={3}>
                <a href={action.href} className="text-decoration-none">
                  <Card className="h-100 border-0 shadow-sm hover-shadow transition">
                    <CardBody className="d-flex flex-column align-items-center text-center p-3">
                      <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-2" style={{ width: '50px', height: '50px' }}>
                        <i className={`bi ${action.icon} text-primary`} style={{ fontSize: '1.5rem' }}></i>
                      </div>
                      <div className="fw-medium text-dark small">{action.label}</div>
                    </CardBody>
                  </Card>
                </a>
              </Col>
            ))}
          </Row>
        </CardBody>
      </Card>
    </Container>
  )
}