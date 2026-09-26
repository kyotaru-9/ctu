import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, ListGroup, ListGroupItem, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect } from 'react'
import { biCalendar, biCamera, biImage, biExclamation, biClockHistory, biCheckCircle, biClock, biGraph } from '../../utils/icons'
import { scheduleService } from '../../services/scheduleService'
import { submissionService } from '../../services/submissionService'
import { reportService } from '../../services/reportService'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SpecialDashboard() {
  const { user } = useAuth()
  const [todaysSchedule, setTodaysSchedule] = useState([])
  const [submissionStatus, setSubmissionStatus] = useState({ before: null, after: null })
  const [compliance, setCompliance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date().getDay()
        const [scheduleRes, submissionsRes] = await Promise.all([
          scheduleService.getMySchedules(),
          submissionService.getMySubmissions()
        ])

        console.log('Special Dashboard scheduleRes:', scheduleRes)
        console.log('Special Dashboard submissionsRes:', submissionsRes)

        if (scheduleRes.success) {
          const allSchedules = scheduleRes.data || []
          setTodaysSchedule(allSchedules.filter(s => s.day_of_week === today))
        }

        if (submissionsRes.success) {
          const submissions = submissionsRes.data || []
          const todayStr = new Date().toISOString().split('T')[0]
          const todaysSubmissions = submissions.filter(s => 
            s.submitted_at && s.submitted_at.startsWith(todayStr)
          )
          const before = todaysSubmissions.find(s => s.submission_type === 'before')
          const after = todaysSubmissions.find(s => s.submission_type === 'after')
          setSubmissionStatus({ before, after })
          
          // Calculate compliance from submissions
          const totalExpected = allSchedules.length * 2 // before + after for each class
          const totalSubmitted = submissions.filter(s => 
            s.submitted_at && s.submitted_at.startsWith(todayStr)
          ).length
          setCompliance(totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0)
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Dashboard</h1>
            <p className="text-muted mb-0">Welcome, {user?.section?.section_name || 'Section'} (Special)</p>
          </div>
        </div>
        <div className="d-flex justify-content-center my-5">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  const today = new Date().getDay()

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-0">Dashboard</h1>
          <p className="text-muted mb-0">Welcome, {user?.section?.section_name || 'Section'} (Special)</p>
        </div>
      </div>
      
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-warning bg-gradient text-dark me-3">
                <i className={`bi ${biCalendar}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{todaysSchedule.length}</div>
                <div className="text-muted small">Today's Classes</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-success bg-gradient text-white me-3">
                <i className={`bi ${biCheckCircle}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{submissionStatus.before ? 1 : 0}</div>
                <div className="text-muted small">Completed Before</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-info bg-gradient text-white me-3">
                <i className={`bi ${biClock}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{submissionStatus.after ? 0 : 1}</div>
                <div className="text-muted small">Pending After</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-primary bg-gradient text-white me-3">
                <i className={`bi ${biGraph}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{compliance}%</div>
                <div className="text-muted small">Compliance</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Today's Schedule</h5>
              <Link to="/special/schedule" className="btn btn-sm btn-outline-primary">View All</Link>
            </CardHeader>
            <CardBody>
              {todaysSchedule.length > 0 ? (
                <ListGroup flush>
                  {todaysSchedule.map((item) => (
                    <ListGroupItem key={item.id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-medium">{item.subject_name}</div>
                        <small className="text-muted">{item.instructor_name} • {item.rooms?.room_name}</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-medium">{item.start_time} - {item.end_time}</div>
                        <Badge bg="primary">Scheduled</Badge>
                      </div>
                    </ListGroupItem>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center py-4 text-muted">
                  <i className={`bi ${biCalendar} fs-1`}></i>
                  <p className="mt-2">No classes scheduled for today</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Submission Status</h5>
            </CardHeader>
            <CardBody>
              <div className="d-flex gap-3">
                <Link to="/special/before" className="flex-grow-1 text-center p-3 bg-light rounded text-decoration-none">
                  <i className={`bi ${biCamera} ${submissionStatus.before ? 'text-success' : 'text-muted'} fs-1`}></i>
                  <div className="fw-bold mt-1">Before</div>
                  <Badge bg={submissionStatus.before ? 'success' : 'secondary'}>
                    {submissionStatus.before ? 'Completed' : 'Pending'}
                  </Badge>
                </Link>
                <Link to="/special/after" className="flex-grow-1 text-center p-3 bg-light rounded text-decoration-none">
                  <i className={`bi ${biImage} ${submissionStatus.after ? 'text-success' : 'text-warning'} fs-1`}></i>
                  <div className="fw-bold mt-1">After</div>
                  <Badge bg={submissionStatus.after ? 'success' : 'warning'}>
                    {submissionStatus.after ? 'Completed' : 'Pending'}
                  </Badge>
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Quick Actions</h5>
            </CardHeader>
            <CardBody>
              <div className="d-grid gap-2">
                <Link to="/special/before" className="btn btn-success">
                  <i className={`bi ${biCamera} me-2`}></i> Submit Before Photo
                </Link>
                <Link to="/special/after" className="btn btn-warning text-dark">
                  <i className={`bi ${biImage} me-2`}></i> Submit After Photo
                </Link>
                <Link to="/special/reports" className="btn btn-outline-warning">
                  <i className={`bi ${biExclamation} me-2`}></i> Report Room Problem
                </Link>
                <Link to="/special/history" className="btn btn-outline-secondary">
                  <i className={`bi ${biClockHistory} me-2`}></i> View History
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Section Compliance</h5>
            </CardHeader>
            <CardBody className="text-center py-4">
              <div className="mb-3">
                <svg width="120" height="120" className="transform" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e9ecef" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#198754" strokeWidth="10" 
                    strokeDasharray="314" strokeDashoffset={314 - (314 * compliance / 100)} strokeLinecap="round" />
                </svg>
                <div className="position-absolute top-50 start-50 translate-middle">
                  <div className="fw-bold fs-2">{compliance}%</div>
                </div>
              </div>
              <p className="text-muted mb-0">Section Compliance Rate</p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}