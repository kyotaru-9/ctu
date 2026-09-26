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

  /**
   * Row counts for everything a hard delete would cascade into, so the
   * confirmation can state the cost before it happens.
   */
  async getDeleteImpact(id) {
    const response = await api.get(`/admin/sections/${id}/impact`)
    return response.data
  },

  async toggleStatus(id) {
    console.log('[sectionService] toggleStatus called with id:', id)
    const response = await api.patch(`/admin/sections/${id}/status`)
    console.log('[sectionService] toggleStatus response:', response.data)
    return response.data
  },

  /**
   * Resets the password on every account the section owns and returns the new
   * credentials against the existing email addresses.
   */
  async regenerateCredentials(id) {
    console.log('[sectionService] regenerateCredentials called with id:', id)
    const response = await api.post(`/admin/sections/${id}/regenerate-credentials`)
    console.log('[sectionService] regenerateCredentials response:', response.data)
    return response.data
  }
}