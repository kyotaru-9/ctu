import api from './api'

export const auditService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  }
}