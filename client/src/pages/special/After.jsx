import { Container, Card, CardBody, CardHeader, Button, Form, FormControl, Alert, Spinner, ProgressBar, Row, Col, Badge, ListGroup, ListGroupItem } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { biImage, biArrowLeft, biCheckCircle, biXCircle, biCloudUpload, biArrowRight, biArrowLeft as biArrowLeftIcon, biCamera, biCalendar, biClock } from '../../utils/icons'
import { submissionService } from '../../services/submissionService'
import { roomService } from '../../services/roomService'
import { scheduleService } from '../../services/scheduleService'
import { authService } from '../../services/authService'
import { CameraCapture, PhotoPreview } from '../../components/camera/CameraCapture.jsx'

// Steps: 1=type/condition/mode, 2=camera or upload, 3=preview, 4=success
const STEPS = {
  TYPE_CONDITION: 1,
  CAMERA: 2,
  UPLOAD: 3,
  PREVIEW: 4,
  SUCCESS: 5
}

export default function SpecialAfter() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Form data
  const [roomId, setRoomId] = useState('')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [submissionTime, setSubmissionTime] = useState(new Date().toTimeString().slice(0,5))
  const [condition, setCondition] = useState('clean')
  const [notes, setNotes] = useState('')
  const [captureMode, setCaptureMode] = useState('camera') // 'camera' or 'upload'
  const [scheduleId, setScheduleId] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  
  // Photo state
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  
  // Flow state
  const [step, setStep] = useState(STEPS.TYPE_CONDITION)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [rooms, setRooms] = useState([])
  
  // Computed
  const isCameraMode = captureMode === 'camera'
  const isUploadMode = captureMode === 'upload'
  const hasImage = isCameraMode ? capturedBlob : imageFile
  const selectedSchedule = schedules.find(s => s.id === scheduleId)

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

  // Fetch schedules when room and date change
  useEffect(() => {
    if (!roomId || !submissionDate) {
      setSchedules([])
      setScheduleId('')
      return
    }
    
    const fetchSchedules = async () => {
      setLoadingSchedules(true)
      try {
        const response = await scheduleService.getSchedulesByRoomAndDate(roomId, submissionDate)
        if (response.success) {
          setSchedules(response.data || [])
          // Auto-select first schedule if available
          if (response.data && response.data.length > 0) {
            setScheduleId(response.data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load schedules:', err)
      } finally {
        setLoadingSchedules(false)
      }
    }
    
    fetchSchedules()
  }, [roomId, submissionDate])

  // Reset captured photo when going back to camera/upload step
  useEffect(() => {
    if (step === STEPS.CAMERA || step === STEPS.UPLOAD) {
      setCapturedBlob(null)
      setImagePreview(null)
      setImageFile(null)
      setError('')
    }
  }, [step])

  const handlePhotoCaptured = (file, dataUrl) => {
    setCapturedBlob(file)
    setImagePreview(dataUrl)
    setStep(STEPS.PREVIEW)
  }

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
      setStep(STEPS.PREVIEW)
    }
  }

  const handleRetake = () => {
    setCapturedBlob(null)
    setImagePreview(null)
    setImageFile(null)
    setStep(isCameraMode ? STEPS.CAMERA : STEPS.UPLOAD)
  }

  const handleCancel = () => {
    setCapturedBlob(null)
    setImagePreview(null)
    setImageFile(null)
    setStep(STEPS.TYPE_CONDITION)
  }

  const handleSubmit = async () => {
    if (!roomId) {
      setError('Please select a room')
      return
    }
    if (!hasImage) {
      setError('Please capture or upload a photo')
      return
    }
    
    setUploading(true)
    setUploadProgress(0)
    setError('')
    
    try {
      console.log('Submit - scheduleId:', scheduleId, 'selectedSchedule:', selectedSchedule, 'submissionTime:', submissionTime);
      const formData = new FormData()
      formData.append('image', hasImage)
      formData.append('room_id', roomId)
      formData.append('submission_type', 'after')
      formData.append('submitted_date', submissionDate)
      formData.append('submitted_time', submissionTime)
      formData.append('condition', condition)
      formData.append('notes', notes)
      if (scheduleId) {
        formData.append('schedule_id', scheduleId)
      }
      
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
                  {selectedSchedule && (
                    <>
                      <p className="mb-1"><strong>Subject:</strong> {selectedSchedule.subject_name}</p>
                      <p className="mb-1"><strong>Instructor:</strong> {selectedSchedule.instructor_name}</p>
                    </>
                  )}
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

  const renderStepIndicator = () => (
    <Row className="mb-4">
      {Object.values(STEPS).slice(0, 4).map((s) => (
        <Col key={s} className="text-center">
          <div className="d-flex flex-column align-items-center">
            <div className={`step-circle mx-auto mb-2 ${s < step ? 'completed' : s === step ? 'active' : ''}`}>
              {s < step ? <i className="bi bi-check fs-6" /> : s}
            </div>
            <small className={s === step ? 'fw-bold text-warning' : 'text-muted'}>
              {s === STEPS.TYPE_CONDITION && 'Type & Condition'}
              {s === STEPS.CAMERA && 'Take Photo'}
              {s === STEPS.UPLOAD && 'Upload Photo'}
              {s === STEPS.PREVIEW && 'Preview'}
            </small>
          </div>
        </Col>
      ))}
    </Row>
  )

  const renderStepContent = () => {
    switch (step) {
      case STEPS.TYPE_CONDITION:
        return (
          <div>
            <div className="mb-4">
              <Form.Label>Room <span className="text-danger">*</span></Form.Label>
              {loadingRooms ? (
                <Form.Control as="select" disabled>
                  <option value="">Loading rooms...</option>
                </Form.Control>
              ) : (
                <Form.Control
                  as="select"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value); setScheduleId(''); }}
                  required
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                  ))}
                </Form.Control>
              )}
            </div>

            <div className="mb-4">
              <Form.Label>Date <span className="text-danger">*</span></Form.Label>
              <FormControl
                type="date"
                value={submissionDate}
                onChange={(e) => { setSubmissionDate(e.target.value); setScheduleId(''); }}
                required
              />
            </div>

            {/* Schedule Selection */}
            {(schedules.length > 0 || loadingSchedules) && (
              <div className="mb-4">
                <Form.Label>Schedule <span className="text-danger">*</span></Form.Label>
                {loadingSchedules ? (
                  <Form.Control as="select" disabled>
                    <option value="">Loading schedules...</option>
                  </Form.Control>
                ) : (
                  <Form.Control
                    as="select"
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    required
                  >
                    <option value="">Select Class Schedule</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.subject_name} - {schedule.instructor_name} ({schedule.start_time.slice(0,5)}-{schedule.end_time.slice(0,5)})
                      </option>
                    ))}
                  </Form.Control>
                )}
                <Form.Text className="text-muted">
                  Select a class to auto-fill time. Time will be set from schedule.
                </Form.Text>
              </div>
            )}

            {!roomId && !loadingRooms && (
              <div className="mb-4">
                <Form.Label>Schedule</Form.Label>
                <Form.Text className="text-muted">
                  Select a Room first to see available schedules
                </Form.Text>
              </div>
            )}

            {roomId && !submissionDate && !loadingSchedules && (
              <div className="mb-4">
                <Form.Label>Schedule</Form.Label>
                <Form.Text className="text-muted">
                  Select a Date to load schedules for that day
                </Form.Text>
              </div>
            )}

            {/* Time Input - always shown */}
            <div className="mb-4">
              <Form.Label>Time <span className="text-danger">*</span></Form.Label>
              <FormControl
                type="time"
                value={submissionTime}
                onChange={(e) => setSubmissionTime(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
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

            <div className="mb-4">
              <Form.Label>Capture Mode</Form.Label>
              <div className="btn-group w-100" role="group">
                <Button
                  type="button"
                  variant={isCameraMode ? 'primary' : 'outline-primary'}
                  onClick={() => setCaptureMode('camera')}
                >
                  <i className={`bi ${biCamera} me-1`}></i> Camera
                </Button>
                <Button
                  type="button"
                  variant={isUploadMode ? 'primary' : 'outline-primary'}
                  onClick={() => setCaptureMode('upload')}
                >
                  <i className={`bi ${biCloudUpload} me-1`}></i> Upload
                </Button>
              </div>
              <Form.Text className="text-muted">
                Choose how to provide the photo
              </Form.Text>
            </div>

            <div className="mb-4">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations..." />
            </div>

            <Button variant="warning" size="lg" onClick={() => setStep(isCameraMode ? STEPS.CAMERA : STEPS.UPLOAD)}>
              <i className={`bi ${biArrowRight} me-1`}></i> Continue
            </Button>
          </div>
        )

      case STEPS.CAMERA:
        return (
          <div>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            
            <CameraCapture
              key={`camera-${step}`}
              onCapture={handlePhotoCaptured}
              facingMode="environment"
              placeholder="Take a photo of the room condition"
              autoStart={true}
            />
            
            <div className="mt-4 d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setStep(STEPS.TYPE_CONDITION)}>
                <i className={`bi ${biArrowLeftIcon} me-1`}></i> Back
              </Button>
            </div>
          </div>
        )

      case STEPS.UPLOAD:
        return (
          <div>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            
            <div className="border rounded p-4 text-center" style={{ minHeight: '200px' }}>
              <div className="text-muted mb-3">
                <i className={`bi ${biCloudUpload} fs-1`}></i>
                <p className="mt-2">Click to select photo</p>
              </div>
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

            <div className="mt-4 d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setStep(STEPS.TYPE_CONDITION)}>
                <i className={`bi ${biArrowLeftIcon} me-1`}></i> Back
              </Button>
            </div>
          </div>
        )

      case STEPS.PREVIEW:
        return (
          <div>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            
            <PhotoPreview
              dataUrl={imagePreview}
              onRetake={handleRetake}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
              title="Photo Preview"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <Link to="/special/dashboard" className="btn btn-outline-secondary">
            <i className={`bi ${biArrowLeftIcon} me-1`}></i> Back
          </Link>
        </div>
        <div className="mt-2">
          <h1 className="h3 mb-0">Submit After Photo</h1>
          <p className="text-muted mb-0">Upload room condition photo after class</p>
        </div>
      </div>
      
      {renderStepIndicator()}
      
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm border-0 mb-4">
            <CardBody>
              <div className="row g-3 mb-4">
                <Col md={6}>
                  <strong>Room:</strong> {rooms.find(r => r.id === roomId)?.room_code || 'Not selected'}
                </Col>
                <Col md={6}>
                  <strong>Date:</strong> {submissionDate}
                </Col>
                <Col md={6}>
                  <strong>Time:</strong> {submissionTime}
                </Col>
                <Col md={6}>
                  <strong>Condition:</strong> <Badge bg={condition === 'clean' ? 'success' : 'danger'}>{condition}</Badge>
                </Col>
                {selectedSchedule && (
                  <>
                    <Col md={6}>
                      <strong>Subject:</strong> {selectedSchedule.subject_name}
                    </Col>
                    <Col md={6}>
                      <strong>Instructor:</strong> {selectedSchedule.instructor_name}
                    </Col>
                  </>
                )}
              </div>
              
              <Card className="shadow-sm border-0 mb-4">
                <CardHeader>
                  <h5 className="mb-0">Submission Details</h5>
                </CardHeader>
                <CardBody>
                  {renderStepContent()}
                </CardBody>
              </Card>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}