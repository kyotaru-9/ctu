import api from './api'

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    if (!response.data.success) {
      throw new Error(response.data.message || 'Invalid email or password')
    }
    if (response.data.data?.access_token) {
      localStorage.setItem('access_token', response.data.data.access_token)
      if (response.data.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.data.refresh_token)
      }
      if (response.data.data.user) {
        localStorage.setItem('user_profile', JSON.stringify(response.data.data.user))
      }
    }
    return response.data.data
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_profile')
    }
  },

  getUserProfile() {
    try {
      const profile = localStorage.getItem('user_profile')
      return profile ? JSON.parse(profile) : null
    } catch {
      return null
    }
  },

  getUserRole() {
    const profile = this.getUserProfile()
    return profile?.role || null
  },

  async getCurrentUser() {
    const token = localStorage.getItem('access_token')
    if (!token) return null
    
    const response = await api.get('/auth/me')
    return response.data.data
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) throw new Error('No refresh token')
    
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
    if (response.data.success && response.data.data?.access_token) {
      localStorage.setItem('access_token', response.data.data.access_token)
    }
    return response.data.data
  }
}