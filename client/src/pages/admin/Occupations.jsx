import { Container, Card, CardBody, CardHeader, Table, InputGroup, FormControl, Badge, Button, Spinner, Alert, Modal } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biSearch, biEye, biCheckCircleFill, biXCircleFill } from '../../utils/icons'
import { occupationService } from '../../services/occupationService'

const statusColors = { active: 'warning', completed: 'success', cancelled: 'danger' }

export default function AdminOccupations() {
  const [occupations, setOccupations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOccupation, setSelectedOccupation] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOccupations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await occupationService.getAll()
      if (response.success) {
        setOccupations(response.data)
      } else {
        setError(response.message || 'Failed to load occupations')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load occupations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOccupations()
  }, [fetchOccupations])

  const filteredOccupations = occupations.filter(o => 
    o.section?.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.room?.room_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.schedule?.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status) => {
    return <Badge bg={statusColors[status] || 'secondary'}>{status}</Badge>
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Occupations</h1>
            <p className="text-muted mb-0">View classroom occupation records</p>
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
          <h1 className="h3 mb-0">Occupations</h1>
          <p className="text-muted mb-0">View classroom occupation records</p>
        </div>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Occupation Records</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search occupations..." 
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
                  <th>Date</th>
                  <th>Section</th>
                  <th>Room</th>
                  <th>Subject</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOccupations.map((occ) => (
                  <tr key={occ.id}>
                    <td>{occ.occupation_date ? new Date(occ.occupation_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{occ.section?.section_name ? `${occ.section.program} ${occ.section.year_level}${occ.section.section_name}` : 'N/A'}</td>
                    <td>{occ.room?.room_code || 'N/A'}</td>
                    <td>{occ.schedule?.subject_name || 'N/A'}</td>
                    <td>{occ.started_at ? new Date(occ.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>{occ.ended_at ? new Date(occ.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>{occ.before_submitted ? <i className="bi bi-check-circle-fill text-success" /> : <i className="bi bi-x-circle-fill text-danger" />}</td>
                    <td>{occ.after_submitted ? <i className="bi bi-check-circle-fill text-success" /> : <i className="bi bi-x-circle-fill text-danger" />}</td>
                    <td>{getStatusBadge(occ.status)}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" onClick={() => { setSelectedOccupation(occ); setShowModal(true); }} title="View Details">
                        <i className={`bi ${biEye}`}></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <Modal show={showModal} onHide={() => { setShowModal(false); setSelectedOccupation(null); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Occupation Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOccupation && (
            <div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <strong>Date:</strong> {selectedOccupation.occupation_date ? new Date(selectedOccupation.occupation_date).toLocaleDateString() : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Status:</strong> {getStatusBadge(selectedOccupation.status)}
                </Col>
                <Col md={6}>
                  <strong>Section:</strong> {selectedOccupation.section?.section_name ? `${selectedOccupation.section.program} ${selectedOccupation.section.year_level}${selectedOccupation.section.section_name}` : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Room:</strong> {selectedOccupation.room?.room_code || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Subject:</strong> {selectedOccupation.schedule?.subject_name || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Instructor:</strong> {selectedOccupation.schedule?.instructor_name || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Started:</strong> {selectedOccupation.started_at ? new Date(selectedOccupation.started_at).toLocaleString() : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Ended:</strong> {selectedOccupation.ended_at ? new Date(selectedOccupation.ended_at).toLocaleString() : 'N/A'}
                </Col>
              </Row>
              <hr />
              <h6>Submissions</h6>
              <Row className="g-3">
                <Col md={6}>
                  <Card>
                    <CardHeader className="bg-light">
                      <h6 className="mb-0">Before Class</h6>
                    </CardHeader>
                    <CardBody>
                      {selectedOccupation.before_submitted ? (
                        <>
                          <p className="mb-1"><strong>Status:</strong> <Badge bg="success">Submitted</Badge></p>
                          <p className="mb-1"><strong>Time:</strong> {selectedOccupation.before_submitted_at ? new Date(selectedOccupation.before_submitted_at).toLocaleString() : 'N/A'}</p>
                          <p className="mb-0"><strong>Condition:</strong> {selectedOccupation.before_condition || 'N/A'}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not submitted</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <CardHeader className="bg-light">
                      <h6 className="mb-0">After Class</h6>
                    </CardHeader>
                    <CardBody>
                      {selectedOccupation.after_submitted ? (
                        <>
                          <p className="mb-1"><strong>Status:</strong> <Badge bg="success">Submitted</Badge></p>
                          <p className="mb-1"><strong>Time:</strong> {selectedOccupation.after_submitted_at ? new Date(selectedOccupation.after_submitted_at).toLocaleString() : 'N/A'}</p>
                          <p className="mb-0"><strong>Condition:</strong> {selectedOccupation.after_condition || 'N/A'}</p>
                        </>
                      ) : (
                        <p className="text-muted">Not submitted</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedOccupation(null); }}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}