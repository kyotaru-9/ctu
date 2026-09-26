import { Container, Card, CardBody, Button, Alert, Spinner, Row, Col, ListGroup, ListGroupItem } from 'react-bootstrap'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { biQRCode, biCamera, biCheckCircle, biArrowLeft, biXCircle, biInfo, biCalendar, biClock, biDoorOpen, biPerson } from '../../utils/icons'
import api from '../../services/api'
import { scheduleService } from '../../services/scheduleService'

export default function StudentScan() {
  const navigate = useNavigate()
  const location = useLocation()
  const [scanning, setScanning] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const scannerRef = useRef(null)
  const videoRef = useRef(null)
  
  const qrToken = location.state?.qrToken

  useEffect(() => {
    if (qrToken) {
      validateQR(qrToken)
    }
  }, [qrToken])

  const validateQR = async (token) => {
    setValidating(true)
    setError('')
    try {
      const response = await api.get(`/rooms/qr/${token}`)
      if (response.data.success) {
        setResult(response.data.data)
        // Fetch schedules for this room
        await fetchSchedulesForRoom(response.data.data.id)
      } else {
        setError('Invalid or inactive QR code')
        setScanning(true)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to validate QR code')
      setScanning(true)
    } finally {
      setValidating(false)
    }
  }

  const fetchSchedulesForRoom = async (roomId) => {
    setLoadingSchedules(true)
    try {
      const response = await scheduleService.getSchedulesByRoom(roomId)
      if (response.success) {
        setSchedules(response.data || [])
      }
    } catch (err) {
      console.error('Failed to load schedules:', err)
    } finally {
      setLoadingSchedules(false)
    }
  }

  const onScanSuccess = (decodedText) => {
    if (scanning) {
      setScanning(false)
      const token = decodedText.includes('/scan/') 
        ? decodedText.split('/scan/').pop()
        : decodedText
      validateQR(token)
    }
  }

  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule)
  }

  const handleSubmit = () => {
    if (selectedSchedule && result) {
      navigate('/student/submit', { 
        state: { 
          room: result,
          schedule: selectedSchedule
        } 
      })
    }
  }

  const handleRetry = () => {
    setScanning(true)
    setResult(null)
    setSchedules([])
    setSelectedSchedule(null)
    setError('')
    setCameraError('')
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = new Date().getDay()

  useEffect(() => {
    if (scanning && videoRef.current && !scannerRef.current) {
      const html5Qrcode = new Html5Qrcode("qr-scanner")
      scannerRef.current = html5Qrcode
      
      html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        (err) => {
        }
      ).catch(err => {
        console.error('Failed to start QR scanner:', err)
        setCameraError('Camera access denied or not available. Please allow camera permission.')
      })
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [scanning])

  return (
    <Container fluid className="main-content">
      <div className="page-header">
        <div>
          <h1 className="h3 mb-0">Scan Room QR</h1>
          <p className="text-muted mb-0">Scan the QR code posted in the classroom</p>
        </div>
      </div>
      
      <Row className="justify-content-center">
        <Col lg={6}>
          {validating ? (
            <Card className="shadow-sm border-0">
              <CardBody className="text-center p-5">
                <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <Spinner size="lg" color="white" />
                </div>
                <h4 className="mb-2">Validating QR Code...</h4>
                <p className="text-muted">Please wait while we verify the room</p>
              </CardBody>
            </Card>
          ) : result && schedules.length === 0 && !loadingSchedules ? (
            <Card className="shadow-sm border-0">
              <CardBody className="text-center p-5">
                <div className="bg-warning bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className={`bi ${biCalendar} text-white`} style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h4 className="mb-2">No Classes Scheduled</h4>
                <p className="text-muted mb-4">No classes scheduled for this room today.</p>
                <Button variant="outline-primary" onClick={handleRetry}>
                  <i className={`bi ${biXCircle} me-1`}></i> Scan Again
                </Button>
              </CardBody>
            </Card>
          ) : result ? (
            <Card className="shadow-sm border-0">
              <CardBody className="p-4">
                <div className="text-center mb-4">
                  <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                    <i className={`bi ${biCheckCircle} text-white`} style={{ fontSize: '2.5rem' }}></i>
                  </div>
                  <h4 className="mb-2">Room Identified</h4>
                  <div className="text-start mb-4">
                    <p className="mb-1"><strong>Room:</strong> {result.room_name}</p>
                    <p className="mb-1"><strong>Code:</strong> {result.room_code}</p>
                    <p className="mb-0"><strong>Location:</strong> {result.building}, Floor {result.floor}</p>
                  </div>
                </div>

                {loadingSchedules ? (
                  <div className="text-center py-4">
                    <Spinner />
                    <p className="text-muted mt-2">Loading today's classes...</p>
                  </div>
                ) : schedules.length > 0 ? (
                  <>
                    <h6 className="mb-3">Select Today's Class</h6>
                    <ListGroup flush>
                      {schedules.map((schedule) => (
                        <ListGroupItem 
                          key={schedule.id}
                          action
                          className={`d-flex align-items-center ${selectedSchedule?.id === schedule.id ? 'active bg-primary text-white' : ''}`}
                          onClick={() => handleScheduleSelect(schedule)}
                        >
                          <div className="me-3">
                            <i className={`bi ${biCalendar} fs-4 text-primary`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-medium">{schedule.subject_name}</div>
                            <small className="text-muted">
                              <i className={`bi ${biPerson} me-1`}></i> {schedule.instructor_name} • 
                              <i className={`bi ${biClock} me-1`}></i> {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)} •
                              <i className={`bi ${biDoorOpen} me-1`}></i> {schedule.rooms?.room_name}
                            </small>
                          </div>
                          {selectedSchedule?.id === schedule.id && (
                            <i className="bi bi-check-circle-fill text-success fs-4"></i>
                          )}
                        </ListGroupItem>
                      ))}
                    </ListGroup>
                    <div className="d-grid gap-2 mt-3">
                      <Button 
                        variant="primary" 
                        size="lg" 
                        onClick={handleSubmit}
                        disabled={!selectedSchedule}
                      >
                        Continue to Submission
                      </Button>
                      <Button variant="outline-secondary" onClick={handleRetry}>
                        <i className={`bi ${biXCircle} me-1`}></i> Scan Again
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted">
                    <i className={`bi ${biCalendar} fs-1`}></i>
                    <p className="mt-2">No classes scheduled for today</p>
                    <Button variant="outline-primary" className="mt-2" onClick={handleRetry}>
                      <i className={`bi ${biXCircle} me-1`}></i> Scan Again
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : error ? (
            <Card className="shadow-sm border-0">
              <CardBody className="text-center p-5">
                <div className="bg-danger bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <i className={`bi ${biXCircle} text-white`} style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h4 className="mb-2">Invalid QR Code</h4>
                <p className="text-muted mb-4">{error}</p>
                <Button variant="outline-primary" onClick={handleRetry}>
                  <i className={`bi ${biArrowLeft} me-1`}></i> Try Again
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Card className="shadow-sm border-0">
              <CardBody className="p-4">
                <div className="text-center mb-4">
                  <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                    <i className={`bi ${biQRCode} text-white`} style={{ fontSize: '2.5rem' }}></i>
                  </div>
                  <h5>Position the QR code within the frame</h5>
                  <p className="text-muted">The camera will automatically detect the QR code</p>
                </div>
                
                {cameraError && (
                  <Alert variant="danger" className="mb-3">
                    <i className={`bi ${biXCircle} me-2`}></i>
                    {cameraError}
                    <div className="mt-2">
                      <Button variant="outline-primary" size="sm" onClick={handleRetry}>
                        <i className={`bi ${biArrowLeft} me-1`}></i> Retry Camera
                      </Button>
                    </div>
                  </Alert>
                )}
                
                <div id="qr-scanner" style={{ width: '100%' }}>
                  <div ref={videoRef} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />
                </div>
                
                <Alert variant="info" className="mt-3">
                  <i className={`bi ${biInfo} me-2`}></i>
                  Allow camera access when prompted. Make sure the QR code is well-lit and fully visible.
                </Alert>
              </CardBody>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  )
}