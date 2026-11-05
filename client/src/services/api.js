import axios from 'axios'
import { authStorage } from './authStorage'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

/*
 * GET response cache.
 *
 * Pages refetch their lists every time they mount, which means navigating
 * away and back — or any re-render that remounts the page — hits the API
 * again for data that has not changed. Caching the response for a short TTL
 * makes a revisit free while still picking up changes made elsewhere within
 * the window.
 *
 * Two rules keep it correct:
 *   - any non-GET request clears the whole cache, so a create/update/delete
 *     is always followed by fresh reads;
 *   - entries are keyed by the signed-in user, so one account's cached data
 *     can never be served to the next account on the same browser.
 *
 * A caller can bypass the cache per request with `{ cache: false }`, and
 * `api.clearCache()` forces every read to go to the server.
 */
const GET_CACHE_TTL_MS = 60_000
const getCache = new Map()

function cacheScope() {
  try {
    const profile = JSON.parse(authStorage.getItem('user_profile') || 'null')
    return profile?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

function getCacheKey(url, params) {
  return `${cacheScope()}::${url}::${JSON.stringify(params ?? null)}`
}

api.clearCache = () => getCache.clear()

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
  const token = authStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // A successful write means cached reads may now be stale, so the next GET
    // goes to the server instead of serving pre-mutation data.
    if (!['get', 'head', 'options'].includes(response.config?.method)) {
      getCache.clear()
    }
    return response
  },
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
      authStorage.removeItem('access_token')
      authStorage.removeItem('refresh_token')

      // The redirect reloads the document, which drops router state. Stashing
      // what we know about the locked-out account lets the page still name the
      // section, which is the one thing the reader is asked to quote.
      try {
        const profile = JSON.parse(authStorage.getItem('user_profile') || 'null')
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

      authStorage.removeItem('user_profile')
      getCache.clear()

      if (window.location.pathname !== '/account-deactivated') {
        window.location.href = '/account-deactivated'
      }
      return Promise.reject(error)
    }

    // Login and refresh failures are not token-expiry cases: the login page
    // shows the server's message itself, and a failed refresh has no token to
    // refresh with. Handling either here would reload the page via the catch
    // below and lose that.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isLoginRequest &&
      !originalRequest?.url?.includes('/auth/refresh')
    ) {
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
        const refreshToken = authStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }
        
        const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken }, {
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (response.data.success && response.data.data?.access_token) {
          const newToken = response.data.data.access_token
          authStorage.setItem('access_token', newToken)
          // Supabase rotates refresh tokens on every refresh: the token that
          // was just used is revoked, so the new one has to replace it here.
          // Keeping the old one means the next refresh fails and the session
          // is dropped even though the user never logged out.
          if (response.data.data.refresh_token) {
            authStorage.setItem('refresh_token', response.data.data.refresh_token)
          }
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          processQueue(null, newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
        
        throw new Error('Token refresh failed')
      } catch (err) {
        processQueue(err, null)
        authStorage.clear()
        getCache.clear()
        window.location.href = '/'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    
    return Promise.reject(error)
  }
)

/*
 * GET requests go through the cache above. The wrapped method sits on top of
 * the interceptors, so a cache miss still gets the auth header and the 401
 * refresh handling; only a hit short-circuits, and a hit needs no token
 * because the data was fetched for this same signed-in user moments ago.
 * Auth endpoints are never cached — /auth/me must always reflect the real
 * session state.
 */
const rawGet = api.get.bind(api)
api.get = async (url, config = {}) => {
  if (config.cache === false || url.startsWith('/auth/')) {
    return rawGet(url, config)
  }

  const key = getCacheKey(url, config.params)
  const hit = getCache.get(key)
  if (hit) {
    if (hit.expiresAt > Date.now()) {
      return { data: hit.data, status: 200, statusText: 'OK', headers: {}, config }
    }
    getCache.delete(key)
  }

  const response = await rawGet(url, config)
  getCache.set(key, { data: response.data, expiresAt: Date.now() + GET_CACHE_TTL_MS })
  return response
}

export default api