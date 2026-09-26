import { Container, Card, CardBody, CardHeader, Table, InputGroup, FormControl, Badge, Button, Modal, Spinner, Alert, Row, Col } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biSearch, biEye, biPerson, biCalendar } from '../../utils/icons'
import { auditService } from '../../services/auditService'

export default function AdminAuditLogs() {
  const [auditLogs, setAuditLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await auditService.getAll()
      if (response.success) {
        setAuditLogs(response.data)
      } else {
        setError(response.message || 'Failed to load audit logs')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const filteredLogs = auditLogs.filter(log => 
    log.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Audit Logs</h1>
            <p className="text-muted mb-0">Track system activities and administrative actions</p>
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
          <h1 className="h3 mb-0">Audit Logs</h1>
          <p className="text-muted mb-0">Track system activities and administrative actions</p>
        </div>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">System Activity Log</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search logs..." 
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
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>IP Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.created_at ? new Date(log.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>{log.user?.full_name || 'System'}</td>
                    <td><Badge bg="primary">{log.action}</Badge></td>
                    <td>{log.entity_type || 'N/A'}</td>
                    <td>{log.description}</td>
                    <td className="text-muted small">{log.ip_address || 'N/A'}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" onClick={() => { setSelectedLog(log); setShowModal(true); }}>
                        <i className={`bi ${biEye} me-1`}></i> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => { setShowModal(false); setSelectedLog(null); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Audit Log Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <div>
              <Row className="g-3">
                <Col md={6}>
                  <strong>Date:</strong> {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>User:</strong> {selectedLog.user?.full_name || 'System'}
                </Col>
                <Col md={6}>
                  <strong>Action:</strong> <Badge bg="primary">{selectedLog.action}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Entity:</strong> {selectedLog.entity_type || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>Entity ID:</strong> {selectedLog.entity_id || 'N/A'}
                </Col>
                <Col md={6}>
                  <strong>IP Address:</strong> {selectedLog.ip_address || 'N/A'}
                </Col>
                <Col md={12}>
                  <strong>Description:</strong> {selectedLog.description}
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedLog(null); }}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}