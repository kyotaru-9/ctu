import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'admin') return '/admin'
  return ''
}

export const roomService = {
  async getAll(params = {}) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/rooms`, { params })
    return response.data
  },

  async getById(id) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/rooms/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/rooms', data)
    return response.data
  },

/**
   * Creates many rooms in one request. `rows` holds already-mapped room records —
   * the spreadsheet is parsed in the browser so the admin sees a preview before
   * anything is written.
   */
  async batchCreate(rows) {
    const response = await api.post('/admin/rooms/batch', { rows })
    return response.data
  },

  /**
   * Row counts for everything a hard delete would cascade into, so the
   * confirmation can state the cost before it happens.
   */
  async getDeleteImpact(id) {
    const response = await api.get(`/admin/rooms/${id}/impact`)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/rooms/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/rooms/${id}`)
    return response.data
  },

  async regenerateQR(id) {
    const response = await api.post(`/admin/rooms/${id}/regenerate-qr`)
    return response.data
  },

  async validateQR(token) {
    const response = await api.get(`/rooms/qr/${token}`)
    return response.data
  },

  async getQRForPrint(id) {
    const response = await api.get(`/admin/rooms/${id}/qr-print`)
    return response.data
  }
}