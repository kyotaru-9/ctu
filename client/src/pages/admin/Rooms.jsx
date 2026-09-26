import { Container, Card, CardBody, CardHeader, Button, Table, Modal, Form, InputGroup, FormControl, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biPlus, biSearch, biPencil, biTrash, biEye, biQRCode, biPrinter, biDownload, biArrowRepeat, biToggleOn, biToggleOff } from '../../utils/icons'
import { roomService } from '../../services/roomService'
import QRCode from 'qrcode'

export default function AdminRooms() {
  const [rooms, setRooms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    room_code: '',
    room_name: '',
    building: '',
    floor: '',
    description: ''
  })

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const response = await roomService.getAll()
      if (response.success) {
        setRooms(response.data)
      } else {
        setError(response.message || 'Failed to load rooms')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    if (showQR) {
      const qrUrl = `${window.location.origin}/scan/${showQR.qr_token}`
      QRCode.toDataURL(qrUrl, { width: 256, margin: 2 })
        .then(url => setQrCodeDataUrl(url))
        .catch(console.error)
    } else {
      setQrCodeDataUrl('')
    }
  }, [showQR])

  const filteredRooms = rooms.filter(r => 
    r.room_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.building?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenAddModal = () => {
    setEditingRoom(null)
    setFormData({
      room_code: '',
      room_name: '',
      building: '',
      floor: '',
      description: ''
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (room) => {
    setEditingRoom(room)
    setFormData({
      room_code: room.room_code || '',
      room_name: room.room_name || '',
      building: room.building || '',
      floor: room.floor || '',
      description: room.description || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (editingRoom) {
        const response = await roomService.update(editingRoom.id, formData)
        if (response.success) {
          fetchRooms()
          setShowModal(false)
        } else {
          setError(response.message || 'Failed to update room')
        }
      } else {
        const response = await roomService.create(formData)
        if (response.success) {
          fetchRooms()
          setShowModal(false)
        } else {
          setError(response.message || 'Failed to create room')
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save room')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (room) => {
    try {
      const response = await roomService.update(room.id, { is_active: !room.is_active })
      if (response.success) {
        fetchRooms()
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleRegenerateQR = async (room) => {
    try {
      const response = await roomService.regenerateQR(room.id)
      if (response.success) {
        fetchRooms()
      }
    } catch (err) {
      console.error('Failed to regenerate QR:', err)
    }
  }

  const handleDelete = async () => {
    if (!editingRoom) return
    try {
      const response = await roomService.delete(editingRoom.id)
      if (response.success) {
        fetchRooms()
      }
    } catch (err) {
      console.error('Failed to delete room:', err)
    } finally {
      setShowModal(false)
    }
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Rooms</h1>
            <p className="text-muted mb-0">Manage classrooms and QR codes</p>
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
          <h1 className="h3 mb-0">Rooms</h1>
          <p className="text-muted mb-0">Manage classrooms and QR codes</p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <i className={`bi ${biPlus} me-1`}></i> Add Room
        </Button>
      </div>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Classrooms</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search rooms..." 
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
                  <th>Room Code</th>
                  <th>Room Name</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Status</th>
                  <th>QR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td><strong>{room.room_code}</strong></td>
                    <td>{room.room_name}</td>
                    <td>{room.building}</td>
                    <td>{room.floor}</td>
                    <td><Badge bg={room.is_active ? 'success' : 'secondary'}>{room.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td>
                      <Button variant="outline-primary" size="sm" onClick={() => setShowQR(room)}>
                        <i className={`bi ${biQRCode} me-1`}></i> View QR
                      </Button>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Button variant="outline-primary" onClick={() => handleOpenEditModal(room)} title="Edit"><i className={`bi ${biPencil}`}></i></Button>
                        <Button variant="outline-info" onClick={() => setShowQR(room)} title="View QR"><i className={`bi ${biQRCode}`}></i></Button>
                        <Button variant="outline-secondary" title="Print QR"><i className={`bi ${biPrinter}`}></i></Button>
                        <Button variant="outline-secondary" title="Download QR"><i className={`bi ${biDownload}`}></i></Button>
                        <Button variant="outline-warning" onClick={() => handleRegenerateQR(room)} title="Regenerate QR"><i className={`bi ${biArrowRepeat}`}></i></Button>
                        <Button variant={room.is_active ? 'outline-danger' : 'outline-success'} onClick={() => handleToggleStatus(room)} title={room.is_active ? 'Deactivate' : 'Activate'}>
                          <i className={`bi ${room.is_active ? biToggleOff : biToggleOn}`}></i>
                        </Button>
                        <Button variant="outline-danger" onClick={() => { setEditingRoom(room); setShowModal(true); }} title="Delete"><i className={`bi ${biTrash}`}></i></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingRoom ? 'Edit Room' : 'Add Room'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} id="room-form">
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Room Code <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.room_code} 
                  onChange={(e) => setFormData(prev => ({ ...prev, room_code: e.target.value }))}
                  required
                  disabled={!!editingRoom}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Room Name <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.room_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, room_name: e.target.value }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Building</Form.Label>
                <FormControl 
                  value={formData.building} 
                  onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Floor</Form.Label>
                <FormControl 
                  value={formData.floor} 
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                />
              </Col>
              <Col md={12}>
                <Form.Label>Description</Form.Label>
                <FormControl 
                  as="textarea" 
                  rows={3}
                  value={formData.description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" disabled={submitting} type="submit" form="room-form">
            {submitting ? <Spinner size="sm" /> : (editingRoom ? 'Update' : 'Create')}
          </Button>
        </Modal.Footer>
      </Modal>
      
      <Modal show={!!showQR} onHide={() => { setShowQR(null); setQrCodeDataUrl(''); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>QR Code - {showQR?.room_name}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="qr-display">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt={`QR Code for ${showQR?.room_code}`} style={{ width: '256px', height: '256px' }} />
            ) : (
              <div className="bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '256px', height: '256px' }}>
                <span className="text-muted">Generating QR...</span>
              </div>
            )}
            <div className="mt-3">
              <h6>{showQR?.room_name}</h6>
              <p className="text-muted mb-1">Code: {showQR?.room_code}</p>
              <p className="text-muted small mb-0">{showQR?.building}, Floor {showQR?.floor}</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowQR(null); setQrCodeDataUrl(''); }}>Close</Button>
          <Button variant="outline-secondary"><i className={`bi ${biPrinter} me-1`}></i> Print</Button>
          <Button variant="outline-primary"><i className={`bi ${biDownload} me-1`}></i> Download</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}