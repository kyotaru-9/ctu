import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

const SECTION_COLUMNS = 'id, program, year_level, section_name'

/**
 * Loads a profile row together with its section, exposed to the client as
 * `user.section`.
 *
 * The section is fetched with a second query rather than an embedded
 * `sections(...)` select on purpose: `profiles` has no foreign-key relationship
 * to `sections` for PostgREST to embed, so `select('*, sections(...)')` fails
 * the whole query and the profile lookup reports "not found" for every login.
 * `maybeSingle` keeps a null or dangling `section_id` from becoming an error —
 * an account with no section still signs in, it just has no section label.
 */
async function loadProfile(authUserId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error || !profile) return { profile: null, error }

  if (!profile.section_id) return { profile: { ...profile, section: null } }

  const { data: section, error: sectionError } = await supabaseAdmin
    .from('sections')
    .select(SECTION_COLUMNS)
    .eq('id', profile.section_id)
    .maybeSingle()

  if (sectionError) {
    console.log('[Server] Section lookup failed for profile', profile.id, '-', sectionError.message)
  }

  return { profile: { ...profile, section: section ?? null } }
}

/**
 * Merges the auth user and the profile into the session user.
 *
 * `email` is taken from the auth user rather than the profile: profiles.email is
 * nullable and nothing in this app writes it, so spreading the profile last used
 * to overwrite a good auth address with null.
 */
/**
 * Reads why a section was last deactivated, for the sign-in page to show.
 *
 * The reason is not a column on sections: it is the description of the most recent
 * audit_logs entry for that section. Reading the newest status entry — rather than
 * searching for a deactivation — means a section that has since been re-enabled
 * reports no reason, which is correct: the hold is over.
 *
 * Returns null rather than throwing. This runs on a failed sign-in, and a student
 * being told their section is inactive is more useful than a 500 about a lookup.
 */
async function readDeactivationReason(sectionId) {
  if (!sectionId) return null

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('action, description')
    .eq('entity_type', 'section')
    .eq('entity_id', sectionId)
    .in('action', ['section_deactivated', 'section_reactivated'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.log('[Server] Deactivation reason lookup failed:', error.message)
    return null
  }

  if (data?.[0]?.action !== 'section_deactivated') return null
  return data[0].description || null
}

function toSessionUser(id, email, profile) {
  if (!profile) return { id, email }
  return { id, ...profile, email: profile.email || email }
}

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
    
    const { profile, error: profileError } = await loadProfile(data.user.id)
    
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

      // The client sends the reader to a dedicated page rather than showing a
      // bare "Account is deactivated" in the form, so the response carries what
      // that page needs: who is locked out and which section asked for it. The
      // section is included because that is what an admin will ask for when the
      // student calls.
      const section = profile.section
      const sectionLabel = section
        ? [section.program, `${section.year_level}${section.section_name}`].filter(Boolean).join(' ')
        : null

      const reason = await readDeactivationReason(profile.section_id)

      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: 'Account disabled',
        data: {
          email,
          full_name: profile.full_name,
          role: profile.role,
          section: sectionLabel,
          reason
        }
      })
    }
    
    console.log('[Server] Login successful:', { userId: data.user.id, email: data.user.email, role: profile.role })
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: toSessionUser(data.user.id, data.user.email, profile)
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
    const { profile } = await loadProfile(data.user.id)
    
    res.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: toSessionUser(data.user.id, data.user.email, profile)
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
    
    const { profile, error: profileError } = await loadProfile(user.id)
    
    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found',
        error: 'Profile missing'
      })
    }
    
    res.json({
      success: true,
      data: toSessionUser(user.id, user.email, profile)
    })
  } catch (error) {
    next(error)
  }
})

export default router