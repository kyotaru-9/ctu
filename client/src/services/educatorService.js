import api from './api'

export const educatorService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/educators', { params })
    return response.data
  },

  async getActive(params = {}) {
    const response = await api.get('/admin/educators/active', { params })
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/educators', data)
    return response.data
  },

  async batchCreate(rows) {
    const response = await api.post('/admin/educators/batch', { rows })
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/educators/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/educators/${id}`)
    return response.data
  }
}
