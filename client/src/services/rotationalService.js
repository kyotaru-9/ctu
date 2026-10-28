import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'student_special') return '/special'
  if (role === 'student') return '/student'
  return '/student'
}

const postWithProgress = async (url, data, onProgress) => {
  const response = await api.post(url, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
  return response.data
}

export const rotationalService = {
  async getToday() {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/rotational/today`)
    return response.data
  },

  async submitBefore(formData, onProgress) {
    const prefix = getRolePrefix()
    return postWithProgress(`${prefix}/rotational/before`, formData, onProgress)
  },

  async submitAfter(formData, onProgress) {
    const prefix = getRolePrefix()
    return postWithProgress(`${prefix}/rotational/after`, formData, onProgress)
  },

  async getHistory() {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/rotational/history`)
    return response.data
  },

  async getSchedule() {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/rotational/schedule`)
    return response.data
  }
}
