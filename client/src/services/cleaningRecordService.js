import api from './api'

export const cleaningRecordService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/cleaning-records', { params })
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/cleaning-records/${id}`)
    return response.data
  }
}
