import api from './api'

/**
 * Minutes to add to UTC to reach the viewer's local time — the inverse of
 * Date.getTimezoneOffset(). Sent with the day requests so the server counts
 * the same calendar day the admin picked, rather than a UTC one that would
 * split a working day in two.
 */
const localOffset = () => -new Date().getTimezoneOffset()

/** Query params for the picked days, or {} for the unfiltered view. */
export const analyticsDayParams = (dates) => {
  const list = (Array.isArray(dates) ? dates : [dates]).filter(Boolean)
  return list.length ? { dates: list.join(','), offset: localOffset() } : {}
}

export const analyticsService = {
  async getOverview(params = {}) {
    const response = await api.get('/admin/analytics/overview', { params })
    return response.data
  },

  async getSectionCompliance(params = {}) {
    const response = await api.get('/admin/analytics/sections', { params })
    return response.data
  },

  async getRoomIssues(params = {}) {
    const response = await api.get('/admin/analytics/rooms', { params })
    return response.data
  },

  async getReportReasons(params = {}) {
    const response = await api.get('/admin/analytics/reasons', { params })
    return response.data
  },

  async getTrends(params = {}) {
    const response = await api.get('/admin/analytics/trends', { params })
    return response.data
  },

  /** Reports-plus-submissions counts per local calendar day, for the day picker. */
  async getDates() {
    const response = await api.get('/admin/analytics/dates', {
      params: { offset: localOffset() },
    })
    return response.data
  },
}
