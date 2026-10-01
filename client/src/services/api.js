import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    /*
     * A disabled account is a 403, not a 401: the token is still valid, it just
     * no longer has access. Refresh would not help — the refresh route does not
     * check is_active either — so the session is dropped and the reader is sent
     * to the page that explains the hold. Catching it here covers the mid-session
     * case, where an admin disables a section while somebody is signed in.
     *
     * The sign-in request itself is left alone: the login page handles that
     * response itself and navigates with the account details attached, so the
     * page can name the section. A redirect from here would reload the document
     * and lose that state.
     */
    const isLoginRequest = originalRequest?.url?.includes('/auth/login')
    const disabled =
      error.response?.status === 403 &&
      error.response?.data?.error === 'Account disabled' &&
      !isLoginRequest

    if (disabled) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')

      // The redirect reloads the document, which drops router state. Stashing
      // what we know about the locked-out account lets the page still name the
      // section, which is the one thing the reader is asked to quote.
      try {
        const profile = JSON.parse(localStorage.getItem('user_profile') || 'null')
        if (profile) {
          const section = profile.section
          sessionStorage.setItem(
            'deactivated_account',
            JSON.stringify({
              email: profile.email,
              full_name: profile.full_name,
              role: profile.role,
              section: section
                ? [section.program, `${section.year_level}${section.section_name}`]
                    .filter(Boolean)
                    .join(' ')
                : null,
              // Not carried here: this path fires on any request, including ones
              // made long after the hold began, and the reason is fetched per
              // sign-in attempt. The page shows its fallback wording instead.
            })
          )
        }
      } catch {
        // A missing or unreadable profile is not worth failing the redirect over.
      }

      localStorage.removeItem('user_profile')

      if (window.location.pathname !== '/account-deactivated') {
        window.location.href = '/account-deactivated'
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }
        
        const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken }, {
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.data.success && response.data.data?.access_token) {
          const newToken = response.data.data.access_token
          localStorage.setItem('access_token', newToken)
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
        
        throw new Error('Token refresh failed')
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_profile')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    
    return Promise.reject(error)
  }
)

export default api