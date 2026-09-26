import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/auth/Login'
import AdminLayout from './layouts/AdminLayout'
import StudentLayout from './layouts/StudentLayout'
import SpecialStudentLayout from './layouts/SpecialStudentLayout'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminSections from './pages/admin/Sections'
import AdminRooms from './pages/admin/Rooms'
import AdminSchedules from './pages/admin/Schedules'
import AdminOccupations from './pages/admin/Occupations'
import AdminReports from './pages/admin/Reports'
import AdminAnalytics from './pages/admin/Analytics'
import AdminAuditLogs from './pages/admin/AuditLogs'
import AdminSettings from './pages/admin/Settings'
import AdminQRPrint from './pages/admin/QRPrint'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import StudentSchedule from './pages/student/Schedule'
import StudentScan from './pages/student/Scan'
import StudentSubmit from './pages/student/Submit'
import StudentReports from './pages/student/Reports'
import StudentHistory from './pages/student/History'

// Special Student Pages
import SpecialDashboard from './pages/special/Dashboard'
import SpecialBefore from './pages/special/Before'
import SpecialAfter from './pages/special/After'
import SpecialSchedule from './pages/special/Schedule'
import SpecialReports from './pages/special/Reports'
import SpecialHistory from './pages/special/History'

// Public Routes
import QRScan from './pages/QRScan'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  
  console.log('[ProtectedRoute] Check:', { loading, user: user ? { role: user.role, id: user.id } : null, allowedRoles })
  
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }
  
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('[ProtectedRoute] Role mismatch:', { userRole: user.role, allowedRoles })
    return <Navigate to="/login" replace />
  }
  
  console.log('[ProtectedRoute] Access granted, rendering children')
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/scan/:qrToken" element={<QRScan />} />
      
      {/* Admin Routes */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminSections />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="occupations" element={<AdminOccupations />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="qr-print/:roomId" element={<AdminQRPrint />} />
      </Route>
      
      {/* Student Routes */}
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="scan" element={<StudentScan />} />
        <Route path="submit" element={<StudentSubmit />} />
        <Route path="reports" element={<StudentReports />} />
        <Route path="history" element={<StudentHistory />} />
      </Route>
      
      {/* Student Special Routes */}
      <Route 
        path="/special/*" 
        element={
          <ProtectedRoute allowedRoles={['student_special']}>
            <SpecialStudentLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SpecialDashboard />} />
        <Route path="before" element={<SpecialBefore />} />
        <Route path="after" element={<SpecialAfter />} />
        <Route path="schedule" element={<SpecialSchedule />} />
        <Route path="reports" element={<SpecialReports />} />
        <Route path="history" element={<SpecialHistory />} />
      </Route>
      
      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App