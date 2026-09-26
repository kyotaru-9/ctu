import { Container, Card, CardBody, Button, Row, Col, Spinner, Alert } from 'react-bootstrap'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { biQRCode, biPrinter, biBuilding, biArrowLeft, biDownload } from '../../utils/icons'
import QRCode from 'qrcode'
import { roomService } from '../../services/roomService'

export default function AdminQRPrint() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await roomService.getById(roomId)
        if (response.success) {
          setRoom(response.data)
        } else {
          setError(response.message || 'Room not found')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load room')
      } finally {
        setLoading(false)
      }
    }
    fetchRoom()
  }, [roomId])

  useEffect(() => {
    if (room) {
      const qrUrl = `${window.location.origin}/scan/${room.qr_token}`
      QRCode.toDataURL(qrUrl, { width: 256, margin: 2 })
        .then(url => setQrCodeDataUrl(url))
        .catch(console.error)
    }
  }, [room])

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a')
      link.href = qrCodeDataUrl
      link.download = `QR_${room.room_code}.png`
      link.click()
    }
  }

  const handleBack = () => {
    navigate('/admin/rooms')
  }

  if (loading) {
    return (
      <Container fluid className="main-content qr-print-page">
        <div className="d-flex justify-content-center my-5">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  if (error || !room) {
    return (
      <Container fluid className="main-content qr-print-page">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Link to="/admin/rooms" className="btn btn-outline-secondary" onClick={handleBack}>
            <i className={`bi ${biArrowLeft} me-1`}></i> Back to Rooms
          </Link>
        </div>
        <Alert variant="danger">Room not found: {error}</Alert>
      </Container>
    )
  }

  const qrUrl = `${window.location.origin}/scan/${room.qr_token}`

  return (
    <Container fluid className="main-content qr-print-page">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <Link to="/admin/rooms" className="btn btn-outline-secondary" onClick={handleBack}>
          <i className={`bi ${biArrowLeft} me-1`}></i> Back to Rooms
        </Link>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={handleDownload}>
            <i className={`bi ${biDownload} me-1`}></i> Download QR
          </Button>
          <Button variant="outline-secondary" onClick={handlePrint}>
            <i className={`bi ${biPrinter} me-1`}></i> Print
          </Button>
        </div>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardBody className="text-center p-4">
          <div className="mb-3">
            <i className={`bi ${biBuilding} text-primary`} style={{ fontSize: '3rem' }}></i>
          </div>
          <h2 className="mb-1">CTU CLEAN-TRACK-UPDATE</h2>
          <p className="text-muted mb-4">Classroom Cleanliness Monitoring System</p>
          
          <div className="row justify-content-center mb-4">
            <div className="col-md-6">
              <div className="p-3 bg-light rounded">
                <h5 className="mb-1">{room.room_name}</h5>
                <p className="mb-1"><strong>Room Code:</strong> {room.room_code}</p>
                <p className="mb-0"><strong>Location:</strong> {room.building}, Floor {room.floor}</p>
              </div>
            </div>
          </div>
          
          <div className="qr-display mb-4">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt={`QR Code for ${room.room_code}`} style={{ width: '256px', height: '256px' }} />
            ) : (
              <div className="bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '256px', height: '256px' }}>
                <span className="text-muted">Generating QR...</span>
              </div>
            )}
          </div>
          
          <div className="text-muted small">
            <p className="mb-1">Scan this QR code before submitting room condition.</p>
            <p className="mb-0">URL: {qrUrl}</p>
          </div>
        </CardBody>
      </Card>
    </Container>
  )
}