import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'student_special') return '/special'
  if (role === 'student') return '/student'
  return '/student'
}

export const occupationService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/occupations', { params })
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/admin/occupations/${id}`)
    return response.data
  },

  async create(data) {
    const prefix = getRolePrefix()
    const response = await api.post(`${prefix}/occupations`, data)
    return response.data
  },

  async complete(id) {
    const prefix = getRolePrefix()
    const response = await api.post(`${prefix}/occupations/${id}/complete`)
    return response.data
  },

  async getMyOccupations() {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/occupations`)
    return response.data
  }
}