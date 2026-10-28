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
        educator: sub.occupations?.schedules?.educator_id,
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
      supabaseAdmin.from('schedules').select('id, section_id, room_id, subject_name, educator_id, day_of_week, start_time, end_time, is_active, created_at, updated_at').eq('section_id', sectionId).eq('day_of_week', today).eq('is_active', true).order('start_time'),
      supabaseAdmin.from('room_submissions').select('id, occupation_id, section_id, room_id, submission_type, image_url, submitted_at, submitted_time, condition, notes, submitted_by, created_at').eq('section_id', sectionId).gte('submitted_at', todayStr),
      supabaseAdmin.from('reports').select('*, room:rooms(*), reason:report_reasons(*)').eq('section_id', sectionId).order('reported_at', { ascending: false }).limit(5)
    ])

    const todaysSchedule = scheduleRes.data || []
    const submissions = submissionsRes.data || []
    const reports = reportsRes.data || []

    // Fetch related data for schedules
    const roomIds = [...new Set(todaysSchedule.map(s => s.room_id))]
    const secIds = [...new Set(todaysSchedule.map(s => s.section_id))]
    const educatorIds = [...new Set(todaysSchedule.map(s => s.educator_id).filter(Boolean))]
    const [roomsData, sectionsData, educatorsData] = await Promise.all([
      supabaseAdmin.from('rooms').select('id, room_code, floor').in('id', roomIds),
      supabaseAdmin.from('sections').select('id, program, year_level, section_name, shift, mayor_name').in('id', secIds),
      educatorIds.length > 0 ? supabaseAdmin.from('educators').select('id, name, department').in('id', educatorIds) : Promise.resolve({ data: [] })
    ])

    const enrichedSchedule = todaysSchedule.map(schedule => ({
      ...schedule,
      rooms: roomsData.data?.find(r => r.id === schedule.room_id) || null,
      sections: sectionsData.data?.find(s => s.id === schedule.section_id) || null,
      educator: educatorsData.data?.find(e => e.id === schedule.educator_id) || null
    }))

    const before = submissions.find(s => s.submission_type === 'before')
    const after = submissions.find(s => s.submission_type === 'after')

    // Calculate compliance
    const totalExpected = todaysSchedule.length * 2
    const submittedCount = (before ? 1 : 0) + (after ? 1 : 0)
    const compliance = totalExpected > 0 ? Math.round((submittedCount / totalExpected) * 100) : 0

    res.json({
      success: true,
      data: {
        todaysSchedule: enrichedSchedule,
        submissionStatus: { before, after },
        compliance,
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
      .select('id, section_id, room_id, subject_name, educator_id, day_of_week, start_time, end_time, is_active, created_at, updated_at')
      .eq('section_id', req.user.section_id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time')

    if (error) throw error

    // Fetch related data separately
    const roomIds = [...new Set(schedules.map(s => s.room_id))]
    const sectionIds = [...new Set(schedules.map(s => s.section_id))]
    const educatorIds = [...new Set(schedules.map(s => s.educator_id).filter(Boolean))]

    const [roomsData, sectionsData, educatorsData] = await Promise.all([
      supabaseAdmin.from('rooms').select('id, room_code, floor').in('id', roomIds),
      supabaseAdmin.from('sections').select('id, program, year_level, section_name, shift, mayor_name').in('id', sectionIds),
      educatorIds.length > 0 ? supabaseAdmin.from('educators').select('id, name, department').in('id', educatorIds) : Promise.resolve({ data: [] })
    ])

    // Merge the data
    const enrichedSchedules = schedules.map(schedule => ({
      ...schedule,
      rooms: roomsData.data?.find(r => r.id === schedule.room_id) || null,
      sections: sectionsData.data?.find(s => s.id === schedule.section_id) || null,
      educator: educatorsData.data?.find(e => e.id === schedule.educator_id) || null
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
      .select('id, section_id, room_id, schedule_id, occupation_date, started_at, ended_at, status, created_at, updated_at, rooms(id, room_code, floor), schedules(id, subject_name, educator_id)')
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
      .select('id, section_id, room_id, schedule_id, occupation_date, started_at, ended_at, status, created_at, updated_at, rooms(id, room_code, floor), schedules(id, subject_name, educator_id)')
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

// Rotational Cleaning - Get today's assignment
router.get('/rotational/today', async (req, res) => {
  try {
    const sectionId = req.user.section_id
    const jsDay = new Date().getDay()
    // Convert JS day (0=Sunday, 1=Monday, ..., 6=Saturday) to DB day (1=Monday, ..., 7=Sunday)
    const dbDay = jsDay === 0 ? 7 : jsDay
    const todayStr = new Date().toISOString().split('T')[0]

    console.log('Rotational query:', { sectionId, jsDay, dbDay, todayStr })

    // Get today's assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('area_assignments')
      .select('*, area:areas(*)')
      .eq('section_id', sectionId)
      .eq('day_of_week', dbDay)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    console.log('Assignment result:', { assignment, assignError })

    if (assignError && assignError.code !== 'PGRST116') throw assignError

    // Check if there's already a cleaning record for today
    let existingRecord = null
    if (assignment) {
      const { data: record, error: recordError } = await supabaseAdmin
        .from('cleaning_records')
        .select('*')
        .eq('section_id', sectionId)
        .eq('area_id', assignment.area_id)
        .gte('submitted_at', todayStr)
        .limit(1)
        .maybeSingle()

      if (!recordError) existingRecord = record
    }

    res.json({
      success: true,
      data: {
        assignment: assignment || null,
        existingRecord: existingRecord || null
      }
    })
  } catch (err) {
    console.error('Rotational error:', err)
    res.status(500).json({ success: false, message: 'Failed to load rotational assignment' })
  }
})

// Rotational Cleaning - Submit before photo
router.post('/rotational/before', upload.single('image'), async (req, res) => {
  try {
    const { area_id, image_number } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }

    if (!area_id) {
      return res.status(400).json({ success: false, message: 'Area ID is required' })
    }

    const imageNum = image_number || '1'

    // Upload to Supabase Storage
    const fileName = `rotational/${req.user.section_id}/${Date.now()}-before-${imageNum}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('cleaning-records').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('cleaning-records').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Create or update cleaning record
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('cleaning_records')
      .select('*')
      .eq('section_id', req.user.section_id)
      .eq('area_id', area_id)
      .gte('submitted_at', todayStr)
      .limit(1)
      .maybeSingle()

    let data
    if (existing) {
      // Update existing record
      const updateData = {
        status: 'pending'
      }
      if (imageNum === '1') {
        updateData.before_image_url = imageUrl
        updateData.before_captured_at = new Date().toISOString()
      } else {
        updateData.before_image_url_2 = imageUrl
        updateData.before_captured_at_2 = new Date().toISOString()
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('cleaning_records')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()
      if (updateError) throw updateError
      data = updated
    } else {
      // Create new record
      const insertData = {
        section_id: req.user.section_id,
        area_id,
        status: 'pending'
      }
      if (imageNum === '1') {
        insertData.before_image_url = imageUrl
        insertData.before_captured_at = new Date().toISOString()
      } else {
        insertData.before_image_url_2 = imageUrl
        insertData.before_captured_at_2 = new Date().toISOString()
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from('cleaning_records')
        .insert(insertData)
        .select()
        .single()
      if (createError) throw createError
      data = created
    }

    res.json({ success: true, data })
  } catch (err) {
    console.error('Rotational before error:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to submit before photo' })
  }
})

// Rotational Cleaning - Submit after photo
router.post('/rotational/after', upload.single('image'), async (req, res) => {
  try {
    const { area_id, image_number } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, message: 'Image is required' })
    }

    if (!area_id) {
      return res.status(400).json({ success: false, message: 'Area ID is required' })
    }

    const imageNum = image_number || '1'

    // Upload to Supabase Storage
    const fileName = `rotational/${req.user.section_id}/${Date.now()}-after-${imageNum}-${file.originalname}`
    const { error: uploadError } = await supabaseAdmin.storage.from('cleaning-records').upload(fileName, file.buffer, {
      contentType: file.mimetype
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from('cleaning-records').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Find today's record
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('cleaning_records')
      .select('*')
      .eq('section_id', req.user.section_id)
      .eq('area_id', area_id)
      .gte('submitted_at', todayStr)
      .limit(1)
      .single()

    if (checkError || !existing) {
      return res.status(400).json({ success: false, message: 'No before photo found for today. Please submit before photo first.' })
    }

    // Update record with after photo
    const updateData = {
      status: 'completed'
    }
    if (imageNum === '1') {
      updateData.after_image_url = imageUrl
      updateData.after_captured_at = new Date().toISOString()
    } else {
      updateData.after_image_url_2 = imageUrl
      updateData.after_captured_at_2 = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('cleaning_records')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) throw updateError

    res.json({ success: true, data: updated })
  } catch (err) {
    console.error('Rotational after error:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to submit after photo' })
  }
})

// Rotational Cleaning - Get history
router.get('/rotational/history', async (req, res) => {
  try {
    const { data: records, error } = await supabaseAdmin
      .from('cleaning_records')
      .select('*, area:areas(*)')
      .eq('section_id', req.user.section_id)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Rotational history query error:', error)
      throw error
    }

    res.json({ success: true, data: records || [] })
  } catch (err) {
    console.error('Rotational history error:', err)
    res.status(500).json({ success: false, message: 'Failed to load rotational history' })
  }
})

// Rotational Cleaning - Get weekly schedule
router.get('/rotational/schedule', async (req, res) => {
  try {
    const { data: assignments, error } = await supabaseAdmin
      .from('area_assignments')
      .select('*, area:areas(*)')
      .eq('section_id', req.user.section_id)
      .eq('is_active', true)
      .order('day_of_week')

    if (error) {
      console.error('Rotational schedule query error:', error)
      throw error
    }

    res.json({ success: true, data: assignments || [] })
  } catch (err) {
    console.error('Rotational schedule error:', err)
    res.status(500).json({ success: false, message: 'Failed to load rotational schedule' })
  }
})

export default router
