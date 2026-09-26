import { Container, Card, CardBody, CardHeader, Table, InputGroup, FormControl, Badge, Button, Modal, Form, Alert, Spinner, Row, Col } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biSearch, biEye, biCheck, biX, biPen, biTrash, biCheckCircleFill, biXCircleFill } from '../../utils/icons'
import { reportService } from '../../services/reportService'

const statusColors = { pending: 'warning', reviewed: 'info', resolved: 'success', rejected: 'danger' }

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const response = await reportService.getAll()
      if (response.success) {
        setReports(response.data)
      } else {
        setError(response.message || 'Failed to load reports')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const filteredReports = reports.filter(r => 
    r.section?.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.room?.room_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reason?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleStatusChange = async (reportId, newStatus) => {
    setUpdating(true)
    try {
      const response = await reportService.updateStatus(reportId, newStatus, adminNote)
      if (response.success) {
        fetchReports()
        setAdminNote('')
      } else {
        setError(response.message || 'Failed to update status')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNote = async () => {
    if (!selectedReport) return
    setUpdating(true)
    try {
      const response = await reportService.updateStatus(selectedReport.id, selectedReport.status, adminNote)
      if (response.success) {
        fetchReports()
        setShowModal(false)
        setAdminNote('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Reports</h1>
            <p className="text-muted mb-0">Manage room cleanliness reports</p>
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
          <h1 className="h3 mb-0">Reports</h1>
          <p className="text-muted mb-0">Manage room cleanliness reports</p>
        </div>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Reports</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search reports..." 
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
                  <th>Time</th>
                  <th>Section</th>
                  <th>Room</th>
                  <th>Reason</th>
                  <th>Image</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.reported_at ? new Date(report.reported_at).toLocaleDateString() : 'N/A'}</td>
                    <td>{report.reported_at ? new Date(report.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>{report.section?.section_name ? `${report.section.program} ${report.section.year_level}${report.section.section_name}` : 'N/A'}</td>
                    <td>{report.room?.room_code || 'N/A'}</td>
                    <td>{report.reason?.name || 'N/A'}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" onClick={() => { setSelectedReport(report); setShowModal(true); setAdminNote(report.admin_note || ''); }}>
                        <i className={`bi ${biEye} me-1`}></i> View
                      </Button>
                    </td>
                    <td><Badge bg={statusColors[report.status] || 'secondary'}>{report.status}</Badge></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {report.status === 'pending' && (
                          <>
                            <Button variant="outline-success" onClick={() => handleStatusChange(report.id, 'reviewed')} title="Mark Reviewed" disabled={updating}><i className={`bi ${biCheck}`}></i></Button>
                            <Button variant="outline-danger" onClick={() => handleStatusChange(report.id, 'rejected')} title="Reject" disabled={updating}><i className={`bi ${biX}`}></i></Button>
                          </>
                        )}
                        {report.status === 'reviewed' && (
                          <>
                            <Button variant="outline-success" onClick={() => handleStatusChange(report.id, 'resolved')} title="Resolve" disabled={updating}><i className={`bi ${biCheck}`}></i></Button>
                            <Button variant="outline-warning" onClick={() => handleStatusChange(report.id, 'pending')} title="Reopen" disabled={updating}><i className={`bi ${biPen}`}></i></Button>
                          </>
                        )}
                        <Button variant="outline-primary" onClick={() => { setSelectedReport(report); setShowModal(true); setAdminNote(report.admin_note || ''); }} title="View Details"><i className={`bi ${biEye}`}></i></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => { setShowModal(false); setSelectedReport(null); setAdminNote(''); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Report Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <strong>Date:</strong> {selectedReport.reported_at ? new Date(selectedReport.reported_at).toLocaleDateString() : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Time:</strong> {selectedReport.reported_at ? new Date(selectedReport.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Section:</strong> {selectedReport.section?.section_name ? `${selectedReport.section.program} ${selectedReport.section.year_level}${selectedReport.section.section_name}` : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Room:</strong> {selectedReport.room?.room_code || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Reason:</strong> {selectedReport.reason?.name || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Other Reason:</strong> {selectedReport.other_reason || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Status:</strong> <Badge bg={statusColors[selectedReport.status] || 'secondary'}>{selectedReport.status}</Badge>
                </Col>
              </Row>
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1">{selectedReport.description || 'No description'}</p>
              </div>
              <div className="mb-3">
                <strong>Image Proof:</strong>
                <div className="mt-2">
                  {selectedReport.image_url ? (
                    <img src={selectedReport.image_url} alt="Report proof" className="img-fluid rounded" style={{ maxHeight: '300px' }} />
                  ) : (
                    <p className="text-muted">No image</p>
                  )}
                </div>
              </div>
              <hr />
              <div className="mb-3">
                <Form.Label>Admin Note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add admin note..."
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedReport(null); setAdminNote(''); }}>Close</Button>
          <Button variant="primary" disabled={updating} onClick={handleSaveNote}>
            {updating ? <Spinner size="sm" /> : 'Save Note'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}