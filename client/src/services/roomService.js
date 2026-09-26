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