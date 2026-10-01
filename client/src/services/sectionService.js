import api from './api'

export const sectionService = {
  async getAll(params = {}) {
    const response = await api.get('/admin/sections', { params })
    return response.data
  },

  async getById(id) {
    const response = await api.get(`/admin/sections/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/sections', data)
    return response.data
  },

  /**
   * Creates many sections in one request. `rows` holds already-mapped section
   * records — the spreadsheet is parsed in the browser so the admin sees a
   * preview before anything is written.
   */
  async batchCreate(rows) {
    const response = await api.post('/admin/sections/batch', { rows })
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/admin/sections/${id}`, data)
    return response.data
  },

  async delete(id) {
    const response = await api.delete(`/admin/sections/${id}`)
    return response.data
  },

  /**
   * Row counts for everything a hard delete would cascade into, so the
   * confirmation can state the cost before it happens.
   */
  async getDeleteImpact(id) {
    const response = await api.get(`/admin/sections/${id}/impact`)
    return response.data
  },

  /**
   * Enables or disables a section, and the student logins it owns. The value is
   * sent explicitly so the row updates to the state the button was showing, even
   * if another tab or the batch import changed it since the list loaded.
   *
   * `reason` is required by the server when disabling; it is what the locked-out
   * students are shown instead of a bare "account is deactivated".
   */
  async toggleStatus(id, isActive, reason) {
    const response = await api.patch(`/admin/sections/${id}/status`, {
      is_active: isActive,
      reason,
    })
    return response.data
  },

  /**
   * Resets the password on every account the section owns and returns the new
   * credentials against the existing email addresses.
   *
   * The response carries live passwords, which is exactly why nothing here logs
   * it: a console entry survives in devtools history and on any machine that
   * captures console output, and a logged password is a password an attacker can
   * read without ever needing to guess one.
   */
  async regenerateCredentials(id) {
    const response = await api.post(`/admin/sections/${id}/regenerate-credentials`)
    return response.data
  }
}
