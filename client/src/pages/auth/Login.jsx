import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Button, Alert, Card, CardBody } from 'react-bootstrap'
import { useAuth } from '../../context/AuthContext'
import { biPerson, biLock, biEye, biEyeSlash } from '../../utils/icons'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const user = await login(email, password)
      console.log('[Login] User logged in:', { role: user?.role, email: user?.email })
      
      let redirectPath
      if (user?.role === 'admin') {
        redirectPath = '/admin/dashboard'
      } else if (user?.role === 'student') {
        redirectPath = '/student/dashboard'
      } else if (user?.role === 'student_special') {
        redirectPath = '/special/dashboard'
      } else {
        redirectPath = from
      }
      
      console.log('[Login] Redirecting to:', redirectPath)
      navigate(redirectPath, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="w-100" style={{ maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-gradient rounded-3 p-3 mb-3" style={{ width: '80px', height: '80px' }}>
            <i className="bi bi-building text-white" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h2 className="fw-bold text-dark">CTU Clean-Track-Update</h2>
          <p className="text-muted">Classroom Cleanliness Monitoring System</p>
        </div>
        
        <Card className="shadow-sm border-0">
          <CardBody className="p-4 p-md-5">
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </Alert>
            )}
            
            <Form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-medium">Email Address</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <i className={biPerson} style={{ fontSize: '1.1rem' }}></i>
                  </span>
                  <Form.Control
                    id="email"
                    type="email"
                    className="border-start-0"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-medium">Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0">
                    <i className={biLock} style={{ fontSize: '1.1rem' }}></i>
                  </span>
                  <Form.Control
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="border-start-0"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-start-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? biEyeSlash : biEye}></i>
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-100 py-2 fw-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Form>
            
            <div className="text-center mt-4 text-muted small">
              <p className="mb-1">Cebu Technological University</p>
              <p className="mb-0">Clean-Track-Update System</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}