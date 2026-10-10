import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('token') } catch { return null }
  })
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(({ user, company }) => { setUser(user); setCompany(company) })
      .catch(() => { setToken(null); try { localStorage.removeItem('token') } catch {} })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    setToken(res.access_token)
    setUser(res.user)
    setCompany(res.company)
    try { localStorage.setItem('token', res.access_token) } catch {}
    return res
  }

  const signup = async (payload) => {
    const res = await authApi.signup(payload)
    setToken(res.access_token)
    setUser(res.user)
    setCompany(res.company)
    try { localStorage.setItem('token', res.access_token) } catch {}
    return res
  }

  const logout = () => {
    setToken(null); setUser(null); setCompany(null)
    try { localStorage.removeItem('token') } catch {}
  }

  return (
    <AuthContext.Provider value={{ token, user, company, loading, login, signup, logout, isManager: user?.role === 'manager' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
