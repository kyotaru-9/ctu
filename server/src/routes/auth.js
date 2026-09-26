import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    console.log('[Server] Login attempt:', { email, ip: req.ip })
    
    if (!email || !password) {
      console.log('[Server] Login failed: Missing credentials')
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'Missing credentials'
      })
    }
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.log('[Server] Login failed: Invalid credentials for', email)
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'Authentication failed'
      })
    }
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single()
    
    if (profileError || !profile) {
      console.log('[Server] Login failed: Profile not found for', data.user.id)
      return res.status(401).json({
        success: false,
        message: 'User profile not found',
        error: 'Profile missing'
      })
    }
    
    if (!profile.is_active) {
      await supabaseAdmin.auth.signOut()
      console.log('[Server] Login failed: Account deactivated for', email)
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: 'Account disabled'
      })
    }
    
    console.log('[Server] Login successful:', { userId: data.user.id, email: data.user.email, role: profile.role })
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      await supabaseAdmin.auth.admin.signOut(token)
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    next(error)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        error: 'Missing refresh_token'
      })
    }
    
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token
    })
    
    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        error: 'Token refresh failed'
      })
    }
    
    // Get updated profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single()
    
    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No valid authorization header'
      })
    }
    
    const token = authHeader.split(' ')[1]
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
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found',
        error: 'Profile missing'
      })
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        ...profile
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router