import React from 'react'
import { Link } from 'react-router-dom'
import Robot from './Robot.jsx'

const POINTS = ['Record a call — get the summary and tasks automatically', 'Ask Mia about any meeting, by voice or with a screenshot', 'Managers confirm; employees see exactly what’s theirs']

/** Split-screen shell for Login/Signup: brand panel with animation + the form. */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-ink">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-signal/15 via-panel to-ink border-r border-line">
        <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-signal/15 blur-3xl anim-drift" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-amber/10 blur-3xl anim-drift" style={{ animationDelay: '-7s' }} aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-signal/15 border border-signal/30 flex items-center justify-center text-signal font-display font-bold">M</span>
          <span className="font-display font-semibold text-paper">Meeting AI</span>
        </Link>
        <div className="relative">
          <div className="anim-floaty w-fit"><Robot size={120} mood="idle" /></div>
          <h2 className="font-display font-bold text-4xl text-paper leading-tight mt-6">Every meeting,<br /><span className="text-signal">turned into action.</span></h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((t, i) => (
              <li key={t} className="flex gap-3 text-paper/90 text-sm anim-pop" style={{ animationDelay: `${300 + i * 150}ms` }}>
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-signal/15 text-signal text-xs flex items-center justify-center">✓</span>{t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-mist text-xs font-mono">© {new Date().getFullYear()} Meeting AI</div>
      </div>
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
          <span className="w-9 h-9 rounded-xl bg-signal/15 border border-signal/30 flex items-center justify-center text-signal font-display font-bold">M</span>
          <span className="font-display font-semibold text-paper">Meeting AI</span>
        </Link>
        <div className="w-full max-w-sm anim-slideup">{children}</div>
        <Link to="/" className="text-mist text-xs mt-6 hover:text-paper">← Back to home</Link>
      </div>
    </div>
  )
}
