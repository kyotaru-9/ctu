import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.use(requireAdmin)

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
    const password = Math.random().toString(36).slice(-8) + 'A1!'

    // Create Supabase Auth user
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
      // Rollback section creation
      await supabaseAdmin.from('sections').delete().eq('id', section.id)
      throw authError
    }

    console.log('[Server] Auth user created:', authUser.user.id)

    // Create profile linking user to section
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: authUser.user.id,
      section_id: section.id,
      role: 'student',
      full_name: `${section.program} ${section.year_level}${section.section_name} Student`,
      is_active: true
    })

    if (profileError) {
      console.error('[Server] Profile creation failed:', profileError)
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      // Rollback section
      await supabaseAdmin.from('sections').delete().eq('id', section.id)
      throw profileError
    }

    console.log('[Server] Profile created for user:', authUser.user.id)

    res.json({
      success: true,
      data: section,
      credentials: {
        email,
        password,
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
router.get('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select('*, sections(id, program, year_level, section_name), rooms(*)').order('day_of_week').order('start_time')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedules' })
  }
})

router.post('/schedules', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').insert(req.body).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create schedule' })
  }
})

router.get('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select('*, sections(id, program, year_level, section_name), rooms(*)').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedule' })
  }
})

router.put('/schedules/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').update(req.body).eq('id', req.params.id).select().single()
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
router.get('/occupations', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select('*, sections(id, program, year_level, section_name), rooms(*), schedules(section_id, subject_name)').order('occupation_date', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load occupations' })
  }
})

router.get('/occupations/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('occupations').select('*, sections(id, program, year_level, section_name), rooms(*), schedules(section_id, subject_name), room_submissions(*)').eq('id', req.params.id).single()
    if (error) throw error
    res.json({ success: true, data })
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