import { supabaseAdmin } from '../config/supabase.js'

export async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'No valid authorization header'
    })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'Authentication failed'
      })
    }
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, role, full_name, email, section_id, is_active, created_at, updated_at')
      .eq('auth_user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found',
        error: 'Profile missing'
      })
    }
    
    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: 'Account disabled'
      })
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      ...profile
    }
    
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: 'Invalid token'
    })
  }
}

/**
 * Builds a role guard.
 *
 * The missing-user case is checked before the role is read, because dereferencing
 * an absent req.user throws a TypeError and surfaces as a 500 — an
 * unauthenticated request reported as a server fault. Every guard here is mounted
 * after authenticateUser, so req.user is set by the time it runs; the check is
 * there so a route mounted without it fails closed as a 401 rather than open, or
 * confusingly, as a crash.
 *
 * Built once here rather than repeated four times, so the four guards cannot
 * drift apart on which failure they report.
 */
function requireRole(roles, message) {
  const allowed = Array.isArray(roles) ? roles : [roles]

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No authenticated user'
      })
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message,
        error: 'Insufficient permissions'
      })
    }

    next()
  }
}

export const requireAdmin = requireRole('admin', 'Admin access required')
export const requireStudent = requireRole('student', 'Student access required')
export const requireStudentSpecial = requireRole('student_special', 'Student Special access required')
export const requireStudentOrSpecial = requireRole(['student', 'student_special'], 'Student access required')