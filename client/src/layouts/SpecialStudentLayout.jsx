import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Navbar, Nav, Container, Button, DropdownButton, Dropdown } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import {
  biDashboard, biCamera, biImage, biCalendar, biExclamation,
  biClockHistory, biBoxArrowRight, biPersonBadge, biList, biSun, biMoon
} from '../utils/icons'

const navItems = [
  { path: 'dashboard', label: 'Dashboard', icon: biDashboard },
  { path: 'before', label: 'Submit Before', icon: biCamera },
  { path: 'after', label: 'Submit After', icon: biImage },
  { path: 'schedule', label: 'Schedule', icon: biCalendar },
  { path: 'reports', label: 'Reports', icon: biExclamation },
  { path: 'history', label: 'History', icon: biClockHistory },
]

export default function SpecialStudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="d-flex">
      <aside className="sidebar text-white w-100" style={{ maxWidth: '280px', minWidth: '280px' }}>
        <div className="p-3 border-bottom border-secondary">
          <NavLink to="/special/dashboard" className="text-white text-decoration-none d-flex align-items-center">
            <div className="d-inline-flex align-items-center justify-content-center bg-warning bg-gradient rounded-3 me-2" style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-building text-dark" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h5 className="mb-0 fw-bold">CTU Clean-Track</h5>
              <small className="text-muted">Special Student Portal</small>
            </div>
          </NavLink>
        </div>
        
        <nav className="flex-grow-1 p-2">
          <ul className="nav flex-column">
            {navItems.map((item) => (
              <li key={item.path} className="mb-1">
                <NavLink
                  to={`/special/${item.path}`}
                  className={({ isActive }) => 
                    `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                >
                  <i className={`bi ${item.icon} me-2`} style={{ fontSize: '1.1rem' }}></i>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-3 border-top border-secondary">
          <div className="d-flex align-items-center mb-3">
            <div className="bg-warning bg-gradient rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '36px', height: '36px' }}>
              <i className={`bi ${biPersonBadge} text-dark`}></i>
            </div>
            <div className="flex-grow-1 min-width-0">
              <div className="fw-medium text-truncate">{user?.section?.section_name || 'Section'}</div>
              <small className="text-muted">{user?.section?.program} {user?.section?.year_level}{user?.section?.section_name} (Special)</small>
            </div>
          </div>
          <Button variant="outline-dark" className="w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
            <i className={`bi ${biBoxArrowRight} me-2`}></i>
            Sign Out
          </Button>
        </div>
      </aside>
      
      <main className="flex-grow-1 main-content">
        <Navbar className="navbar-expand-lg bg-white shadow-sm sticky-top px-4" style={{ zIndex: 1020 }}>
          <Container fluid>
            <div className="d-flex align-items-center justify-content-between w-100">
              <div className="d-flex align-items-center">
                <Button 
                  variant="outline-secondary" 
                  className="d-lg-none me-2" 
                  type="button" 
                  data-bs-toggle="offcanvas" 
                  data-bs-target="#specialSidebarOffcanvas"
                  aria-controls="specialSidebarOffcanvas"
                >
                  <i className="bi bi-list"></i>
                </Button>
              </div>
              
              <div className="d-flex align-items-center gap-3 ms-auto">
                <DropdownButton
                  as={Nav.Item}
                  title={
                    <div className="d-flex align-items-center gap-2">
                      <div className="bg-warning bg-gradient rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <i className={`bi ${biPersonBadge} text-dark`}></i>
                      </div>
                      <div className="d-none d-md-block text-end">
                        <div className="fw-medium small">{user?.section?.section_name || 'Section'}</div>
                        <small className="text-muted">{user?.section?.program} (Special)</small>
                      </div>
                    </div>
                  }
                  id="special-dropdown"
                  className="me-2"
                >
                  <Dropdown.Item onClick={handleLogout}>
                    <i className={`bi ${biBoxArrowRight} me-2`}></i> Sign Out
                  </Dropdown.Item>
                </DropdownButton>
              </div>
            </div>
          </Container>
        </Navbar>
        
        <Outlet />
      </main>
      
      <div className="offcanvas offcanvas-start" tabIndex="-1" id="specialSidebarOffcanvas" aria-labelledby="specialSidebarOffcanvasLabel">
        <div className="offcanvas-header bg-warning text-dark">
          <h5 className="offcanvas-title" id="specialSidebarOffcanvasLabel">
            <i className={`bi ${biList} me-2`}></i> Menu
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0">
          <nav className="p-2">
            <ul className="nav flex-column">
              {navItems.map((item) => (
                <li key={item.path} className="mb-1">
                  <NavLink
                    to={`/special/${item.path}`}
                    className={({ isActive }) => 
                      `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                    onClick={() => document.getElementById('specialSidebarOffcanvas')?.click()}
                  >
                    <i className={`bi ${item.icon} me-2`} style={{ fontSize: '1.1rem' }}></i>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  )
}