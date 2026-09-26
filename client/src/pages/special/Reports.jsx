import { Container, Card, CardBody, CardHeader, Button, Form, FormControl, Modal, Table, Badge, Alert, InputGroup, Spinner, Row, Col } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { biPlus, biExclamation, biEye, biImage, biCloudUpload, biXCircle, biCheckCircle, biInfo } from '../../utils/icons'
import { reportService } from '../../services/reportService'
import { roomService } from '../../services/roomService'

const statusColors = { pending: 'warning', reviewed: 'info', resolved: 'success', rejected: 'danger' }

export default function SpecialReports() {
  const [reports, setReports] = useState([])
  const [rooms, setRooms] = useState([])
  const [reasons, setReasons] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')
  
  const [formData, setFormData] = useState({
    room_id: '',
    reason_id: '',
    other_reason: '',
    description: '',
    image: null
  })
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, roomsRes, reasonsRes] = await Promise.all([
          reportService.getMyReports(),
          roomService.getAll({ is_active: true }),
          reportService.getReasons()
        ])
        if (reportsRes.success) setReports(reportsRes.data || [])
        if (roomsRes.success) setRooms(roomsRes.data || [])
        if (reasonsRes.success) setReasons(reasonsRes.data || [])
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormError('Please select a valid image file (JPG, PNG, WEBP)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File size must be less than 10MB')
        return
      }
      setFormData(prev => ({ ...prev, image: file }))
      setImagePreview(URL.createObjectURL(file))
      setFormError('')
    }
  }

  const handleSubmit = async () => {
    if (!formData.room_id || !formData.reason_id || !formData.image) {
      setFormError('Please fill all required fields and attach an image')
      return
    }
    const otherReason = reasons.find(r => r.id === formData.reason_id)?.name === 'Other'
    if (otherReason && !formData.other_reason.trim()) {
      setFormError('Please specify the other reason')
      return
    }
    
    setSubmitting(true)
    setFormError('')
    
    try {
      const fd = new FormData()
      fd.append('room_id', formData.room_id)
      fd.append('reason_id', formData.reason_id)
      fd.append('other_reason', formData.other_reason)
      fd.append('description', formData.description)
      fd.append('image', formData.image)
      
      const response = await reportService.create(fd)
      
      if (response.success) {
        setShowModal(false)
        setFormData({ room_id: '', reason_id: '', other_reason: '', description: '', image: null })
        setImagePreview(null)
        // Refresh reports
        const reportsRes = await reportService.getMyReports()
        if (reportsRes.success) setReports(reportsRes.data || [])
      } else {
        setFormError(response.data.message || 'Failed to submit report')
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedReport(null)
    setFormError('')
    setFormData({ room_id: '', reason_id: '', other_reason: '', description: '', image: null })
    setImagePreview(null)
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Reports</h1>
            <p className="text-muted mb-0">View and submit room cleanliness reports</p>
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
          <p className="text-muted mb-0">View and submit room cleanliness reports</p>
        </div>
        <Button variant="warning" onClick={() => setShowModal(true)}>
          <i className={`bi ${biPlus} me-1`}></i> Report Room
        </Button>
      </div>
      
      <Card className="shadow-sm border-0 mb-4">
        <CardHeader>
          <h5 className="mb-0">Your Reports</h5>
        </CardHeader>
        <CardBody>
          {reports.length > 0 ? (
            <div className="table-responsive">
              <Table hover striped className="mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Room</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.reported_at ? new Date(report.reported_at).toLocaleDateString() : 'N/A'}</td>
                      <td>{report.room?.room_code || 'N/A'}</td>
                      <td>{report.reason?.name || 'N/A'}</td>
                      <td><Badge bg={statusColors[report.status] || 'secondary'}>{report.status}</Badge></td>
                      <td>
                        <Button variant="outline-primary" size="sm" onClick={() => { setSelectedReport(report); setShowModal(true); }}>
                          <i className={`bi ${biEye} me-1`}></i> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <i className={`bi ${biExclamation} fs-1`}></i>
              <p className="mt-2">No reports submitted yet</p>
              <Button variant="warning" onClick={() => setShowModal(true)}>
                <i className={`bi ${biPlus} me-1`}></i> Submit First Report
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedReport ? 'Report Details' : 'Report Room Problem'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport ? (
            <div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <strong>Date:</strong> {selectedReport.reported_at ? new Date(selectedReport.reported_at).toLocaleDateString() : 'N/A'}
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
              {selectedReport.status !== 'pending' && (
                <Alert variant="info">
                  <i className={`bi ${biInfo} me-2`}></i>
                  This report has been {selectedReport.status} by an administrator.
                </Alert>
              )}
            </div>
          ) : (
            <Form onSubmit={handleSubmit} id="special-report-form">
              {formError && <Alert variant="danger" className="mb-3">{formError}</Alert>}
              
              <div className="mb-3">
                <Form.Label>Room <span className="text-danger">*</span></Form.Label>
                <FormControl
                  as="select"
                  value={formData.room_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, room_id: e.target.value }))}
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                  ))}
                </FormControl>
              </div>
              
              <div className="mb-3">
                <Form.Label>Reason <span className="text-danger">*</span></Form.Label>
                <FormControl
                  as="select"
                  value={formData.reason_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason_id: e.target.value }))}
                  required
                >
                  <option value="">Select Reason</option>
                  {reasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>{reason.name}</option>
                  ))}
                </FormControl>
              </div>
              
              {reasons.find(r => r.id === formData.reason_id)?.name === 'Other' && (
                <div className="mb-3">
                  <Form.Label>Other Reason <span className="text-danger">*</span></Form.Label>
                  <FormControl
                    value={formData.other_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, other_reason: e.target.value }))}
                    placeholder="Please specify"
                    required
                  />
                </div>
              )}
              
              <div className="mb-3">
                <Form.Label>Description</Form.Label>
                <FormControl
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details..."
                />
              </div>
              
              <div className="mb-3">
                <Form.Label>Image Proof <span className="text-danger">*</span></Form.Label>
                <div className="border rounded p-3 text-center" style={{ minHeight: '150px' }}>
                  {imagePreview ? (
                    <div className="position-relative d-inline-block">
                      <img src={imagePreview} alt="Preview" className="img-fluid rounded" style={{ maxHeight: '200px' }} />
                      <Button 
                        variant="danger" 
                        size="sm" 
                        className="position-absolute top-0 end-0 m-2"
                        onClick={() => { setFormData(prev => ({ ...prev, image: null })); setImagePreview(null); }}
                      >
                        <i className={`bi ${biXCircle}`}></i>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted">
                      <i className={`bi ${biImage} fs-1`}></i>
                      <p className="mt-2">Click to upload image proof</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="d-none"
                        id="proof-input-special"
                      />
                      <Button variant="outline-primary" onClick={() => document.getElementById('proof-input-special')?.click()}>
                        <i className={`bi ${biCloudUpload} me-1`}></i> Upload Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="d-grid gap-2">
                <Button 
                  variant="warning" 
                  disabled={submitting}
                  type="submit"
                  form="special-report-form"
                >
                  {submitting ? <Spinner size="sm" /> : 'Submit Report'}
                </Button>
                <Button variant="outline-secondary" onClick={handleCloseModal}>
                  Cancel
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  )
}