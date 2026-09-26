import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Navbar, Nav, Container, Button, DropdownButton, Dropdown } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import {
  biDashboard, biPeople, biDoorOpen, biCalendar, biClipboard,
  biExclamation, biGraph, biJournal, biSettings, biBoxArrowRight,
  biPersonBadge, biList, biSun, biMoon
} from '../utils/icons'

const navItems = [
  { path: 'dashboard', label: 'Dashboard', icon: biDashboard },
  { path: 'students', label: 'Students / Sections', icon: biPeople },
  { path: 'rooms', label: 'Rooms', icon: biDoorOpen },
  { path: 'schedules', label: 'Schedules', icon: biCalendar },
  { path: 'occupations', label: 'Occupations', icon: biClipboard },
  { path: 'reports', label: 'Reports', icon: biExclamation },
  { path: 'analytics', label: 'Analytics', icon: biGraph },
  { path: 'audit-logs', label: 'Audit Logs', icon: biJournal },
  { path: 'settings', label: 'Settings', icon: biSettings },
]

export default function AdminLayout() {
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
          <NavLink to="/admin/dashboard" className="text-white text-decoration-none d-flex align-items-center">
            <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-gradient rounded-3 me-2" style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-building text-white" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h5 className="mb-0 fw-bold">CTU Clean-Track</h5>
              <small className="text-muted">Admin Panel</small>
            </div>
          </NavLink>
        </div>
        
        <nav className="flex-grow-1 p-2">
          <ul className="nav flex-column">
            {navItems.map((item) => (
              <li key={item.path} className="mb-1">
                <NavLink
                  to={`/admin/${item.path}`}
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
            <div className="bg-primary bg-gradient rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '36px', height: '36px' }}>
              <i className={`bi ${biPersonBadge} text-white`}></i>
            </div>
            <div className="flex-grow-1 min-width-0">
              <div className="fw-medium text-truncate">{user?.full_name || 'Administrator'}</div>
              <small className="text-muted">Administrator</small>
            </div>
          </div>
          <Button variant="outline-light" className="w-100 d-flex align-items-center justify-content-center" onClick={handleLogout}>
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
                  data-bs-target="#sidebarOffcanvas"
                  aria-controls="sidebarOffcanvas"
                >
                  <i className="bi bi-list"></i>
                </Button>
              </div>
              
              <div className="d-flex align-items-center gap-3 ms-auto">
                <div className="d-none d-md-flex align-items-center gap-2 text-muted small">
                  <i className={`bi ${biSun}`}></i>
                  <span>Light Mode</span>
                  <Button variant="outline-secondary" size="sm" className="py-0 px-2" style={{ width: '36px', height: '36px' }}>
                    <i className={`bi ${biMoon}`}></i>
                  </Button>
                </div>
                
                <DropdownButton
                  as={Nav.Item}
                  title={
                    <div className="d-flex align-items-center gap-2">
                      <div className="bg-primary bg-gradient rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                        <i className={`bi ${biPersonBadge} text-white`}></i>
                      </div>
                      <div className="d-none d-md-block text-end">
                        <div className="fw-medium small">{user?.full_name || 'Admin'}</div>
                        <small className="text-muted">Administrator</small>
                      </div>
                    </div>
                  }
                  id="admin-dropdown"
                  className="me-2"
                >
                  <Dropdown.Item as={NavLink} to="/admin/settings" onClick={() => document.getElementById('admin-dropdown')?.click()}>
                    <i className={`bi ${biSettings} me-2`}></i> Settings
                  </Dropdown.Item>
                  <Dropdown.Divider />
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
      
      <div className="offcanvas offcanvas-start" tabIndex="-1" id="sidebarOffcanvas" aria-labelledby="sidebarOffcanvasLabel">
        <div className="offcanvas-header bg-dark text-white">
          <h5 className="offcanvas-title" id="sidebarOffcanvasLabel">
            <i className={`bi ${biList} me-2`}></i> Menu
          </h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0">
          <nav className="p-2">
            <ul className="nav flex-column">
              {navItems.map((item) => (
                <li key={item.path} className="mb-1">
                  <NavLink
                    to={`/admin/${item.path}`}
                    className={({ isActive }) => 
                      `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                    onClick={() => document.getElementById('sidebarOffcanvas')?.click()}
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