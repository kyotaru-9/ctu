import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'student_special') return '/special'
  if (role === 'student') return '/student'
  return '/student'
}

export const scheduleService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/schedules', { params })
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/admin/schedules/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/schedules', data)
    return response.data
  },

  /**
   * Batch schedule import. The rows carry the sheet's own day and time values;
   * the server normalises them, so a spreadsheet saying 0700 and one saying
   * 07:00 both store as 07:00.
   */
  async batchCreate(sectionId, rows) {
    const response = await api.post('/admin/schedules/batch', { section_id: sectionId, rows })
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/schedules/${id}`, data)
    return response.data
  },

  /** What a schedule delete leaves behind: history kept, but unlinked from a class. */
  async getDeleteImpact(id) {
    const response = await api.get(`/admin/schedules/${id}/impact`)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/schedules/${id}`)
    return response.data
  },

async getMySchedules() {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/schedule`)
    return response.data
  },

  async getSchedulesByRoom(roomId) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/schedule/room/${roomId}`)
    return response.data
  },

  async getSchedulesByRoomAndDate(roomId, date) {
    const prefix = getRolePrefix()
    const dateStr = new Date(date).toISOString().split('T')[0]
    const response = await api.get(`${prefix}/schedule/room/${roomId}`, { params: { date: dateStr } })
    return response.data
  }
}