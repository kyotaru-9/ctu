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

  /**
   * Creates many areas in one request. `rows` holds already-mapped area
   * records — the spreadsheet is parsed in the browser so the admin sees a
   * preview before anything is written.
   */
  async batchCreate(rows) {
    const response = await api.post('/admin/areas/batch', { rows })
    return response.data
  },

  async getStats(id, params = {}) {
    const response = await api.get(`/admin/areas/${id}/stats`, { params })
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
