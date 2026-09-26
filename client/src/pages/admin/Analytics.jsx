import { Container, Card, CardBody, CardHeader, Row, Col, Table, Badge, Spinner, Alert } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { biPeople, biDoorOpen, biExclamation, biGraph, biCalendar, biCheckCircle, biXCircle } from '../../utils/icons'
import { analyticsService } from '../../services/analyticsService'

export default function AdminAnalytics() {
  const [overview, setOverview] = useState(null)
  const [sectionCompliance, setSectionCompliance] = useState([])
  const [roomIssues, setRoomIssues] = useState([])
  const [reportReasons, setReportReasons] = useState([])
  const [timeTrends, setTimeTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overviewRes, complianceRes, issuesRes, reasonsRes, trendsRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getSectionCompliance(),
          analyticsService.getRoomIssues(),
          analyticsService.getReportReasons(),
          analyticsService.getTrends()
        ])

        if (overviewRes.success) setOverview(overviewRes.data)
        if (complianceRes.success) setSectionCompliance(complianceRes.data)
        if (issuesRes.success) setRoomIssues(issuesRes.data)
        if (reasonsRes.success) setReportReasons(reasonsRes.data)
        if (trendsRes.success) setTimeTrends(trendsRes.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Analytics</h1>
            <p className="text-muted mb-0">Monitor cleanliness trends and compliance</p>
          </div>
        </div>
        <div className="d-flex justify-content-center my-5">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Analytics</h1>
            <p className="text-muted mb-0">Monitor cleanliness trends and compliance</p>
          </div>
        </div>
        <Alert variant="danger">{error}</Alert>
      </Container>
    )
  }

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-0">Analytics</h1>
          <p className="text-muted mb-0">Monitor cleanliness trends and compliance</p>
        </div>
      </div>
      
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-primary bg-gradient text-white me-3">
                <i className={`bi ${biPeople}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{overview?.totalSections || 0}</div>
                <div className="text-muted small">Active Sections</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-success bg-gradient text-white me-3">
                <i className={`bi ${biDoorOpen}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{overview?.totalRooms || 0}</div>
                <div className="text-muted small">Active Rooms</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-warning bg-gradient text-dark me-3">
                <i className={`bi ${biExclamation}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{overview?.totalReports || 0}</div>
                <div className="text-muted small">Total Reports</div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody className="d-flex align-items-center">
              <div className="stat-icon bg-info bg-gradient text-white me-3">
                <i className={`bi ${biGraph}`}></i>
              </div>
              <div>
                <div className="fw-bold fs-3">{overview?.avgCompliance || 0}%</div>
                <div className="text-muted small">Avg Compliance</div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Section Compliance</h5>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Expected</th>
                      <th>Completed</th>
                      <th>Missing</th>
                      <th>Late</th>
                      <th>Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionCompliance.map((s) => (
                      <tr key={s.section_id || s.section}>
                        <td><strong>{s.section_name || s.section}</strong></td>
                        <td>{s.expected || s.total_expected || 0}</td>
                        <td>{s.completed || s.total_completed || 0}</td>
                        <td className="text-danger">{s.missing || s.total_missing || 0}</td>
                        <td className="text-warning">{s.late || s.total_late || 0}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '6px' }}>
                              <div className={`progress-bar ${(s.compliance_rate || s.compliance) >= 90 ? 'bg-success' : (s.compliance_rate || s.compliance) >= 75 ? 'bg-warning' : 'bg-danger'}`} role="progressbar" style={{ width: `${(s.compliance_rate || s.compliance)}%` }}></div>
                            </div>
                            <span className="fw-medium">{(s.compliance_rate || s.compliance)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Room Issues</h5>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Total Reports</th>
                      <th>Most Common Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomIssues.map((r) => (
                      <tr key={r.room_id || r.room}>
                        <td><strong>{r.room_code || r.room}</strong></td>
                        <td>{r.total_reports || r.totalReports || 0}</td>
                        <td>{r.most_common_issue || r.commonIssue || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Report Reasons</h5>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportReasons.map((r) => (
                      <tr key={r.reason_id || r.reason}>
                        <td>{r.reason_name || r.reason}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress flex-grow-1 me-2" style={{ height: '6px', maxWidth: '150px' }}>
                              <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${r.count ? (r.count / (reportReasons.reduce((a, b) => a + b.count, 0)) * 100) : 0}%` }}></div>
                            </div>
                            <span className="fw-medium">{r.count || 0}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0">Time Trends</h5>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Reports</th>
                      <th>Submissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeTrends.map((t) => (
                      <tr key={t.period}>
                        <td><strong>{t.period}</strong></td>
                        <td>{t.reports || 0}</td>
                        <td>{t.submissions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}