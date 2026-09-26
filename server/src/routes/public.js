import { Router } from 'express'
import { supabaseAdmin } from '../config/supabase.js'

const router = Router()

router.get('/rooms/qr/:token', async (req, res, next) => {
  try {
    const { token } = req.params
    
    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select('id, room_code, room_name, building, floor, is_active')
      .eq('qr_token', token)
      .single()
    
    if (error || !room) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code',
        error: 'Room not found'
      })
    }
    
    if (!room.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Room is inactive',
        error: 'Room not available'
      })
    }
    
    res.json({
      success: true,
      data: room
    })
  } catch (error) {
    next(error)
  }
})

router.get('/report-reasons', async (req, res, next) => {
  try {
    const { data: reasons, error } = await supabaseAdmin
      .from('report_reasons')
      .select('*')
      .eq('is_active', true)
      .order('name')
   
    if (error) {
      throw error
    }
    
    res.json({
      success: true,
      data: reasons
    })
  } catch (error) {
    next(error)
  }
})

router.get('/rooms', async (req, res, next) => {
  try {
    const { is_active } = req.query
    let query = supabaseAdmin.from('rooms').select('id, room_code, room_name, building, floor, is_active').order('room_code')
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }
    
    const { data: rooms, error } = await query
    if (error) {
      throw error
    }
    
    res.json({
      success: true,
      data: rooms || []
    })
  } catch (error) {
    next(error)
  }
})

export default router