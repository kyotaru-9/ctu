import { Router } from 'express'
import { requireStudentOrSpecial } from '../middleware/auth.js'
import { supabaseAdmin } from '../config/supabase.js'
import multer from 'multer'

const router = Router()
router.use(requireStudentOrSpecial)

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
const HISTORY_SELECT = '*, occupations(*)'

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
        room: sub.occupations?.rooms || sub.occupations?.room_id,
        subject: sub.occupations?.schedules?.subject_name || sub.occupations?.schedule_id,
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

// Student Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const sectionId = req.user.section_id
    const today = new Date().getDay()
    const todayStr = new Date().toISOString().split('T')[0]

    const [scheduleRes, submissionsRes, reportsRes] = await Promise.all([
      supabaseAdmin.from('schedules').select('id, section_id, room_id, subject_name, instructor_name, day_of_week, start_time, end_time, is_active, created_at, updated_at').eq('section_id', sectionId).eq('day_of_week', today).eq('is_active', true).order('start_time'),
      supabaseAdmin.from('room_submissions').select('id, occupation_id, section_id, room_id, submission_type, image_url, submitted_at, submitted_time, condition, notes, submitted_by, created_at').eq('section_id', sectionId).gte('submitted_at', todayStr),
      supabaseAdmin.from('reports').select('*, room:rooms(*), reason:report_reasons(*)').eq('section_id', sectionId).order('reported_at', { ascending: false }).limit(5)
    ])

    const todaysSchedule = scheduleRes.data || []
    const submissions = submissionsRes.data || []
    const reports = reportsRes.data || []

    // Fetch related data for schedules
    const roomIds = [...new Set(todaysSchedule.map(s => s.room_id))]
    const secIds = [...new Set(todaysSchedule.map(s => s.section_id))]
    const [roomsData, sectionsData] = await Promise.all([
      supabaseAdmin.from('rooms').select('id, room_code, room_name, building, floor').in('id', roomIds),
      supabaseAdmin.from('sections').select('id, program, year_level, section_name, shift, mayor_name').in('id', secIds)
    ])

    const enrichedSchedule = todaysSchedule.map(schedule => ({
      ...schedule,
      rooms: roomsData.data?.find(r => r.id === schedule.room_id) || null,
      sections: sectionsData.data?.find(s => s.id === schedule.section_id) || null
    }))

    const before = submissions.find(s => s.submission_type === 'before')
    const after = submissions.find(s => s.submission_type === 'after')

    res.json({
      success: true,
      data: {
        todaysSchedule: enrichedSchedule,
        submissionStatus: { before, after },
        recentReports: reports
      }
    })
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load dashboard' })
  }
})

// Student Schedule
router.get('/schedule', async (req, res) => {
  try {
    const { data: schedules, error } = await supabaseAdmin
      .from('schedules')
      .select('id, section_id, room_id, subject_name, instructor_name, day_of_week, start_time, end_time, is_active, created_at, updated_at')
      .eq('section_id', req.user.section_id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time')
    
    if (error) throw error

    // Fetch related data separately
    const roomIds = [...new Set(schedules.map(s => s.room_id))]
    const sectionIds = [...new Set(schedules.map(s => s.section_id))]
    
    const [roomsData, sectionsData] = await Promise.all([
      supabaseAdmin.from('rooms').select('id, room_code, room_name, building, floor').in('id', roomIds),
      supabaseAdmin.from('sections').select('id, program, year_level, section_name, shift, mayor_name').in('id', sectionIds)
    ])

    // Merge the data
    const enrichedSchedules = schedules.map(schedule => ({
      ...schedule,
      rooms: roomsData.data?.find(r => r.id === schedule.room_id) || null,
      sections: sectionsData.data?.find(s => s.id === schedule.section_id) || null
    }))

    res.json({ success: true, data: enrichedSchedules })
  } catch (err) {
    console.error('Schedule error:', err)
    res.status(500).json({ success: false, message: 'Failed to load schedule' })
  }
})

// Get schedules for a specific room (for QR scan flow)
router.get('/schedule/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const dayOfWeek = new Date().getDay()
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

// Student Submissions
router.post('/submissions/before', upload.single('image'), async (req, res) => {
  console.log('POST /submissions/before - body:', req.body);
  console.log('POST /submissions/before - file:', req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : 'no file');
  console.log('POST /submissions/before - user:', req.user ? { id: req.user.id, section_id: req.user.section_id } : 'no user');
  try {
    const { room_id, schedule_id, condition, notes } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }

    // Upload to Supabase Storage
    const fileName = `${req.user.section_id}/${req.user.id}/${Date.now()}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('room-submissions').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('room-submissions').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Create or find occupation - use schedule_id if provided
    let occupationQuery = supabaseAdmin.from('occupations').select('*').eq('section_id', req.user.section_id).eq('room_id', room_id).eq('occupation_date', new Date().toISOString().split('T')[0]).eq('status', 'active')
    
    if (schedule_id) {
      occupationQuery = occupationQuery.eq('schedule_id', schedule_id)
    }
    
    let occupation = await occupationQuery.limit(1).single()
    
    if (!occupation.data) {
      const insertData = {
        section_id: req.user.section_id,
        room_id,
        occupation_date: new Date().toISOString().split('T')[0],
        status: 'active'
      }
      if (schedule_id) {
        insertData.schedule_id = schedule_id
      }
      const { data: newOcc, error: occError } = await supabaseAdmin.from('occupations').insert(insertData).select().single()
      if (occError) throw occError
      occupation = newOcc
    }

    // Create submission
    const { data, error } = await supabaseAdmin.from('room_submissions').insert({
      occupation_id: occupation.data.id,
      section_id: req.user.section_id,
      room_id,
      submission_type: 'before',
      image_url: imageUrl,
      submitted_at: new Date().toISOString(),
      submitted_time: new Date().toTimeString().slice(0, 8),
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

router.post('/submissions/after', upload.single('image'), async (req, res) => {
  try {
    const { room_id, schedule_id, condition, notes } = req.body
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
    let occupationQuery = supabaseAdmin.from('occupations').select('*').eq('section_id', req.user.section_id).eq('room_id', room_id).eq('occupation_date', new Date().toISOString().split('T')[0]).eq('status', 'active')
    
    if (schedule_id) {
      occupationQuery = occupationQuery.eq('schedule_id', schedule_id)
    }
    
    let occupation = await occupationQuery.limit(1).single()
    
    if (!occupation.data) {
      const insertData = {
        section_id: req.user.section_id,
        room_id,
        occupation_date: new Date().toISOString().split('T')[0],
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
      submitted_at: new Date().toISOString(),
      submitted_time: new Date().toTimeString().slice(0, 8),
      condition: condition || 'clean',
      notes,
      submitted_by: req.user.id
    }).select().single()
    if (error) throw error

    // Update occupation status if both before and after are submitted
    const { data: subs } = await supabaseAdmin.from('room_submissions').select('*').eq('occupation_id', occupation.data.id)
    if (subs && subs.length === 2) {
      await supabaseAdmin.from('occupations').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', occupation.data.id)
    }

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit' })
  }
})

router.get('/submissions', async (req, res) => {
  try {
    const { data: submissions, error } = await supabaseAdmin
      .from('room_submissions')
      .select('id, occupation_id, section_id, room_id, submission_type, image_url, submitted_at, submitted_time, condition, notes, submitted_by, created_at')
      .eq('section_id', req.user.section_id)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error

    // Fetch related data separately
    const occupationIds = [...new Set(submissions.map(s => s.occupation_id))]
    const { data: occupations } = await supabaseAdmin
      .from('occupations')
      .select('id, section_id, room_id, schedule_id, occupation_date, started_at, ended_at, status, created_at, updated_at, rooms(id, room_code, room_name, building, floor), schedules(id, subject_name, instructor_name)')
      .in('id', occupationIds)

    // Merge the data
    const enrichedSubmissions = submissions.map(sub => ({
      ...sub,
      occupations: occupations?.find(o => o.id === sub.occupation_id) || null
    }))

    res.json({ success: true, data: groupByOccupation(enrichedSubmissions) })
  } catch (err) {
    console.error('Error loading submissions:', err)
    res.status(500).json({ success: false, message: 'Failed to load submissions' })
  }
})

// Student Reports
// Aliased to `room`/`reason` so the embeds land on the singular keys the reports
// table, details modal and dashboard read. An unaliased embed comes back under
// the table name, which left the Room and Reason columns empty.
router.get('/reports', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*, room:rooms(*), reason:report_reasons(*)')
      .eq('section_id', req.user.section_id)
      .order('reported_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('Reports error:', err)
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

// Student report reasons (public data)
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
  try {
    const sectionId = req.user?.section_id
    if (!sectionId) {
      return res.status(400).json({ success: false, message: 'User section not found' })
    }
    
    const { data: submissions, error } = await supabaseAdmin
      .from('room_submissions')
      .select('id, occupation_id, section_id, room_id, submission_type, image_url, submitted_at, submitted_time, condition, notes, submitted_by, created_at')
      .eq('section_id', sectionId)
      .order('submitted_at', { ascending: false })
    
    if (error) throw error

    // Fetch related data separately
    const occupationIds = [...new Set(submissions.map(s => s.occupation_id))]
    const { data: occupations } = await supabaseAdmin
      .from('occupations')
      .select('id, section_id, room_id, schedule_id, occupation_date, started_at, ended_at, status, created_at, updated_at, rooms(id, room_code, room_name, building, floor), schedules(id, subject_name, instructor_name)')
      .in('id', occupationIds)

    // Merge the data
    const enrichedSubmissions = submissions.map(sub => ({
      ...sub,
      occupations: occupations?.find(o => o.id === sub.occupation_id) || null
    }))

    res.json({ success: true, data: groupByOccupation(enrichedSubmissions) })
  } catch (err) {
    console.error('[Server] Error loading submissions:', err)
    res.status(500).json({ success: false, message: 'Failed to load submissions' })
  }
})

export default router
