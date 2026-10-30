import api from './api'

export const excuseService = {
  // Admin routes
  getAll: async (status = '') => {
    const params = status ? { status } : {}
    const response = await api.get('/admin/excuse-requests', { params })
    return response.data
  },

  approve: async (id, adminNote = '') => {
    const response = await api.post(`/admin/excuse-requests/${id}/approve`, { admin_note: adminNote })
    return response.data
  },

  reject: async (id, adminNote = '') => {
    const response = await api.post(`/admin/excuse-requests/${id}/reject`, { admin_note: adminNote })
    return response.data
  },

  adminCreate: async (formData) => {
    const response = await api.post('/admin/excuse-requests/admin-create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Student/Special routes
  getMyRequests: async () => {
    const response = await api.get('/student/excuse-requests')
    return response.data
  },

  createRequest: async (formData) => {
    const response = await api.post('/student/excuse-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  checkExemption: async (params = {}) => {
    const response = await api.get('/student/check-exemption', { params })
    return response.data
  },
}
