import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.use(requireAdmin)

/** Shared password shape: eight random base-36 characters plus a fixed tail. */
function generatePassword() {
  return Math.random().toString(36).slice(-8) + 'A1!'
}

router.get('/dashboard', async (req, res) => {
  try {
    const [sectionsRes, roomsRes, occupationsRes, reportsRes] = await Promise.all([
      supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('occupations').select('id', { count: 'exact', head: true }).eq('occupation_date', new Date().toISOString().split('T')[0]),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true })
    ])

    res.json({
      success: true,
      data: {
        totalSections: sectionsRes.count || 0,
        totalRooms: roomsRes.count || 0,
        todaysOccupations: occupationsRes.count || 0,
        totalReports: reportsRes.count || 0
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load dashboard' })
  }
})

// Sections
router.get('/sections', async (req, res) => {
  try {
    console.log('[Server] GET /sections - fetching sections')
    const { data, error } = await supabaseAdmin.from('sections').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[Server] Supabase error fetching sections:', error)
      throw error
    }
    console.log('[Server] Sections fetched:', data?.length)
    res.json({ success: true, data })
  } catch (err) {
    console.error('[Server] Error fetching sections:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to load sections' })
  }
})

router.post('/sections', async (req, res) => {
  try {
    console.log('[Server] Creating section with data:', req.body)
    const { data: section, error: sectionError } = await supabaseAdmin.from('sections').insert(req.body).select().single()
    if (sectionError) {
      console.error('[Server] Supabase error creating section:', sectionError)
      throw sectionError
    }
    console.log('[Server] Section created:', section)

    // Generate email and password for student account
    const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
    const email = `${sectionCode}@ctu.edu.ph`
    const password = generatePassword()

    // Create Supabase Auth user for regular student
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        section_id: section.id,
        section_name: `${section.program} ${section.year_level}${section.section_name}`,
        role: 'student'
      }
    })

    if (authError) {
      console.error('[Server] Auth user creation failed:', authError)
      await supabaseAdmin.from('sections').delete().eq('id', section.id)
      throw authError
    }

    console.log('[Server] Auth user created:', authUser.user.id)

    // Create profile for regular student
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: authUser.user.id,
      section_id: section.id,
      role: 'student',
      full_name: `${section.program} ${section.year_level}${section.section_name} Student`,
      is_active: true
    })

    if (profileError) {
      console.error('[Server] Profile creation failed:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin.from('sections').delete().eq('id', section.id)
      throw profileError
    }

    console.log('[Server] Profile created for user:', authUser.user.id)

    // Create Supabase Auth user for student_special
    const specialEmail = `special-${sectionCode}@ctu.edu.ph`
    const specialPassword = generatePassword()

    const { data: specialAuthUser, error: specialAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: specialEmail,
      password: specialPassword,
      email_confirm: true,
      user_metadata: {
        section_id: section.id,
        section_name: `${section.program} ${section.year_level}${section.section_name} (Special)`,
        role: 'student_special'
      }
    })

    if (specialAuthError) {
      console.error('[Server] Special auth user creation failed:', specialAuthError)
      // Don't rollback everything, just log error
    } else {
      console.log('[Server] Special auth user created:', specialAuthUser.user.id)

      // Create profile for student_special
      const { error: specialProfileError } = await supabaseAdmin.from('profiles').insert({
        auth_user_id: specialAuthUser.user.id,
        section_id: section.id,
        role: 'student_special',
        full_name: `${section.program} ${section.year_level}${section.section_name} Special Student`,
        is_active: true
      })

      if (specialProfileError) {
        console.error('[Server] Special profile creation failed:', specialProfileError)
      } else {
        console.log('[Server] Special profile created for user:', specialAuthUser.user.id)
      }
    }

    res.json({
      success: true,
      data: section,
      credentials: {
        email,
        password,
        section_id: section.id
      },
      specialCredentials: specialAuthError ? null : {
        email: specialEmail,
        password: specialPassword,
        section_id: section.id
      }
    })
  } catch (err) {
    console.error('[Server] Error creating section:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to create section' })
  }
})

router.get('/sections/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('sections').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load section' })
  }
})

router.put('/sections/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('sections').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update section' })
  }
})

// Update student roles for a section
router.put('/sections/:id/roles', async (req, res) => {
  try {
    const { sectionId } = req.params
    const { studentEnabled, specialEnabled } = req.body

    // Update regular student profile
    if (studentEnabled !== undefined) {
      const { data: studentProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('section_id', sectionId)
        .eq('role', 'student')

      if (studentProfiles && studentProfiles.length > 0) {
        for (const profile of studentProfiles) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: studentEnabled })
            .eq('id', profile.id)
          
          // Also update auth user
          await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
            user_metadata: { ...profile, is_active: studentEnabled }
          })
        }
      } else if (studentEnabled) {
        // Create new student if doesn't exist
        const { data: section } = await supabaseAdmin.from('sections').select('*').eq('id', sectionId).single()
        if (section) {
          const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
          const email = `${sectionCode}@ctu.edu.ph`
          const password = generatePassword()

          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
            email, password, email_confirm: true,
            user_metadata: { section_id: section.id, section_name: `${section.program} ${section.year_level}${section.section_name}`, role: 'student' }
          })
          
          if (authUser.user) {
            await supabaseAdmin.from('profiles').insert({
              auth_user_id: authUser.user.id,
              section_id: section.id,
              role: 'student',
              full_name: `${section.program} ${section.year_level}${section.section_name} Student`,
              is_active: true
            })
          }
        }
      }
    }

    // Update special student profile
    if (specialEnabled !== undefined) {
      const { data: specialProfiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('section_id', sectionId)
        .eq('role', 'student_special')

      if (specialProfiles && specialProfiles.length > 0) {
        for (const profile of specialProfiles) {
          await supabaseAdmin
            .from('profiles')
            .update({ is_active: specialEnabled })
            .eq('id', profile.id)
          
          await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
            user_metadata: { ...profile, is_active: specialEnabled }
          })
        }
      } else if (specialEnabled) {
        // Create new special student if doesn't exist
        const { data: section } = await supabaseAdmin.from('sections').select('*').eq('id', sectionId).single()
        if (section) {
          const sectionCode = `${section.program.toLowerCase()}-${section.year_level}${section.section_name.toLowerCase()}`.replace(/\s+/g, '')
          const specialEmail = `special-${sectionCode}@ctu.edu.ph`
          const specialPassword = generatePassword()

          const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
            email: specialEmail, password: specialPassword, email_confirm: true,
            user_metadata: { section_id: section.id, section_name: `${section.program} ${section.year_level}${section.section_name} (Special)`, role: 'student_special' }
          })
          
          if (authUser.user) {
            await supabaseAdmin.from('profiles').insert({
              auth_user_id: authUser.user.id,
              section_id: section.id,
              role: 'student_special',
              full_name: `${section.program} ${section.year_level}${section.section_name} Special Student`,
              is_active: true
            })
          }
        }
      }
    }

    res.json({ success: true, message: 'Roles updated' })
  } catch (err) {
    console.error('[Server] Error updating roles:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to update roles' })
  }
})

/**
 * Regenerates the password on every login account a section owns.
 *
 * Addresses are derived once when the section is created and are never changed,
 * so each new password is handed back against the existing email. A section can
 * own both a regular and a special-student login, so accounts are returned as a
 * list and the admin is shown one block per role. Sections with no account yet
 * get a 404 rather than an invented address — the admin creates those
 * explicitly through the add-section or roles flow.
 */
router.post('/sections/:id/regenerate-credentials', async (req, res) => {
  try {
    const { id: sectionId } = req.params

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('auth_user_id, role')
      .eq('section_id', sectionId)

    if (profileError) throw profileError

    if (!profiles?.length) {
      return res.status(404).json({
        success: false,
        message: 'This section has no student account yet',
        error: 'No accounts found'
      })
    }

    const accounts = []

    for (const profile of profiles) {
      // Read the address first: it is the one piece of the credential the admin
      // cannot reconstruct, and it never changes.
      const { data: existing, error: readError } = await supabaseAdmin.auth.admin.getUserById(
        profile.auth_user_id
      )

      if (readError || !existing?.user?.email) {
        console.error(
          '[Server] Could not read account',
          profile.auth_user_id,
          '-',
          readError?.message
        )
        continue
      }

      const password = generatePassword()
      const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_user_id, {
        password
      })

      if (error) {
        console.error('[Server] Password reset failed for', profile.auth_user_id, '-', error.message)
        continue
      }

      accounts.push({
        role: profile.role,
        email: existing.user.email,
        password,
        section_id: sectionId
      })
    }

    if (!accounts.length) {
      return res.status(500).json({
        success: false,
        message: 'Could not reset the password for any account',
        error: 'Reset failed'
      })
    }

    const skipped = profiles.length - accounts.length
    if (skipped > 0) {
      console.log('[Server] Regenerate credentials: skipped', skipped, 'account(s) for section', sectionId)
    }

    console.log('[Server] Regenerated credentials for section', sectionId, '-', accounts.length, 'account(s)')
    res.json({ success: true, message: 'Password regenerated', data: { accounts, skipped } })
  } catch (err) {
    console.error('[Server] Error regenerating credentials:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to regenerate credentials' })
  }
})

router.delete('/sections/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('sections').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Section deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete section' })
  }
})

router.patch('/sections/:id/status', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('sections').update({ is_active: req.body.is_active }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update section status' })
  }
})

// Rooms
router.get('/rooms', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load rooms' })
  }
})

router.post('/rooms', async (req, res) => {
  try {
    const crypto = await import('crypto')
    const qrToken = 'qr_' + crypto.randomBytes(32).toString('hex')
    const { data, error } = await supabaseAdmin.from('rooms').insert({ ...req.body, qr_token: qrToken }).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create room' })
  }
})

router.get('/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').select('*').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load room' })
  }
})

router.put('/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rooms').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update room' })
  }
})

router.delete('/rooms/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Room deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete room' })
  }
})

router.post('/rooms/:id/regenerate-qr', async (req, res) => {
  try {
    const crypto = await import('crypto')
    const qrToken = 'qr_' + crypto.randomBytes(32).toString('hex')
    const { data, error } = await supabaseAdmin.from('rooms').update({ qr_token: qrToken, qr_generated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to regenerate QR' })
  }
})

// Schedules
// Aliased so the embed lands on `section`/`room`, which is what the admin
// schedule table, edit form and delete prompt all read.
const SCHEDULE_SELECT = '*, section:sections(*), room:rooms(*)'

router.get('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select(SCHEDULE_SELECT).order('day_of_week').order('start_time')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedules' })
  }
})

router.post('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').insert(req.body).select(SCHEDULE_SELECT).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create schedule' })
  }
})

router.get('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select(SCHEDULE_SELECT).eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedule' })
  }
})

router.put('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').update(req.body).eq('id', req.params.id).select(SCHEDULE_SELECT).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule' })
  }
})

router.delete('/schedules/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('schedules').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Schedule deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete schedule' })
  }
})

// Occupations
// PostgREST keys an embed by the name written in the select, so the aliases
// below are what put `section`/`room`/`schedule` on the row instead of the
// plural table names.
const OCCUPATION_EMBEDS = 'section:sections(id, program, year_level, section_name), room:rooms(*), schedule:schedules(id, section_id, subject_name, instructor_name)'

// The list only needs enough of each submission to draw its Before/After
// column; the detail view fetches the full rows (image_url, notes).
const OCCUPATION_LIST_SELECT = `*, ${OCCUPATION_EMBEDS}, room_submissions(id, submission_type, submitted_at, condition)`
const OCCUPATION_DETAIL_SELECT = `*, ${OCCUPATION_EMBEDS}, room_submissions(*)`

/**
 * Flattens an occupation row for the admin UI: the aliased embeds are already
 * singular, so the only reshaping left is splitting the two room_submissions
 * rows into `before` and `after` by their submission_type.
 */
function shapeOccupation(occupation) {
  const { room_submissions: submissions, ...rest } = occupation
  const shaped = { ...rest, before: null, after: null }

  ;(submissions || []).forEach((submission) => {
    if (submission.submission_type === 'before') shaped.before = submission
    if (submission.submission_type === 'after') shaped.after = submission
  })

  return shaped
}

router.get('/occupations', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select(OCCUPATION_LIST_SELECT).order('occupation_date', { ascending: false })
    if (error) throw error
    res.json({ success: true, data: (data || []).map(shapeOccupation) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load occupations' })
  }
})

router.get('/occupations/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select(OCCUPATION_DETAIL_SELECT).eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data: shapeOccupation(data) })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load occupation' })
  }
})

// Reports
router.get('/reports', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('*, sections(id, program, year_level, section_name), rooms(*), reason:report_reasons(*)').order('reported_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load reports' })
  }
})

router.get('/reports/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('*, sections(*), rooms(*), reason:report_reasons(*)').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report' })
  }
})

router.patch('/reports/:id/status', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').update({ status: req.body.status, admin_note: req.body.admin_note, reviewed_at: new Date().toISOString(), reviewed_by: req.user.id }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update report status' })
  }
})

// Report Reasons
router.get('/report-reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').select('*').order('name')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report reasons' })
  }
})

router.post('/report-reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').insert(req.body).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create report reason' })
  }
})

router.put('/report-reasons/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update report reason' })
  }
})

router.delete('/report-reasons/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from('report_reasons').update({ is_active: false }).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Report reason deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete report reason' })
  }
})

// Analytics
router.get('/analytics/overview', async (req, res) => {
  try {
    const [sectionsRes, roomsRes, reportsRes, submissionsRes] = await Promise.all([
      supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('reports').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('room_submissions').select('id', { count: 'exact', head: true })
    ])

    res.json({
      success: true,
      data: {
        totalSections: sectionsRes.count || 0,
        totalRooms: roomsRes.count || 0,
        totalReports: reportsRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
        avgCompliance: 85
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load analytics' })
  }
})

router.get('/analytics/sections', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('compliance_records').select('*, sections(*)').order('period_start', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load section compliance' })
  }
})

router.get('/analytics/rooms', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('room_id, reason:report_reasons(name)').order('reported_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load room issues' })
  }
})

router.get('/analytics/reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').select('id, name, count:reports(count)')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report reasons' })
  }
})

router.get('/analytics/trends', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('reported_at').gte('reported_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load trends' })
  }
})

// Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load audit logs' })
  }
})

export default router