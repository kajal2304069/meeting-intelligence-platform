import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Card } from '../components/ui.jsx'
import AuthLayout from '../components/AuthLayout.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="p-6 sm:p-8 w-full">
        <h1 className="font-display text-xl font-semibold text-paper mb-1">Welcome back 👋</h1>
        <p className="text-mist text-sm mb-6">Sign in to see your meetings, tasks and Mia, your AI assistant.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Work email"
            className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50"
          />
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50"
          />
          {error && <p className="text-coral text-xs font-mono">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-signal text-ink font-medium py-2.5 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-mist text-sm mt-5 text-center">
          No account? <Link to="/signup" className="text-signal hover:underline">Create one</Link>
        </p>
      </Card>
    </AuthLayout>
  )
}
