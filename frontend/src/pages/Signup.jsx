import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { Card } from '../components/ui.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('join') // "join" an existing company via invite code, or "create" a new one
  const [form, setForm] = useState({ name: '', email: '', password: '', invite_code: '', company_name: '', role: 'employee' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role }
      if (mode === 'join') payload.invite_code = form.invite_code
      else { payload.company_name = form.company_name; payload.role = 'manager' }
      await signup(payload)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-signal/15 border border-signal/30 flex items-center justify-center text-signal font-display font-bold">M</div>
          <div>
            <div className="font-display font-semibold text-paper leading-tight">Meeting AI</div>
            <div className="text-mist text-[11px] font-mono">Control Room</div>
          </div>
        </div>
        <h1 className="font-display text-xl font-semibold text-paper mb-1">Create account</h1>
        <p className="text-mist text-sm mb-5">Each company's meetings and tasks stay private to that company.</p>

        <div className="flex gap-2 mb-5 bg-panelLight rounded-lg p-1">
          <button type="button" onClick={() => setMode('join')}
            className={`flex-1 text-xs font-mono py-1.5 rounded-md transition-colors ${mode === 'join' ? 'bg-signal text-ink' : 'text-mist'}`}>
            Join a company
          </button>
          <button type="button" onClick={() => setMode('create')}
            className={`flex-1 text-xs font-mono py-1.5 rounded-md transition-colors ${mode === 'create' ? 'bg-signal text-ink' : 'text-mist'}`}>
            Create a company
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input required value={form.name} onChange={set('name')} placeholder="Full name"
            className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <input type="email" required value={form.email} onChange={set('email')} placeholder="Work email"
            className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <input type="password" required value={form.password} onChange={set('password')} placeholder="Password"
            className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />

          {mode === 'join' ? (
            <>
              <input required value={form.invite_code} onChange={set('invite_code')} placeholder="Company invite code"
                className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50 uppercase" />
              <select value={form.role} onChange={set('role')}
                className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-signal/50">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </>
          ) : (
            <input required value={form.company_name} onChange={set('company_name')} placeholder="Company name"
              className="w-full bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          )}

          {mode === 'create' && (
            <p className="text-mist text-xs font-mono">You'll be the first manager — you'll get an invite code afterward to share with your team.</p>
          )}

          {error && <p className="text-coral text-xs font-mono">{error}</p>}
          <button disabled={loading}
            className="w-full bg-signal text-ink font-medium py-2.5 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-mist text-sm mt-5 text-center">
          Already have an account? <Link to="/login" className="text-signal hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  )
}
