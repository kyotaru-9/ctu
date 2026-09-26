import { Container, Card, CardBody, CardHeader, Table, Badge, Button, Modal, Spinner, Row, Col } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { biEye, biCamera, biImage, biCalendar, biClock, biCheckCircle, biXCircle } from '../../utils/icons'
import { submissionService } from '../../services/submissionService'

export default function SpecialHistory() {
  const [submissions, setSubmissions] = useState([])
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await submissionService.getMySubmissions()
        console.log('Special History response:', response)
        if (response.success) {
          // Server already returns grouped data, use it directly
          setSubmissions(response.data || [])
        } else {
          setError(response.message || 'Failed to load history')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const getStatus = (record) => {
    if (record.before && record.after) return { label: 'Completed', color: 'success' }
    if (record.before || record.after) return { label: 'Incomplete', color: 'warning' }
    return { label: 'No submissions', color: 'secondary' }
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Submission History</h1>
            <p className="text-muted mb-0">View your past room condition submissions</p>
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
          <h1 className="h3 mb-0">Submission History</h1>
          <p className="text-muted mb-0">View your past room condition submissions</p>
        </div>
      </div>
      
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      
      <Card className="shadow-sm border-0">
        <CardHeader>
          <h5 className="mb-0">All Submissions</h5>
        </CardHeader>
        <CardBody>
          {submissions.length > 0 ? (
            <div className="table-responsive">
              <Table hover striped className="mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Room</th>
                    <th>Subject</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((record, index) => {
                    const status = getStatus(record)
                    return (
                      <tr key={`${record.id}-${index}`}>
                        <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                        <td>{record.room?.room_code || 'N/A'}</td>
                        <td>{record.subject || 'N/A'}</td>
                        <td>
                          {record.before ? (
                            <>
                              <i className={`bi ${biCheckCircle} text-success me-1`}></i>
                              <small>{record.before.submitted_at ? new Date(record.before.submitted_at).toLocaleTimeString() : 'N/A'}</small>
                              <Badge bg={record.before.condition === 'clean' ? 'success' : 'danger'} className="ms-1">
                                {record.before.condition}
                              </Badge>
                            </>
                          ) : (
                            <i className={`bi ${biXCircle} text-danger`}></i>
                          )}
                        </td>
                        <td>
                          {record.after ? (
                            <>
                              <i className={`bi ${biCheckCircle} text-success me-1`}></i>
                              <small>{record.after.submitted_at ? new Date(record.after.submitted_at).toLocaleTimeString() : 'N/A'}</small>
                              <Badge bg={record.after.condition === 'clean' ? 'success' : 'danger'} className="ms-1">
                                {record.after.condition}
                              </Badge>
                            </>
                          ) : (
                            <i className={`bi ${biXCircle} text-danger`}></i>
                          )}
                        </td>
                        <td>
                          <Badge bg={status.color}>{status.label}</Badge>
                        </td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => { setSelectedRecord(record); setShowModal(true); }}>
                            <i className={`bi ${biEye} me-1`}></i> View
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className={`bi ${biCalendar} fs-1`}></i>
              <p className="mt-2">No submission history found</p>
            </div>
          )}
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => { setShowModal(false); setSelectedRecord(null); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Submission Details - {selectedRecord?.room?.room_code}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRecord && (
            <div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <strong>Date:</strong> {selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Room:</strong> {selectedRecord.room?.room_code || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Subject:</strong> {selectedRecord.subject || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Status:</strong> <Badge bg={getStatus(selectedRecord).color}>{getStatus(selectedRecord).label}</Badge>
                </Col>
              </Row>
              
              <Row className="g-3">
                <Col md={6}>
                  <Card className="h-100">
                    <CardHeader className="bg-light">
                      <h6 className="mb-0"><i className={`bi ${biCamera} me-1`}></i> Before Class</h6>
                    </CardHeader>
                    <CardBody>
                      {selectedRecord.before ? (
                        <>
                          <div className="text-center mb-3">
                            {selectedRecord.before.image_url ? (
                              <img 
                                src={selectedRecord.before.image_url} 
                                alt="Before Photo" 
                                className="img-fluid rounded" 
                                style={{ maxWidth: '200px', maxHeight: '150px' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.alt = 'Failed to load image'; e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="bg-light d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '200px', height: '150px' }}>
                                <span className="text-muted">Before Photo</span>
                              </div>
                            )}
                          </div>
                          <p className="mb-1"><strong>Time:</strong> {selectedRecord.before.submitted_at ? new Date(selectedRecord.before.submitted_at).toLocaleString() : 'N/A'}</p>
                          <p className="mb-1"><strong>Condition:</strong> <Badge bg={selectedRecord.before.condition === 'clean' ? 'success' : 'danger'}>{selectedRecord.before.condition}</Badge></p>
                          {selectedRecord.before.notes && <p className="mb-0"><strong>Notes:</strong> {selectedRecord.before.notes}</p>}
                        </>
                      ) : (
                        <p className="text-muted text-center">No before photo submitted</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <CardHeader className="bg-light">
                      <h6 className="mb-0"><i className={`bi ${biImage} me-1`}></i> After Class</h6>
                    </CardHeader>
                    <CardBody>
                      {selectedRecord.after ? (
                        <>
                          <div className="text-center mb-3">
                            {selectedRecord.after.image_url ? (
                              <img 
                                src={selectedRecord.after.image_url} 
                                alt="After Photo" 
                                className="img-fluid rounded" 
                                style={{ maxWidth: '200px', maxHeight: '150px' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.alt = 'Failed to load image'; e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="bg-light d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '200px', height: '150px' }}>
                                <span className="text-muted">After Photo</span>
                              </div>
                            )}
                          </div>
                          <p className="mb-1"><strong>Time:</strong> {selectedRecord.after.submitted_at ? new Date(selectedRecord.after.submitted_at).toLocaleString() : 'N/A'}</p>
                          <p className="mb-0"><strong>Condition:</strong> <Badge bg={selectedRecord.after.condition === 'clean' ? 'success' : 'danger'}>{selectedRecord.after.condition}</Badge></p>
                          {selectedRecord.after.notes && <p className="mb-0"><strong>Notes:</strong> {selectedRecord.after.notes}</p>}
                        </>
                      ) : (
                        <p className="text-muted text-center">No after photo submitted</p>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedRecord(null); }}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}