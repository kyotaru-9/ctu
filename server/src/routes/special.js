import { Router } from 'express'
import { requireStudentSpecial } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'
import multer from 'multer'

const router = Router()
router.use(requireStudentSpecial)

const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'))
    }
  }
})

// Submission history reads from room_submissions but describes an occupation,
// so the occupation's room and schedule are aliased to singular keys and the
// date is read off the occupation — `occupation_date` is not a room_submissions
// column. The submission's own room embed is left out on purpose: aliasing it
// to `room` as well would collide with the occupation's and PostgREST would
// drop one of them.
const HISTORY_SELECT = '*, occupations(*, room:rooms(*), schedule:schedules(subject_name))'

/**
 * Collapses a flat list of room_submissions into one record per occupation with
 * the two submissions split out as `before`/`after`, which is the shape the
 * history page renders.
 */
function groupByOccupation(submissions) {
  const grouped = {}

  ;(submissions || []).forEach(sub => {
    const key = sub.occupation_id
    if (!grouped[key]) {
      grouped[key] = {
        id: sub.occupation_id,
        date: sub.occupations?.occupation_date,
        room: sub.occupations?.room,
        subject: sub.occupations?.schedule?.subject_name,
        before: null,
        after: null
      }
    }
    if (sub.submission_type === 'before') {
      grouped[key].before = sub
    } else if (sub.submission_type === 'after') {
      grouped[key].after = sub
    }
  })

  return Object.values(grouped)
}

// Special Student Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const sectionId = req.user.section_id
    const today = new Date().getDay()
    const todayStr = new Date().toISOString().split('T')[0]

    const [scheduleRes, submissionsRes] = await Promise.all([
      supabaseAdmin.from('schedules').select('*, rooms(*), sections(*)').eq('section_id', sectionId).eq('day_of_week', today).eq('is_active', true).order('start_time'),
      supabaseAdmin.from('room_submissions').select('*').eq('section_id', sectionId).gte('submitted_at', todayStr)
    ])

    const todaysSchedule = scheduleRes.data || []
    const submissions = submissionsRes.data || []

    const before = submissions.find(s => s.submission_type === 'before')
    const after = submissions.find(s => s.submission_type === 'after')

    res.json({
      success: true,
      data: {
        todaysSchedule,
        submissionStatus: { before, after }
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load dashboard' })
  }
})

// Special Student Schedule
router.get('/schedule', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('schedules').select('*, rooms(*), sections(*)').eq('section_id', req.user.section_id).eq('is_active', true).order('day_of_week').order('start_time')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load schedule' })
  }
})

// Get schedules for a specific room (for QR scan flow)
router.get('/schedule/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const { date } = req.query
    const dayOfWeek = date ? new Date(date).getDay() : new Date().getDay()
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('*, rooms(*), sections(*)')
      .eq('section_id', req.user.section_id)
      .eq('room_id', roomId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load room schedule' })
  }
})

// Special Student Submissions - Before
router.post('/submissions/before', upload.single('image'), async (req, res) => {
  try {
    const { room_id, schedule_id, submitted_date, submitted_time, condition, notes } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }

    const fileName = `${req.user.section_id}/${req.user.id}/${Date.now()}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('room-submissions').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('room-submissions').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Create or find occupation - use schedule_id if provided
    let occupationQuery = supabaseAdmin.from('occupations').select('*').eq('section_id', req.user.section_id).eq('room_id', room_id).eq('occupation_date', submitted_date).eq('status', 'active')
    
    if (schedule_id) {
      occupationQuery = occupationQuery.eq('schedule_id', schedule_id)
    }
    
    let occupation = await occupationQuery.limit(1).single()
    
    if (!occupation.data) {
      const insertData = {
        section_id: req.user.section_id,
        room_id,
        occupation_date: submitted_date,
        status: 'active'
      }
      if (schedule_id) {
        insertData.schedule_id = schedule_id
      }
      const { data: newOcc, error: occError } = await supabaseAdmin.from('occupations').insert(insertData).select().single()
      if (occError) throw occError
      occupation = newOcc
    }

    const { data, error } = await supabaseAdmin.from('room_submissions').insert({
      occupation_id: occupation.data.id,
      section_id: req.user.section_id,
      room_id,
      submission_type: 'before',
      image_url: imageUrl,
      submitted_at: `${submitted_date}T${submitted_time}:00`,
      submitted_time,
      condition: condition || 'clean',
      notes,
      submitted_by: req.user.id
    }).select().single()
    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit' })
  }
})

// Special Student Submissions - After
router.post('/submissions/after', upload.single('image'), async (req, res) => {
  try {
    const { room_id, schedule_id, submitted_date, submitted_time, condition, notes } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }

    const fileName = `${req.user.section_id}/${req.user.id}/${Date.now()}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('room-submissions').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('room-submissions').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Create or find occupation - use schedule_id if provided
    let occupationQuery = supabaseAdmin.from('occupations').select('*').eq('section_id', req.user.section_id).eq('room_id', room_id).eq('occupation_date', submitted_date).eq('status', 'active')
    
    if (schedule_id) {
      occupationQuery = occupationQuery.eq('schedule_id', schedule_id)
    }
    
    let occupation = await occupationQuery.limit(1).single()
    
    if (!occupation.data) {
      const insertData = {
        section_id: req.user.section_id,
        room_id,
        occupation_date: submitted_date,
        status: 'active'
      }
      if (schedule_id) {
        insertData.schedule_id = schedule_id
      }
      const { data: newOcc, error: occError } = await supabaseAdmin.from('occupations').insert(insertData).select().single()
      if (occError) throw occError
      occupation = newOcc
    }

    const { data, error } = await supabaseAdmin.from('room_submissions').insert({
      occupation_id: occupation.data.id,
      section_id: req.user.section_id,
      room_id,
      submission_type: 'after',
      image_url: imageUrl,
      submitted_at: `${submitted_date}T${submitted_time}:00`,
      submitted_time,
      condition: condition || 'clean',
      notes,
      submitted_by: req.user.id
    }).select().single()
    if (error) throw error

    const { data: subs } = await supabaseAdmin.from('room_submissions').select('*').eq('occupation_id', occupation.data.id)
    if (subs && subs.length === 2) {
      await supabaseAdmin.from('occupations').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', occupation.data.id)
    }

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit' })
  }
})

// Special Student Reports
router.get('/reports', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('reports').select('*, room:rooms(*), reason:report_reasons(*)').eq('section_id', req.user.section_id).order('reported_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load reports' })
  }
})

router.post('/reports', upload.single('image'), async (req, res) => {
  try {
    const { room_id, reason_id, other_reason, description } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image proof is required' })
    }

    const fileName = `reports/${req.user.section_id}/${Date.now()}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('report-proofs').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('report-proofs').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    const { data, error } = await supabaseAdmin.from('reports').insert({
      section_id: req.user.section_id,
      room_id,
      reason_id,
      other_reason,
      description,
      image_url: imageUrl,
      status: 'pending',
      reported_by: req.user.id
    }).select().single()
    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit report' })
  }
})

// Special Student report reasons (public data)
router.get('/report-reasons', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('report_reasons').select('*').eq('is_active', true).order('name')
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load report reasons' })
  }
})

// Alias for submissions/my -> submissions
router.get('/submissions/my', async (req, res) => {
  console.log('[Server] /submissions/my - user:', req.user ? { id: req.user.id, section_id: req.user.section_id, role: req.user.role } : 'no user');
  try {
    const { data, error } = await supabaseAdmin.from('room_submissions').select(HISTORY_SELECT).eq('section_id', req.user.section_id).order('submitted_at', { ascending: false })
    if (error) throw error

    res.json({ success: true, data: groupByOccupation(data) })
  } catch (err) {
    console.error('[Server] /submissions/my error:', err);
    res.status(500).json({ success: false, message: 'Failed to load submissions' })
  }
})

export default router
