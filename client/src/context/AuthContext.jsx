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
    } catch (error) {
      console.log('[AuthContext] checkAuth failed:', error.message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const userData = await authService.login(email, password)
    const userProfile = userData.user
    console.log('[AuthContext] Login successful:', { 
      userId: userProfile?.id, 
      email: userProfile?.email, 
      role: userProfile?.role,
      section_id: userProfile?.section_id
    })
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