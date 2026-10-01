import api from './api'

/**
 * Minutes to add to UTC to reach the viewer's local time — the inverse of
 * Date.getTimezoneOffset(). Sent with the day requests so the server buckets and
 * deletes the same calendar day the admin is looking at, rather than a UTC one
 * that would split a working day in two.
 */
const localOffset = () => -new Date().getTimezoneOffset()

export const auditService = {
  /**
   * The latest entries, or every entry on one local calendar day when `date` is
   * given. The day view is not derivable from the latest-N list, so it has to be
   * asked for separately rather than filtered client-side.
   */
  async getAll({ date } = {}) {
    const params = date ? { date, offset: localOffset() } : {}
    const response = await api.get('/admin/audit-logs', { params })
    return response.data
  },

  /** Entry counts per local calendar day, for the cleanup calendar. */
  async getDates() {
    const response = await api.get('/admin/audit-logs/dates', { params: { offset: localOffset() } })
    return response.data
  },

  /**
   * Deletes every entry on the given local calendar days, or with `before` also
   * everything older than the earliest of them. Both are permanent, and the
   * server collapses the days into one range so the whole set is a single
   * atomic delete.
   */
  async deleteByDate(dates, { before = false } = {}) {
    const list = Array.isArray(dates) ? dates : [dates]
    const response = await api.delete('/admin/audit-logs', {
      data: { dates: list, before, offset: localOffset() },
    })
    return response.data
  }
}