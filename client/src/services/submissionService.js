import api from './api'
import { authService } from './authService'

const getRolePrefix = () => {
  const role = authService.getUserRole()
  if (role === 'student_special') return '/special'
  if (role === 'student') return '/student'
  return '/student'
}

const postWithProgress = async (url, data, onProgress) => {
  console.log('Posting to:', url);
  console.log('FormData keys:', [...data.keys()]);
  const response = await api.post(url, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
  console.log('Response:', response.data);
  return response.data
}

export const submissionService = {
  async submitBefore(data, onProgress) {
    const prefix = getRolePrefix()
    return postWithProgress(`${prefix}/submissions/before`, data, onProgress)
  },

  async submitAfter(data, onProgress) {
    const prefix = getRolePrefix()
    return postWithProgress(`${prefix}/submissions/after`, data, onProgress)
  },

  async getMySubmissions(params = {}) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/submissions/my`, { params })
    return response.data
  },

  async getById(id) {
    const prefix = getRolePrefix()
    const response = await api.get(`${prefix}/submissions/${id}`)
    return response.data
  }
}