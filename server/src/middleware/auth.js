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

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'Insufficient permissions'
    })
  }
  next()
}

export function requireStudent(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Student access required',
      error: 'Insufficient permissions'
    })
  }
  next()
}

export function requireStudentSpecial(req, res, next) {
  if (req.user.role !== 'student_special') {
    return res.status(403).json({
      success: false,
      message: 'Student Special access required',
      error: 'Insufficient permissions'
    })
  }
  next()
}

export function requireStudentOrSpecial(req, res, next) {
  if (!['student', 'student_special'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Student access required',
      error: 'Insufficient permissions'
    })
  }
  next()
}