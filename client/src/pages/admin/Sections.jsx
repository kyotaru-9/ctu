import { Container, Card, CardBody, CardHeader, Button, Table, Modal, Form, InputGroup, FormControl, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap'
import { useState, useEffect, useCallback } from 'react'
import { biPlus, biSearch, biPencil, biTrash, biEye, biPersonBadge, biLock, biToggleOn, biToggleOff, biArrowRepeat, biPeople } from '../../utils/icons'
import { sectionService } from '../../services/sectionService'

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [formData, setFormData] = useState({
    mayor_name: '',
    program: '',
    year_level: '',
    section_name: '',
    shift: 'day',
    student_type: 'student'
  })

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const response = await sectionService.getAll()
      if (response.success) {
        setSections(response.data)
      } else {
        setError(response.message || 'Failed to load sections')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  const filteredSections = sections.filter(s => 
    s.mayor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.section_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenAddModal = () => {
    setEditingSection(null)
    setFormData({
      mayor_name: '',
      program: '',
      year_level: '',
      section_name: '',
      shift: 'day',
      student_type: 'student'
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (section) => {
    setEditingSection(section)
    setFormData({
      mayor_name: section.mayor_name || '',
      program: section.program || '',
      year_level: section.year_level || '',
      section_name: section.section_name || '',
      shift: section.shift || 'day',
      student_type: section.student_type || 'student'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('[Sections] handleSubmit called:', { editingSection: editingSection?.id, formData })
    setSubmitting(true)
    setError('')

    try {
      if (editingSection) {
        console.log('[Sections] Updating section:', editingSection.id)
        const response = await sectionService.update(editingSection.id, formData)
        console.log('[Sections] Update response:', response)
        if (response.success) {
          fetchSections()
          setShowModal(false)
        } else {
          setError(response.message || 'Failed to update section')
        }
      } else {
        console.log('[Sections] Creating new section with:', formData)
        const response = await sectionService.create(formData)
        console.log('[Sections] Create response:', response)
        if (response.success) {
          fetchSections()
          setShowModal(false)
          if (response.credentials) {
            setCredentials(response.credentials)
            setShowCredentialsModal(true)
          }
        } else {
          setError(response.message || 'Failed to create section')
        }
      }
    } catch (err) {
      console.error('[Sections] Error:', err)
      setError(err.response?.data?.message || 'Failed to save section')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (section) => {
    try {
      const response = await sectionService.toggleStatus(section.id)
      if (response.success) {
        fetchSections()
      }
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const response = await sectionService.delete(deleteId)
      if (response.success) {
        fetchSections()
      }
    } catch (err) {
      console.error('Failed to delete section:', err)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <Container fluid className="main-content">
        <div className="page-header">
          <div>
            <h1 className="h3 mb-0">Students / Sections</h1>
            <p className="text-muted mb-0">Manage class sections and student accounts</p>
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
          <h1 className="h3 mb-0">Students / Sections</h1>
          <p className="text-muted mb-0">Manage class sections and student accounts</p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <i className={`bi ${biPlus} me-1`}></i> Add Section
        </Button>
      </div>
      
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Total Sections</div>
                  <div className="fw-bold fs-3">{sections.length}</div>
                </div>
                <div className="bg-primary bg-gradient rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '50px', height: '50px' }}>
                  <i className={`bi ${biPeople} fs-4`}></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Active Sections</div>
                  <div className="fw-bold fs-3 text-success">{sections.filter(s => s.is_active).length}</div>
                </div>
                <div className="bg-success bg-gradient rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '50px', height: '50px' }}>
                  <i className={`bi ${biPersonBadge} fs-4`}></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="stat-card border-0 shadow-sm">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Inactive Sections</div>
                  <div className="fw-bold fs-3 text-danger">{sections.filter(s => !s.is_active).length}</div>
                </div>
                <div className="bg-danger bg-gradient rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: '50px', height: '50px' }}>
                  <i className={`bi ${biLock} fs-4`}></i>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      
      <Card className="shadow-sm border-0">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Sections</h5>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text><i className={`bi ${biSearch}`}></i></InputGroup.Text>
            <FormControl 
              placeholder="Search sections..." 
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
                  <th>Mayor</th>
                  <th>Program</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Shift</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section) => (
                  <tr key={section.id}>
                    <td>{section.mayor_name}</td>
                    <td>{section.program}</td>
                    <td>{section.year_level}</td>
                    <td>{section.section_name}</td>
                    <td><Badge bg={section.shift === 'day' ? 'info' : 'warning'} text={section.shift === 'day' ? 'dark' : 'dark'}>{section.shift}</Badge></td>
                    <td><Badge bg={section.is_active ? 'success' : 'secondary'}>{section.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td><Badge bg={section.student_type === 'student_special' ? 'warning' : 'primary'} text={section.student_type === 'student_special' ? 'dark' : 'white'}>
                      {section.student_type === 'student_special' ? 'Special' : 'Regular'}
                    </Badge></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Button variant="outline-primary" onClick={() => handleOpenEditModal(section)} title="Edit"><i className={`bi ${biPencil}`}></i></Button>
                        <Button variant="outline-warning" title="Credentials"><i className={`bi ${biLock}`}></i></Button>
                        <Button variant={section.is_active ? 'outline-danger' : 'outline-success'} onClick={() => handleToggleStatus(section)} title={section.is_active ? 'Disable' : 'Enable'}>
                          <i className={`bi ${section.is_active ? biToggleOff : biToggleOn}`}></i>
                        </Button>
                        <Button variant="outline-danger" onClick={() => setDeleteId(section.id)} title="Delete"><i className={`bi ${biTrash}`}></i></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {filteredSections.length === 0 && (
            <div className="text-center py-5 text-muted">
              <i className={`bi bi-search fs-1`}></i>
              <p className="mt-2">No sections found</p>
            </div>
          )}
        </CardBody>
      </Card>
      
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingSection ? 'Edit Section' : 'Add Section'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit} id="section-form">
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Mayor Name <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.mayor_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, mayor_name: e.target.value }))}
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Program <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.program} 
                  onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Year Level <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.year_level} 
                  onChange={(e) => setFormData(prev => ({ ...prev, year_level: e.target.value }))}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Section <span className="text-danger">*</span></Form.Label>
                <FormControl 
                  value={formData.section_name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, section_name: e.target.value }))}
                  required
                />
              </Col>
              <Col md={4}>
                <Form.Label>Shift</Form.Label>
                <FormControl 
                  as="select" 
                  value={formData.shift} 
                  onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value }))}
                >
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                </FormControl>
              </Col>
              <Col md={6}>
                <Form.Label>Student Type</Form.Label>
                <FormControl 
                  as="select" 
                  value={formData.student_type} 
                  onChange={(e) => setFormData(prev => ({ ...prev, student_type: e.target.value }))}
                >
                  <option value="student">Student</option>
                  <option value="student_special">Student Special</option>
                </FormControl>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" disabled={submitting} type="submit" form="section-form">
            {submitting ? <Spinner size="sm" /> : (editingSection ? 'Update' : 'Create')}
          </Button>
        </Modal.Footer>
      </Modal>
      
      <Modal show={!!deleteId} onHide={() => setDeleteId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this section? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCredentialsModal} onHide={() => { setShowCredentialsModal(false); setCredentials(null); }} centered>
        <Modal.Header closeButton>
          <Modal.Title><i className="bi bi-key me-2"></i>Student Account Created</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            <strong>Section created successfully!</strong> A student account has been automatically generated.
          </Alert>
          <p className="text-muted small mb-3">Share these credentials with the section representative. They must change password on first login.</p>
          <div className="bg-light p-3 rounded mb-3">
            <div className="mb-2">
              <strong>Email:</strong>
              <div className="font-monospace">{credentials?.email}</div>
            </div>
            <div className="mb-2">
              <strong>Password:</strong>
              <div className="font-monospace">{credentials?.password}</div>
            </div>
            <div className="mb-2">
              <strong>Section:</strong> {formData.program} {formData.year_level}{formData.section_name}
            </div>
          </div>
          <div className="d-grid gap-2">
            <Button variant="outline-primary" onClick={() => navigator.clipboard.writeText(`Email: ${credentials?.email}\nPassword: ${credentials?.password}`)}>
              <i className="bi bi-clipboard me-1"></i> Copy Credentials
            </Button>
            <Button variant="secondary" onClick={() => { setShowCredentialsModal(false); setCredentials(null); }}>
              Close
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  )
}