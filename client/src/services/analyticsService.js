import api from './api'

export const analyticsService = {
  async getOverview() {
    const response = await api.get('/admin/analytics/overview')
    return response.data
  },

  async getSectionCompliance() {
    const response = await api.get('/admin/analytics/sections')
    return response.data
  },

  async getRoomIssues() {
    const response = await api.get('/admin/analytics/rooms')
    return response.data
  },

  async getReportReasons() {
    const response = await api.get('/admin/analytics/reasons')
    return response.data
  },

  async getTrends() {
    const response = await api.get('/admin/analytics/trends')
    return response.data
  }
}