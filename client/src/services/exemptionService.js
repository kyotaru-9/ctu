import api from './api'

export const exemptionService = {
  getAll: async () => {
    const response = await api.get('/admin/exemption-days')
    return response.data
  },

  create: async (data) => {
    const response = await api.post('/admin/exemption-days', data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/exemption-days/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/exemption-days/${id}`)
    return response.data
  },
}
