/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import api, { tokenStore } from './api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  // on page load, check if the saved token is still valid
  useEffect(() => {
    if (!tokenStore.get()) return
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  // any response that carries a fresh token (login, password change, reset) goes through here
  const startSession = (data) => {
    if (data.token) tokenStore.set(data.token)
    if (data.user) setUser(data.user)
  }
  const login = async (email, password) => startSession((await api.post('/auth/login', { email, password })).data)
  const register = async (name, email, password) => startSession((await api.post('/auth/register', { name, email, password })).data)
  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, startSession }}>{children}</AuthContext.Provider>
}
