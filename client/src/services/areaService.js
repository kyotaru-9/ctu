import api from './api'

export const areaService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/areas', { params })
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/areas', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/areas/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/areas/${id}`)
    return response.data
  }
}
