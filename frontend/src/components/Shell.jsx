import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { PulseLine } from './ui.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

const NAV = [
  { to: '/', label: 'Executive Dashboard', icon: '◈' },
  { to: '/meetings', label: 'Meetings', icon: '▤' },
  { to: '/search', label: 'AI Search', icon: '⌕' },
  { to: '/voice-search', label: 'Voice Search', icon: '●' },
  { to: '/tasks', label: 'Task Tracking', icon: '✓' },
  { to: '/analytics', label: 'Analytics', icon: '▦' },
  { to: '/employees', label: 'Employees', icon: '◐' },
]

function Sidebar({ open, onClose }) {
  const { company } = useAuth()
  return (
    <>
    {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}
    <aside className={`w-64 shrink-0 bg-panel border-r border-line flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="px-5 py-6 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-signal/15 border border-signal/30 flex items-center justify-center text-signal font-display font-bold">M</div>
          <div>
            <div className="font-display font-semibold text-paper leading-tight">Meeting AI</div>
            <div className="text-mist text-[11px] font-mono">{company?.name || 'Control Room'}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group ${
                isActive ? 'bg-signal/10 text-signal' : 'text-mist hover:text-paper hover:bg-panelLight'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="w-5 text-center opacity-80">{item.icon}</span>
                {item.label}
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-signal rounded-full" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-line space-y-3">
        {company?.invite_code && (
          <div className="bg-panelLight border border-line rounded-lg px-3 py-2">
            <div className="text-mist text-[10px] font-mono">Invite code</div>
            <div className="text-paper text-sm font-mono tracking-wide">{company.invite_code}</div>
          </div>
        )}
        <PulseLine height={20} color="#2DD9C4" />
        <div className="text-mist text-[10px] font-mono mt-1 text-center">Listening for the next meeting</div>
      </div>
    </aside>
    </>
  )
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const doLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-full bg-panelLight border border-line hover:border-signal/40 transition-colors"
        title={user ? `${user.name} (${user.role})` : ''}
      >
        <span className="w-7 h-7 rounded-full bg-signal/15 border border-signal/30 flex items-center justify-center text-xs font-mono text-signal">
          {initials(user?.name)}
        </span>
        <span className="hidden sm:block text-xs text-paper font-medium max-w-[9rem] truncate">{user?.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-panel border border-line rounded-lg shadow-lg py-1 z-20">
          <div className="px-3 py-2 border-b border-line">
            <div className="text-paper text-sm font-medium truncate">{user?.name}</div>
            <div className="text-mist text-[11px] font-mono capitalize">{user?.role}</div>
          </div>
          <button
            onClick={doLogout}
            className="w-full text-left px-3 py-2 text-sm text-coral hover:bg-panelLight transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

function TopBar({ onMenu }) {
  const navigate = useNavigate()
  const [q, setQ] = React.useState('')
  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-ink/80 border-b border-line px-4 sm:px-8 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
      <button onClick={onMenu} className="lg:hidden w-9 h-9 rounded-lg border border-line text-paper shrink-0" aria-label="Open menu">☰</button>
      <form
        className="flex-1 max-w-xl relative"
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`) }}
      >
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mist">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search every meeting you've had..."
          className="w-full bg-panel border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-paper placeholder:text-mist focus:border-signal/50 outline-none"
        />
      </form>
      <button
        onClick={() => navigate('/voice-search')}
        className="w-9 h-9 rounded-full bg-coral/10 border border-coral/30 text-coral flex items-center justify-center hover:bg-coral/20 transition-colors"
        title="Voice search"
        aria-label="Voice search"
      >
        ●
      </button>
      <UserMenu />
    </header>
  )
}

export default function Shell({ children }) {
  const [menu, setMenu] = React.useState(false)
  return (
    <div className="flex min-h-screen">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="flex-1 min-w-0">
        <TopBar onMenu={() => setMenu(true)} />
        <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}
