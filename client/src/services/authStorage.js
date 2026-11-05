/*
 * Where a session lives depends on "remember me": checked means localStorage
 * (survives a browser restart), unchecked means sessionStorage (gone when the
 * tab or browser closes). Reads check localStorage first so a remembered
 * session always wins over a stale session-only one, and writes always go to
 * the store that already holds the access token — which is what keeps the
 * token-refresh path in api.js writing back to the right place.
 */
const AUTH_KEYS = ['access_token', 'refresh_token', 'user_profile']

function activeStore() {
  if (localStorage.getItem('access_token') !== null) return localStorage
  if (sessionStorage.getItem('access_token') !== null) return sessionStorage
  return localStorage
}

export const authStorage = {
  getItem(key) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  },

  setItem(key, value) {
    activeStore().setItem(key, value)
  },

  removeItem(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },

  clear() {
    for (const key of AUTH_KEYS) this.removeItem(key)
  },

  saveSession(data, remember) {
    const target = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage

    target.setItem('access_token', data.access_token)
    if (data.refresh_token) {
      target.setItem('refresh_token', data.refresh_token)
    }
    if (data.user) {
      target.setItem('user_profile', JSON.stringify(data.user))
    }
    // A previous sign-in on this browser may have left the same keys in the
    // other store; leaving them would resurrect the old session on the next
    // visit even though the tab that created it is long closed.
    for (const key of AUTH_KEYS) other.removeItem(key)
  }
}
