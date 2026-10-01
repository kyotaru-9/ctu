import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        localStorage.setItem('user_profile', JSON.stringify(currentUser))
      }
      setUser(currentUser)
    } catch {
      // A rejected or expired token just means signed out; there is nothing to
      // report to the page and nothing worth writing to the console, which is
      // readable by anyone with the device.
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const userData = await authService.login(email, password)
    const userProfile = userData.user
    setUser(userProfile)
    return userProfile
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}