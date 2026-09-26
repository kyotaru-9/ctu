import { Container, Card, CardBody, Button, Alert, Spinner } from 'react-bootstrap'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { biQRCode, biBuilding, biDoorOpen, biArrowRight, biLock, biInfo } from '../utils/icons'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function QRScan() {
  const { qrToken } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await api.get(`/rooms/qr/${qrToken}`)
        if (response.data.success) {
          setRoom(response.data.data)
        } else {
          setError('Invalid or inactive QR code')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load room information')
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [qrToken])

  const handleLogin = () => {
    navigate('/login', { state: { from: { pathname: `/scan/${qrToken}` } } })
  }

  const handleProceed = () => {
    if (user) {
      if (user.role === 'admin') {
        navigate(`/admin/qr-print/${room.id}`)
      } else if (user.role === 'student') {
        navigate('/student/submit', { state: { room } })
      } else if (user.role === 'student_special') {
        navigate('/special/before')
      }
    } else {
      handleLogin()
    }
  }

  if (loading) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center vh-100">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-muted">Loading room information...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid className="d-flex align-items-center justify-content-center vh-100">
        <Card className="shadow-sm border-0" style={{ maxWidth: '400px' }}>
          <CardBody className="text-center p-5">
            <div className="bg-danger bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
              <i className={`bi bi-x-circle text-white`} style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h4 className="mb-2">Invalid QR Code</h4>
            <p className="text-muted mb-4">{error}</p>
            <Button variant="outline-primary" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardBody>
        </Card>
      </Container>
    )
  }

  if (!room) {
    return null
  }

  return (
    <Container fluid className="main-content">
      <Row className="justify-content-center">
        <Col lg={6}>
          <Card className="shadow-sm border-0">
            <CardBody className="text-center p-5">
              <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                <i className={`bi ${biBuilding} text-white`} style={{ fontSize: '2.5rem' }}></i>
              </div>
              
              <h2 className="mb-1">CTU CLEAN-TRACK-UPDATE</h2>
              <p className="text-muted mb-4">Classroom Cleanliness Monitoring System</p>
              
              <Card className="bg-light mb-4">
                <CardBody>
                  <div className="row g-3 text-start">
                    <Col md={6}>
                      <strong>Room:</strong> {room.room_name}
                    </Col>
                    <Col md={6}>
                      <strong>Code:</strong> {room.room_code}
                    </Col>
                    <Col md={6}>
                      <strong>Building:</strong> {room.building}
                    </Col>
                    <Col md={6}>
                      <strong>Floor:</strong> {room.floor}
                    </Col>
                  </div>
                </CardBody>
              </Card>
              
              {user ? (
                <div className="d-grid gap-2">
                  <Button variant="primary" size="lg" onClick={handleProceed}>
                    <i className={`bi ${biArrowRight} me-1`}></i> 
                    {user.role === 'admin' ? 'View Room Details' : 'Submit Room Condition'}
                  </Button>
                  <Button variant="outline-secondary" onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : user.role === 'student' ? '/student/dashboard' : '/special/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <Alert variant="info">
                  <i className={`bi ${biLock} me-2`}></i>
                  Please log in to submit room condition or view details.
                </Alert>
              )}
              
              <div className="mt-4">
                <Button variant="outline-secondary" onClick={handleLogin}>
                  <i className={`bi ${biLock} me-1`}></i> Log In
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}