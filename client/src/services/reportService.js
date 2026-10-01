import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'student_special') return '/special'
  if (role === 'student') return '/student'
  return '/student'
}

/**
 * Report reasons are shared reference data that every role may read, so an admin
 * has to ask for them from the admin route. getRolePrefix falls back to
 * /student, and the student-only guard on that route answers an admin with a 403
 * — which is why the settings page loaded its reason list empty.
 */
const getReasonPrefix = () => {
  if (authService.getUserRole() === 'admin') return '/admin'
  return getRolePrefix()
}

export const reportService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/reports', { params })
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/admin/reports/${id}`)
    return response.data
  },

  async updateStatus(id, status, adminNote = '') {
    const response = await api.patch(`/admin/reports/${id}/status`, { status, admin_note: adminNote })
    return response.data
  },

  async create(data) {
    const prefix = getRolePrefix()
    const response = await api.post(`${prefix}/reports`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async getMyReports(params = {}) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/reports`, { params })
    return response.data
  },

  async getReasons() {
    const prefix = getReasonPrefix()
    const response = await api.get(`${prefix}/report-reasons`)
    return response.data
  },

  async createReason(data) {
    const response = await api.post('/admin/report-reasons', data)
    return response.data
  },

  async updateReason(id, data) {
    const response = await api.put(`/admin/report-reasons/${id}`, data)
    return response.data
  },

  async deleteReason(id) {
    const response = await api.delete(`/admin/report-reasons/${id}`)
    return response.data
  }
}