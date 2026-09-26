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

  async update(id, data) {
    const response = await api.put(`/admin/schedules/${id}`, data)
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
  }
}