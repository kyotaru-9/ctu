import { Container, Card, CardBody, CardHeader, Button, Table, Modal, Form, InputGroup, FormControl, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biPlus, biSearch, biPencil, biTrash, biEye, biCalendar, biToggleOn, biToggleOff } from '../../utils/icons'
import { scheduleService } from '../../services/scheduleService'
import { sectionService } from '../../services/sectionService'
import { roomService } from '../../services/roomService'

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([])
  const [sections, setSections] = useState([])
  const [rooms, setRooms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    section_id: '',
    room_id: '',
    subject_name: '',
    instructor_name: '',
    day_of_week: '',
    start_time: '',
    end_time: ''
  })

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const [schedulesRes, sectionsRes, roomsRes] = await Promise.all([
        scheduleService.getAll(),
        sectionService.getAll(),
        roomService.getAll()
      ])
      if (schedulesRes.success) setSchedules(schedulesRes.data)
      if (sectionsRes.success) setSections(sectionsRes.data)
      if (roomsRes.success) setRooms(roomsRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const filteredSchedules = schedules.filter(s => 
    s.section?.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.room?.room_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenAddModal = () => {
    setEditingSchedule(null)
    setFormData({
      section_id: '',
      room_id: '',
      subject_name: '',
      instructor_name: '',
      day_of_week: '',
      start_time: '',
      end_time: ''
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      section_id: schedule.section_id || '',
      room_id: schedule.room_id || '',
      subject_name: schedule.subject_name || '',
      instructor_name: schedule.instructor_name || '',
      day_of_week: schedule.day_of_week !== undefined ? String(schedule.day_of_week) : '',
      start_time: schedule.start_time || '',
      end_time: schedule.end_time || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        section_id: formData.section_id,
        room_id: formData.room_id,
        subject_name: formData.subject_name,
        instructor_name: formData.instructor_name,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time
      }

      if (editingSchedule) {
        const response = await scheduleService.update(editingSchedule.id, payload)
        if (response.success) {
          fetchSchedules()
          setShowModal(false)
        } else {
          setError(response.message || 'Failed to update schedule')
        }
      } else {
        const response = await scheduleService.create(payload)
        if (response.success) {
          fetchSchedules()
          setShowModal(false)
        } else {
          setError(response.message || 'Failed to create schedule')
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (schedule) => {
    try {
      const response = await scheduleService.update(schedule.id, { is_active: !schedule.is_active })
      if (response.success) {
        fetchSchedules()
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleDelete = async () => {
    if (!editingSchedule) return
    try {
      const response = await scheduleService.delete(editingSchedule.id)
      if (response.success) {
        fetchSchedules()
      }
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    } finally {
      setShowModal(false)
    }
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Schedules</h1>
            <p className="text-muted mb-0">Manage class schedules and room assignments</p>
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
          <h1 className="h3 mb-0">Schedules</h1>
          <p className="text-muted mb-0">Manage class schedules and room assignments</p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <i className={`bi ${biPlus} me-1`}></i> Add Schedule
        </Button>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Class Schedules</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search schedules..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </CardHeader>
        <CardBody>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <div className="table-responsive">
            <Table hover striped className="mb-0">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Room</th>
                  <th>Subject</th>
                  <th>Instructor</th>
                  <th>Day</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>{schedule.section?.section_name ? `${schedule.section.program} ${schedule.section.year_level}${schedule.section.section_name}` : 'N/A'}</td>
                    <td>{schedule.room?.room_code || 'N/A'}</td>
                    <td>{schedule.subject_name}</td>
                    <td>{schedule.instructor_name || '-'}</td>
                    <td>{days[schedule.day_of_week]}</td>
                    <td>{schedule.start_time}</td>
                    <td>{schedule.end_time}</td>
                    <td><Badge bg={schedule.is_active ? 'success' : 'secondary'}>{schedule.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Button variant="outline-secondary" onClick={() => handleOpenEditModal(schedule)} title="Edit"><i className={`bi ${biPencil}`}></i></Button>
                        <Button variant={schedule.is_active ? 'outline-danger' : 'outline-success'} onClick={() => handleToggleStatus(schedule)} title={schedule.is_active ? 'Deactivate' : 'Activate'}>
                          <i className={`bi ${schedule.is_active ? biToggleOff : biToggleOn}`}></i>
                        </Button>
                        <Button variant="outline-danger" onClick={() => { setEditingSchedule(schedule); setShowModal(true); }} title="Delete"><i className={`bi ${biTrash}`}></i></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} id="schedule-form">
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Section <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  as="select" 
                  value={formData.section_id} 
                  onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
                  required
                >
                  <option value="">Select Section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.program} {s.year_level}{s.section_name} ({s.shift})
                    </option>
                  ))}
                </FormControl>
              </Col>
              <Col md={6}>
                <Form.Label>Room <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  as="select" 
                  value={formData.room_id} 
                  onChange={(e) => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.room_code} - {r.room_name}
                    </option>
                  ))}
                </FormControl>
              </Col>
              <Col md={6}>
                <Form.Label>Subject <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.subject_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Instructor</Form.Label>
                <FormControl 
                  value={formData.instructor_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, instructor_name: e.target.value }))}
                />
              </Col>
              <Col md={4}>
                <Form.Label>Day <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  as="select" 
                  value={formData.day_of_week} 
                  onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: e.target.value }))}
                  required
                >
                  {days.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </FormControl>
              </Col>
              <Col md={4}>
                <Form.Label>Start Time <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  type="time" 
                  value={formData.start_time} 
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>End Time <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  type="time" 
                  value={formData.end_time} 
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  required
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" disabled={submitting} type="submit" form="schedule-form">
            {submitting ? <Spinner size="sm" /> : (editingSchedule ? 'Update' : 'Create')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}