import { Container, Card, CardBody, CardHeader, Button, Form, Alert, Spinner, ProgressBar, Row, Col, Badge } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { biCamera, biArrowLeft, biCheckCircle, biXCircle, biCloudUpload, biArrowRight, biArrowLeft as biArrowLeftIcon } from '../../utils/icons'
import { submissionService } from '../../services/submissionService'
import { authService } from '../../services/authService'
import { CameraCapture, PhotoPreview } from '../../components/camera/CameraCapture.jsx'

// Steps: 1=type/condition, 2=camera, 3=preview, 4=success
const STEPS = {
  TYPE_CONDITION: 1,
  CAMERA: 2,
  PREVIEW: 3,
  SUCCESS: 4
}

export default function StudentSubmit() {
  const navigate = useNavigate()
  const location = useLocation()
  const [room, setRoom] = useState(location.state?.room || null)
  const [schedule, setSchedule] = useState(location.state?.schedule || null)
  
  // Form data
  const [submissionType, setSubmissionType] = useState('before')
  const [condition, setCondition] = useState('clean')
  const [notes, setNotes] = useState('')
  
  // Photo state
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  // Flow state
  const [step, setStep] = useState(STEPS.TYPE_CONDITION)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  
  // Computed
  const isBefore = submissionType === 'before'
  const isStudentRole = authService.getUserRole() === 'student'

  useEffect(() => {
    if (!room) {
      navigate('/student/scan')
    }
  }, [room, navigate])

  // Early return to prevent rendering without room
  if (!room) {
    return null
  }

  // Set condition based on submission type and schedule
  useEffect(() => {
    if (schedule) {
      setSubmissionType('before')
      setCondition('clean')
    }
  }, [schedule])

  // Reset captured photo when going back to camera step
  useEffect(() => {
    if (step === STEPS.CAMERA) {
      setCapturedBlob(null)
      setImagePreview(null)
      setError('')
    }
  }, [step])

  const handlePhotoCaptured = (blob, dataUrl) => {
    setCapturedBlob(blob)
    setImagePreview(dataUrl)
    setStep(STEPS.PREVIEW)
  }

  const handleRetake = () => {
    setCapturedBlob(null)
    setImagePreview(null)
    setStep(STEPS.CAMERA)
  }

  const handleCancel = () => {
    setCapturedBlob(null)
    setImagePreview(null)
    setStep(STEPS.TYPE_CONDITION)
  }

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('capturedBlob:', capturedBlob);
    console.log('room:', room);
    console.log('schedule:', schedule);
    console.log('submissionType:', submissionType);
    
    if (!capturedBlob) {
      setError('Please capture a photo')
      return
    }
    if (!room) {
      setError('Room not found. Please scan the QR code again.')
      return
    }
    
    setUploading(true)
    setUploadProgress(0)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', capturedBlob)
      formData.append('room_id', room.id)
      formData.append('submission_type', submissionType)
      formData.append('condition', condition)
      formData.append('notes', notes)
      if (schedule) {
        formData.append('schedule_id', schedule.id)
      }
      
      // Log FormData contents
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }
      
      const onProgress = (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(percent)
      }
      
      const response = isBefore 
        ? await submissionService.submitBefore(formData, onProgress)
        : await submissionService.submitAfter(formData, onProgress)
      
      console.log('Submit response:', response);
      
      if (response.success) {
        setStep(STEPS.SUCCESS)
      } else {
        setError(response.message || 'Submission failed')
      }
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to submit')
    } finally {
      setUploading(false)
    }
  }

  const handleDone = () => {
    navigate('/student/dashboard')
  }

  if (step === STEPS.SUCCESS) {
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
                <h4 className="mb-2">{isBefore ? 'Before' : 'After'} Submission Successful</h4>
                <p className="text-muted mb-4">Your room condition photo has been recorded.</p>
                <div className="mb-4">
                  <strong>Room:</strong> {room?.room_name} ({room?.room_code})<br />
                  {schedule && <><strong>Subject:</strong> {schedule.subject_name}<br /><strong>Section:</strong> {schedule.sections?.program} {schedule.sections?.year_level}{schedule.sections?.section_name}<br /></>}
                  <strong>Type:</strong> {isBefore ? 'Before Class' : 'After Class'}<br />
                  <strong>Condition:</strong> {condition}
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
      {Object.values(STEPS).slice(0, 3).map((s) => (
        <Col key={s} className="text-center">
          <div className="d-flex flex-column align-items-center">
            <div className={`step-circle mx-auto mb-2 ${s < step ? 'completed' : s === step ? 'active' : ''}`}>
              {s < step ? <i className="bi bi-check fs-6" /> : s}
            </div>
            <small className={s === step ? 'fw-bold text-primary' : 'text-muted'}>
              {s === STEPS.TYPE_CONDITION && 'Type & Condition'}
              {s === STEPS.CAMERA && 'Take Photo'}
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
              <Form.Label>Submission Type</Form.Label>
              <div className="btn-group w-100" role="group">
                <Button
                  type="button"
                  variant={isBefore ? 'primary' : 'outline-primary'}
                  onClick={() => { setSubmissionType('before'); setCondition('clean'); }}
                >
                  <i className={`bi ${biCamera} me-1`}></i> Before Class
                </Button>
                <Button
                  type="button"
                  variant={!isBefore ? 'primary' : 'outline-primary'}
                  onClick={() => { setSubmissionType('after'); setCondition('clean'); }}
                >
                  <i className={`bi ${biCamera} me-1`}></i> After Class
                </Button>
              </div>
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
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control as="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations..." />
            </div>
            
            <Button variant="primary" size="lg" onClick={() => setStep(STEPS.CAMERA)}>
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

  if (!room) {
    return null
  }

  return (
    <>
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <Link to="/student/scan" className="btn btn-outline-secondary">
              <i className={`bi ${biArrowLeftIcon} me-1`}></i> Back
            </Link>
          </div>
          <div className="mt-2">
            <h1 className="h3 mb-0">Submit Room Condition</h1>
          </div>
        </div>
        
        {renderStepIndicator()}
        
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="shadow-sm border-0 mb-4">
              <CardBody>
                <div className="row g-3 mb-4">
                  <Col md={6}>
                    <strong>Room:</strong> {room?.room_name}
                  </Col>
                  <Col md={6}>
                    <strong>Code:</strong> {room?.room_code}
                  </Col>
                  <Col md={6}>
                    <strong>Building:</strong> {room?.building}
                  </Col>
                  <Col md={6}>
                    <strong>Floor:</strong> {room?.floor}
                  </Col>
                  {schedule && (
                    <>
                      <Col md={6}>
                        <strong>Subject:</strong> {schedule.subject_name}
                      </Col>
                      <Col md={6}>
                        <strong>Instructor:</strong> {schedule.instructor_name}
                      </Col>
                      <Col md={6}>
                        <strong>Time:</strong> {schedule.start_time} - {schedule.end_time}
                      </Col>
                      <Col md={6}>
                        <strong>Section:</strong> {schedule.sections?.program} {schedule.sections?.year_level}{schedule.sections?.section_name}
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
    </>
  )
}