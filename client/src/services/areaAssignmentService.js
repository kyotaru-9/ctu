import api from './api'

export const areaAssignmentService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/area-assignments', { params })
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/area-assignments', data)
    return response.data
  },

  async batchCreate(rows) {
    const response = await api.post('/admin/area-assignments/batch', { rows })
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/area-assignments/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/area-assignments/${id}`)
    return response.data
  }
}
