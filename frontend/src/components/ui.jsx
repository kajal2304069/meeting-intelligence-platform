import React from 'react'
import { CountUp } from './motion.jsx'

/** Signature element: a waveform "pulse line" — doubles as a live-recording
 * motif and as a real data chart when given peaks. Reused across the app as
 * a section divider, nav underline, and mini meeting-activity sparkline. */
export function PulseLine({ peaks, height = 28, color = '#2DD9C4', animate = false, className = '' }) {
  const data = peaks && peaks.length ? peaks : [3, 6, 4, 9, 5, 7, 3, 8, 4, 6, 2, 5]
  const max = Math.max(...data, 1)
  const width = data.length * 8
  const mid = height / 2
  const points = data.map((v, i) => {
    const x = i * 8 + 4
    const y = mid - (v / max) * (mid - 3)
    return `${x},${y}`
  })
  const pointsDown = data.map((v, i) => {
    const x = i * 8 + 4
    const y = mid + (v / max) * (mid - 3)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} preserveAspectRatio="none">
      {data.map((v, i) => {
        const x = i * 8 + 4
        const y1 = mid - (v / max) * (mid - 3)
        const y2 = mid + (v / max) * (mid - 3)
        return (
          <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
                strokeLinecap="round" opacity={0.55 + (v / max) * 0.45}
                className={animate ? 'pulse-animate' : ''} />
        )
      })}
    </svg>
  )
}

export function StatCard({ label, value, sub, accent = 'signal', icon }) {
  const accents = { signal: 'text-signal', amber: 'text-amber', coral: 'text-coral', paper: 'text-paper' }
  return (
    <div className="card-hover anim-pop relative overflow-hidden bg-panel border border-line rounded-xl p-4 sm:p-5 shadow-panel">
      <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl opacity-20 ${{ signal: 'bg-signal', amber: 'bg-amber', coral: 'bg-coral', paper: 'bg-paper' }[accent]}`} aria-hidden="true" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-mist text-xs font-mono uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className={`relative font-display text-2xl sm:text-3xl font-semibold ${accents[accent]}`}><CountUp value={value} /></div>
      {sub && <div className="text-mist text-xs mt-1 font-mono">{sub}</div>}
    </div>
  )
}

export function SentimentBadge({ sentiment, confidence }) {
  const styles = {
    Positive: 'bg-signal/10 text-signal border-signal/30',
    Neutral: 'bg-mist/10 text-mist border-mist/30',
    Negative: 'bg-coral/10 text-coral border-coral/30',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${styles[sentiment] || styles.Neutral}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {sentiment}{confidence != null && <span className="opacity-60">· {Math.round(confidence * 100)}%</span>}
    </span>
  )
}

export function ReviewStatusBadge({ status }) {
  const confirmed = status === 'confirmed'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono ${
      confirmed ? 'bg-signal/10 text-signal border-signal/30' : 'bg-amber/10 text-amber border-amber/30'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {confirmed ? 'Confirmed' : 'Pending review'}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const styles = {
    high: 'bg-coral/10 text-coral border-coral/30',
    medium: 'bg-amber/10 text-amber border-amber/30',
    low: 'bg-mist/10 text-mist border-mist/30',
  }
  const key = (priority || 'medium').toLowerCase()
  return <span className={`px-2 py-0.5 rounded-md border text-[11px] font-mono uppercase ${styles[key] || styles.medium}`}>{key}</span>
}

export function StatusPill({ status }) {
  const styles = {
    Completed: 'bg-signal/10 text-signal',
    Pending: 'bg-mist/10 text-mist',
    'In Progress': 'bg-amber/10 text-amber',
    Overdue: 'bg-coral/10 text-coral',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-mono ${styles[status] || styles.Pending}`}>{status}</span>
}

export function ProductivityDial({ score = 0, size = 120, label }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const offset = c - (pct / 100) * c
  const color = pct >= 80 ? '#2DD9C4' : pct >= 50 ? '#F5A623' : '#FF5D7A'
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#233443" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="font-display" fontSize={size * 0.24} fill="#EAF2F5" fontWeight="600">
          {score}
        </text>
      </svg>
      {label && <span className="text-mist text-xs font-mono mt-1 uppercase tracking-wide">{label}</span>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`anim-pop bg-panel border border-line rounded-xl shadow-panel ${className}`}>{children}</div>
}

export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && <div className="text-signal text-xs font-mono uppercase tracking-widest mb-1">{eyebrow}</div>}
        <h2 className="font-display text-xl font-semibold text-paper">{title}</h2>
      </div>
      {action}
    </div>
  )
}
