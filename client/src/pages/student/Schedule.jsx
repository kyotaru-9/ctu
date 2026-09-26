import { Container, Card, CardBody, CardHeader, Table, Badge, Row, Col, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { biCalendar, biClock, biDoorOpen, biPerson, biQRCode } from '../../utils/icons'
import { scheduleService } from '../../services/scheduleService'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StudentSchedule() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await scheduleService.getMySchedules()
        console.log('Schedule response:', response)
        console.log('First schedule item:', response.data?.[0])
        if (response.success) {
          setSchedules(response.data || [])
        } else {
          setError(response.message || 'Failed to load schedule')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load schedule')
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [])

  const today = new Date().getDay()

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Schedule</h1>
            <p className="text-muted mb-0">View your class schedule</p>
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
          <h1 className="h3 mb-0">Schedule</h1>
          <p className="text-muted mb-0">View your class schedule</p>
        </div>
      </div>
      
      <Row className="g-3 mb-4">
        {days.map((day, index) => (
          <Col key={index} xs={6} md={4} lg={2}>
            <Card className={`h-100 ${index === today ? 'border-primary' : ''}`}>
              <CardBody className="text-center py-3">
                <div className={`fw-bold ${index === today ? 'text-primary' : ''}`}>{day.substring(0, 3)}</div>
                <div className={`small ${index === today ? 'text-primary' : 'text-muted'}`}>{day}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      
      <Card className="shadow-sm border-0">
        <CardHeader>
          <h5 className="mb-0">Weekly Schedule</h5>
        </CardHeader>
        <CardBody>
          <div className="table-responsive">
            <Table hover striped className="mb-0">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Instructor</th>
                  <th>Room</th>
                  <th>Section</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => (
                  <tr key={item.id} className={item.day_of_week === today ? 'table-primary' : ''}>
                    <td>
                      <strong>{days[item.day_of_week]}</strong>
                      {item.day_of_week === today && <Badge bg="primary" className="ms-2">Today</Badge>}
                    </td>
                    <td>{item.start_time} - {item.end_time}</td>
                    <td>{item.subject_name}</td>
                    <td>{item.instructor_name}</td>
                    <td>{item.rooms?.room_name}</td>
                    <td>{item.sections?.section_name ? `${item.sections.program} ${item.sections.year_level}${item.sections.section_name}` : 'N/A'}</td>
                    <td><Badge bg="primary">Scheduled</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
      
      <Card className="shadow-sm border-0 mt-3">
        <CardHeader>
          <h5 className="mb-0">Today's Classes</h5>
        </CardHeader>
        <CardBody>
          {schedules.filter(s => s.day_of_week === today).map((item) => (
            <Card key={item.id} className="mb-2">
              <CardBody className="py-3">
                <Row className="align-items-center">
                  <Col md={3} className="text-center text-md-start">
                    <div className="bg-primary bg-gradient text-white rounded p-3">
                      <div className="fw-bold">{item.start_time}</div>
                      <small>{item.end_time}</small>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h6 className="mb-1">{item.subject_name}</h6>
                    <p className="mb-1 text-muted small">
                      <i className={`bi ${biPerson} me-1`}></i> {item.instructor_name}
                    </p>
                    <p className="mb-0 text-muted small">
                      <i className={`bi ${biDoorOpen} me-1`}></i> {item.rooms?.room_name}
                    </p>
                  </Col>
                  <Col md={3} className="text-center text-md-end">
                    <Link to="/student/scan" className="btn btn-primary">
                      <i className={`bi ${biQRCode} me-1`}></i> Scan QR
                    </Link>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          ))}
          {schedules.filter(s => s.day_of_week === today).length === 0 && (
            <div className="text-center py-4 text-muted">
              <i className={`bi ${biCalendar} fs-1`}></i>
              <p className="mt-2">No classes scheduled for today</p>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  )
}