import api from './api'

export const sectionService = {
  async getAll(params = {}) {
    console.log('[sectionService] getAll called with params:', params)
    const response = await api.get('/admin/sections', { params })
    console.log('[sectionService] getAll response:', response.data)
    return response.data
  },

  async getById(id) {
    console.log('[sectionService] getById called with id:', id)
    const response = await api.get(`/admin/sections/${id}`)
    console.log('[sectionService] getById response:', response.data)
    return response.data
  },

  async create(data) {
    console.log('[sectionService] create called with data:', data)
    const response = await api.post('/admin/sections', data)
    console.log('[sectionService] create response:', response.data)
    return response.data
  },

  async update(id, data) {
    console.log('[sectionService] update called with id:', id, 'data:', data)
    const response = await api.put(`/admin/sections/${id}`, data)
    console.log('[sectionService] update response:', response.data)
    return response.data
  },

  async delete(id) {
    console.log('[sectionService] delete called with id:', id)
    const response = await api.delete(`/admin/sections/${id}`)
    console.log('[sectionService] delete response:', response.data)
    return response.data
  },

  async toggleStatus(id) {
    console.log('[sectionService] toggleStatus called with id:', id)
    const response = await api.patch(`/admin/sections/${id}/status`)
    console.log('[sectionService] toggleStatus response:', response.data)
    return response.data
  },

  async getCredentials(id) {
    console.log('[sectionService] getCredentials called with id:', id)
    const response = await api.get(`/admin/sections/${id}/credentials`)
    console.log('[sectionService] getCredentials response:', response.data)
    return response.data
  },

  async resetPassword(id, newPassword) {
    console.log('[sectionService] resetPassword called with id:', id)
    const response = await api.post(`/admin/sections/${id}/reset-password`, { newPassword })
    console.log('[sectionService] resetPassword response:', response.data)
    return response.data
  }
}