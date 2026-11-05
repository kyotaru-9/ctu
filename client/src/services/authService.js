import api from './api'
import { authStorage } from './authStorage'

export const authService = {
  async login(email, password, remember = true) {
    const response = await api.post('/auth/login', { email, password })
    if (!response.data.success) {
      throw new Error(response.data.message || 'Invalid email or password')
    }
    if (response.data.data?.access_token) {
      authStorage.saveSession(response.data.data, remember)
      // A different account may be signing in on this browser; cached reads
      // are scoped per user, but clearing keeps the switch airtight.
      api.clearCache?.()
    }
    return response.data.data
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      authStorage.clear()
      api.clearCache?.()
    }
  },

  getUserProfile() {
    try {
      const profile = authStorage.getItem('user_profile')
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
    const token = authStorage.getItem('access_token')
    if (!token) return null

    const response = await api.get('/auth/me')
    return response.data.data
  },

  async refreshToken() {
    const refreshToken = authStorage.getItem('refresh_token')
    if (!refreshToken) throw new Error('No refresh token')

    const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
    if (response.data.success && response.data.data?.access_token) {
      authStorage.setItem('access_token', response.data.data.access_token)
      // Same rotation as the axios interceptor: the refresh token that was
      // just spent is revoked, so store the replacement or the next refresh
      // logs the user out.
      if (response.data.data.refresh_token) {
        authStorage.setItem('refresh_token', response.data.data.refresh_token)
      }
    }
    return response.data.data
  }
}
