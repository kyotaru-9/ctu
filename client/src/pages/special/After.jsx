import { Container, Card, CardBody, CardHeader, Button, Form, Alert, Spinner, ProgressBar, Row, Col } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { biImage, biArrowLeft, biCheckCircle, biCloudUpload, biXCircle, biCamera } from '../../utils/icons'
import { submissionService } from '../../services/submissionService'
import { roomService } from '../../services/roomService'
import { authService } from '../../services/authService'

export default function SpecialAfter() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [roomId, setRoomId] = useState('')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [submissionTime, setSubmissionTime] = useState(new Date().toTimeString().slice(0,5))
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [condition, setCondition] = useState('clean')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await roomService.getAll({ is_active: true })
        if (response.success) {
          setRooms(response.data || [])
        }
      } catch (err) {
        console.error('Failed to load rooms:', err)
      } finally {
        setLoadingRooms(false)
      }
    }
    fetchRooms()
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please select a valid image file (JPG, PNG, WEBP)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!roomId || !imageFile) {
      setError('Please select a room and upload a photo')
      return
    }
    
    setUploading(true)
    setUploadProgress(0)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('room_id', roomId)
      formData.append('submission_type', 'after')
      formData.append('submitted_date', submissionDate)
      formData.append('submitted_time', submissionTime)
      formData.append('condition', condition)
      formData.append('notes', notes)
      
      const onProgress = (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(percent)
      }
      
      const response = await submissionService.submitAfter(formData, onProgress)
      
      if (response.success) {
        setShowSuccess(true)
      } else {
        setError(response.message || 'Submission failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit')
    } finally {
      setUploading(false)
    }
  }

  const handleDone = () => {
    navigate('/special/dashboard')
  }

  if (showSuccess) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Submission Complete</h1>
          </div>
        </div>
        <Row className="justify-content-center">
          <Col lg={6}>
            <Card className="shadow-sm border-0">
              <CardBody className="text-center p-5">
                <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className={`bi ${biCheckCircle} text-white`} style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h4 className="mb-2">After Submission Successful</h4>
                <p className="text-muted mb-4">Your room condition photo has been recorded.</p>
                <div className="mb-4 text-start">
                  <p className="mb-1"><strong>Room:</strong> {rooms.find(r => r.id === roomId)?.room_code}</p>
                  <p className="mb-1"><strong>Date:</strong> {submissionDate}</p>
                  <p className="mb-1"><strong>Time:</strong> {submissionTime}</p>
                  <p className="mb-0"><strong>Condition:</strong> {condition}</p>
                </div>
                <Button variant="primary" size="lg" onClick={handleDone}>
                  <i className={`bi ${biCheckCircle} me-1`}></i> Done
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <Link to="/special/dashboard" className="btn btn-outline-secondary">
            <i className={`bi ${biArrowLeft} me-1`}></i> Back
          </Link>
        </div>
        <div className="mt-2">
          <h1 className="h3 mb-0">Submit After Photo</h1>
          <p className="text-muted mb-0">Upload room condition photo after class</p>
        </div>
      </div>
      
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm border-0 mb-4">
            <CardHeader>
              <h5 className="mb-0">Submission Details</h5>
            </CardHeader>
            <CardBody>
              <Form>
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Label>Room <span className="text-danger">*</span></Form.Label>
                    {loadingRooms ? (
                      <FormControl as="select" disabled>
                        <option value="">Loading rooms...</option>
                      </FormControl>
                    ) : (
                      <FormControl
                        as="select"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        required
                      >
                        <option value="">Select Room</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                        ))}
                      </FormControl>
                    )}
                  </Col>
                  <Col md={3}>
                    <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                    <FormControl
                      type="date"
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      required
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Time <span className="text-danger">*</span></Form.Label>
                    <FormControl
                      type="time"
                      value={submissionTime}
                      onChange={(e) => setSubmissionTime(e.target.value)}
                      required
                    />
                  </Col>
                </Row>
                
                <div className="mb-3">
                  <Form.Label>Room Condition</Form.Label>
                  <div className="btn-group w-100" role="group">
                    <Button
                      type="button"
                      variant={condition === 'clean' ? 'success' : 'outline-success'}
                      onClick={() => setCondition('clean')}
                    >
                      <i className={`bi ${biCheckCircle} me-1`}></i> Clean
                    </Button>
                    <Button
                      type="button"
                      variant={condition === 'not_clean' ? 'danger' : 'outline-danger'}
                      onClick={() => setCondition('not_clean')}
                    >
                      <i className={`bi ${biXCircle} me-1`}></i> Not Clean
                    </Button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <Form.Label>Photo <span className="text-danger">*</span></Form.Label>
                  <div className="border rounded p-3 text-center" style={{ minHeight: '200px' }}>
                    {imagePreview ? (
                      <div className="position-relative d-inline-block">
                        <img src={imagePreview} alt="Preview" className="img-fluid rounded" style={{ maxHeight: '300px' }} />
                        <Button 
                          variant="danger" 
                          size="sm" 
                          className="position-absolute top-0 end-0 m-2"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                        >
                          <i className={`bi ${biXCircle}`}></i>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-muted">
                        <i className={`bi ${biCloudUpload} fs-1`}></i>
                        <p className="mt-2">Click to capture or select photo</p>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={handleFileChange}
                          className="d-none"
                          id="photo-input-after"
                        />
                        <Button variant="outline-primary" onClick={() => document.getElementById('photo-input-after')?.click()}>
                          <i className={`bi ${biCamera} me-1`}></i> Capture Photo
                        </Button>
                        <Button variant="outline-secondary ms-2" onClick={() => document.getElementById('photo-input-after')?.click()}>
                          <i className={`bi ${biCloudUpload} me-1`}></i> Upload Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <Form.Label>Notes (Optional)</Form.Label>
                  <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations..." />
                </div>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                {uploading && (
                  <div className="mb-3">
                    <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} animated />
                    <div className="text-center small text-muted">Uploading...</div>
                  </div>
                )}
                
                <div className="d-grid gap-2">
                  <Button 
                    variant="warning" 
                    size="lg" 
                    disabled={uploading || !roomId || !imageFile}
                    onClick={handleSubmit}
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit After Condition'
                    )}
                  </Button>
                  <Button variant="outline-secondary" onClick={() => navigate('/special/dashboard')}>
                    Cancel
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}