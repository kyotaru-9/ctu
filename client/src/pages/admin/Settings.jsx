import { Container, Card, CardBody, CardHeader, Form, Button, Row, Col, InputGroup, FormControl, Alert, Spinner } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { biGear, biShield, biBell, biDatabase, biArrowRepeat, biPlus, biPencil, biTrash, biCheck, biX } from '../../utils/icons'
import { reportService } from '../../services/reportService'

export default function AdminSettings() {
  const [reportReasons, setReportReasons] = useState([])
  const [loadingReasons, setLoadingReasons] = useState(true)
  const [newReason, setNewReason] = useState('')
  const [editingReason, setEditingReason] = useState(null)
  const [editReasonName, setEditReasonName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const response = await reportService.getReasons()
        if (response.success) {
          setReportReasons(response.data)
        }
      } catch (err) {
        console.error('Failed to load report reasons:', err)
      } finally {
        setLoadingReasons(false)
      }
    }
    fetchReasons()
  }, [])

  const handleAddReason = async () => {
    if (!newReason.trim()) return
    setError('')
    try {
      const response = await reportService.createReason({ name: newReason.trim() })
      if (response.success) {
        setReportReasons([...reportReasons, response.data])
        setNewReason('')
      } else {
        setError(response.message || 'Failed to add reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add reason')
    }
  }

  const handleEditReason = (reason) => {
    setEditingReason(reason)
    setEditReasonName(reason.name)
  }

  const handleSaveEdit = async () => {
    if (!editingReason || !editReasonName.trim()) return
    setError('')
    try {
      const response = await reportService.updateReason(editingReason.id, { name: editReasonName.trim() })
      if (response.success) {
        setReportReasons(reportReasons.map(r => r.id === editingReason.id ? response.data : r))
        setEditingReason(null)
        setEditReasonName('')
      } else {
        setError(response.message || 'Failed to update reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update reason')
    }
  }

  const handleDeleteReason = async (reasonId) => {
    if (!window.confirm('Are you sure you want to delete this reason?')) return
    setError('')
    try {
      const response = await reportService.deleteReason(reasonId)
      if (response.success) {
        setReportReasons(reportReasons.filter(r => r.id !== reasonId))
      } else {
        setError(response.message || 'Failed to delete reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete reason')
    }
  }

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-0">Settings</h1>
          <p className="text-muted mb-0">Configure system preferences and options</p>
        </div>
      </div>
      
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
       
      <Row className="g-3">
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0"><i className={`bi ${biGear} me-2`}></i>General Settings</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label>System Name</Form.Label>
                    <FormControl defaultValue="CTU Clean-Track-Update" />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Institution</Form.Label>
                    <FormControl defaultValue="Cebu Technological University" />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Default Submission Time Limit (minutes)</Form.Label>
                    <FormControl type="number" defaultValue="30" min="1" max="120" />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Max Image Size (MB)</Form.Label>
                    <FormControl type="number" defaultValue="10" min="1" max="50" />
                  </Col>
                  <Col md={12}>
                    <Form.Label>Allowed Image Types</Form.Label>
                    <FormControl defaultValue="jpg, jpeg, png, webp" />
                    <Form.Text>Comma-separated list of allowed file extensions</Form.Text>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0"><i className={`bi ${biShield} me-2`}></i>Security Settings</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="form-check form-switch">
                      <FormControl type="checkbox" id="requireQR" defaultChecked />
                      <Form.Label className="form-check-label" htmlFor="requireQR">Require QR scan for submissions</Form.Label>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="form-check form-switch">
                      <FormControl type="checkbox" id="allowManualTime" defaultChecked />
                      <Form.Label className="form-check-label" htmlFor="allowManualTime">Allow manual time entry (Student Special)</Form.Label>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="form-check form-switch">
                      <FormControl type="checkbox" id="preventDuplicates" defaultChecked />
                      <Form.Label className="form-check-label" htmlFor="preventDuplicates">Prevent duplicate submissions</Form.Label>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="form-check form-switch">
                      <FormControl type="checkbox" id="requireImageProof" defaultChecked />
                      <Form.Label className="form-check-label" htmlFor="requireImageProof">Require image proof for reports</Form.Label>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="form-check form-switch">
                      <FormControl type="checkbox" id="enableNotifications" defaultChecked />
                      <Form.Label className="form-check-label" htmlFor="enableNotifications">Enable in-app notifications</Form.Label>
                    </div>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0"><i className={`bi ${biBell} me-2`}></i>Report Reasons</h5>
            </CardHeader>
            <CardBody>
              <p className="text-muted small mb-3">Manage predefined cleanliness report reasons</p>
              <div className="mb-3">
                <Form.Label>Add New Reason</Form.Label>
                <InputGroup>
                  <FormControl 
                    placeholder="Reason name" 
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  />
                  <Button variant="primary" onClick={handleAddReason} disabled={loadingReasons || !newReason.trim()}>
                    <i className={`bi ${biPlus} me-1`}></i> Add
                  </Button>
                </InputGroup>
              </div>
              <div>
                {loadingReasons ? (
                  <div className="text-center py-3">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  reportReasons.map((reason) => (
                    <div key={reason.id} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                      {editingReason?.id === reason.id ? (
                        <>
                          <InputGroup style={{ width: '100%' }}>
                            <FormControl
                              value={editReasonName}
                              onChange={(e) => setEditReasonName(e.target.value)}
                            />
                            <Button variant="success" size="sm" onClick={handleSaveEdit}>
                              <i className={`bi ${biCheck}`}></i>
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => { setEditingReason(null); setEditReasonName(''); }}>
                              <i className={`bi ${biX}`}></i>
                            </Button>
                          </InputGroup>
                        </>
                      ) : (
                        <>
                          <span>{reason.name}</span>
                          <div className="btn-group btn-group-sm">
                            <Button variant="outline-secondary" size="sm" onClick={() => handleEditReason(reason)}>
                              <i className={`bi ${biPencil}`}></i>
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteReason(reason.id)}>
                              <i className={`bi ${biTrash}`}></i>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100">
            <CardHeader>
              <h5 className="mb-0"><i className={`bi ${biDatabase} me-2`}></i>Database & Maintenance</h5>
            </CardHeader>
            <CardBody>
              <div className="d-grid gap-2">
                <Button variant="outline-secondary"><i className={`bi ${biArrowRepeat} me-2`}></i>Rebuild Compliance Records</Button>
                <Button variant="outline-secondary"><i className={`bi ${biArrowRepeat} me-2`}></i>Refresh Materialized Views</Button>
                <Button variant="outline-warning"><i className={`bi ${biShield} me-2`}></i>Verify RLS Policies</Button>
                <Button variant="outline-danger"><i className={`bi ${biTrash} me-2`}></i>Clean Up Old Audit Logs</Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}