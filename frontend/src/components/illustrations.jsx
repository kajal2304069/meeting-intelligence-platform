import React from 'react'

/** Small on-brand SVG scenes used in page banners and empty states. */
export function Illo({ kind, className = '' }) {
  const common = { viewBox: '0 0 200 140', className, role: 'img', 'aria-hidden': true }
  const Frame = ({ children }) => (
    <svg {...common}>
      <circle cx="100" cy="72" r="60" fill="#2DD9C4" opacity=".06" />
      <circle cx="100" cy="72" r="40" fill="#2DD9C4" opacity=".06" />
      {children}
    </svg>
  )
  switch (kind) {
    case 'dashboard':
      return (
        <Frame>
          <rect x="30" y="26" width="140" height="92" rx="12" fill="#131E29" stroke="#233443" />
          <rect x="40" y="38" width="38" height="22" rx="6" fill="#1B2A38" /><rect x="82" y="38" width="38" height="22" rx="6" fill="#1B2A38" /><rect x="124" y="38" width="38" height="22" rx="6" fill="#1B2A38" />
          <circle cx="50" cy="49" r="4" fill="#2DD9C4" /><circle cx="92" cy="49" r="4" fill="#F5A623" /><circle cx="134" cy="49" r="4" fill="#FF5D7A" />
          {[18, 30, 22, 40, 28, 46, 34].map((h, i) => (
            <rect key={i} x={44 + i * 17} y={108 - h} width="9" height={h} rx="3" fill="#2DD9C4" opacity={0.4 + i * 0.09}>
              <animate attributeName="height" values={`${h};${h + 8};${h}`} dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${108 - h};${100 - h};${108 - h}`} dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </Frame>
      )
    case 'meetings':
      return (
        <Frame>
          <rect x="62" y="22" width="76" height="76" rx="38" fill="#131E29" stroke="#2DD9C4" strokeOpacity=".5" strokeWidth="2" />
          <rect x="88" y="38" width="24" height="40" rx="12" fill="#2DD9C4" /><path d="M76 66a24 24 0 0 0 48 0M100 90v14M88 104h24" stroke="#2DD9C4" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[0, 1].map((k) => <circle key={k} cx="100" cy="60" r="44" fill="none" stroke="#2DD9C4" strokeWidth="1.5"><animate attributeName="r" values="40;62" dur="2.4s" begin={`${k * 1.2}s`} repeatCount="indefinite" /><animate attributeName="opacity" values=".6;0" dur="2.4s" begin={`${k * 1.2}s`} repeatCount="indefinite" /></circle>)}
        </Frame>
      )
    case 'tasks':
      return (
        <Frame>
          {[[26, '#7E93A3'], [78, '#F5A623'], [130, '#2DD9C4']].map(([x, c], i) => (
            <g key={x}>
              <rect x={x} y="24" width="46" height="92" rx="8" fill="#131E29" stroke="#233443" />
              <rect x={x + 6} y="30" width="34" height="4" rx="2" fill={c} />
              {[0, 1, i === 1 ? 0 : 1].slice(0, 2 + (i === 0 ? 0 : 0)).map((_, j) => (
                <rect key={j} x={x + 6} y={42 + j * 26} width="34" height="20" rx="5" fill="#1B2A38" stroke={c} strokeOpacity=".4">
                  <animate attributeName="opacity" values=".6;1;.6" dur={`${2.4 + j * 0.5 + i * 0.3}s`} repeatCount="indefinite" />
                </rect>
              ))}
            </g>
          ))}
          <path d="m148 60 5 5 9-10" stroke="#2DD9C4" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Frame>
      )
    case 'analytics':
      return (
        <Frame>
          <rect x="26" y="26" width="148" height="88" rx="12" fill="#131E29" stroke="#233443" />
          <path d="M40 98 L68 74 L92 86 L124 54 L158 40" stroke="#2DD9C4" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="200" strokeDashoffset="200"><animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.6s" fill="freeze" /></path>
          {[[68, 74], [92, 86], [124, 54], [158, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#0B141C" stroke="#F5A623" strokeWidth="2" />)}
        </Frame>
      )
    case 'team':
      return (
        <Frame>
          {[[64, '#2DD9C4'], [100, '#F5A623'], [136, '#FF5D7A']].map(([x, c], i) => (
            <g key={x} transform={`translate(0 ${i === 1 ? -8 : 0})`}>
              <circle cx={x} cy="58" r="14" fill="#1B2A38" stroke={c} strokeWidth="2" />
              <path d={`M${x - 22} 106a22 22 0 0 1 44 0z`} fill="#131E29" stroke={c} strokeOpacity=".7" strokeWidth="2" />
              <circle cx={x} cy="58" r="14" fill={c} opacity=".12"><animate attributeName="opacity" values=".12;.3;.12" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" /></circle>
            </g>
          ))}
        </Frame>
      )
    case 'search':
      return (
        <Frame>
          <rect x="28" y="30" width="110" height="14" rx="7" fill="#1B2A38" /><rect x="28" y="54" width="90" height="10" rx="5" fill="#1B2A38" /><rect x="28" y="74" width="100" height="10" rx="5" fill="#1B2A38" />
          <rect x="28" y="94" width="70" height="10" rx="5" fill="#2DD9C4" opacity=".4"><animate attributeName="opacity" values=".2;.7;.2" dur="2s" repeatCount="indefinite" /></rect>
          <g><circle cx="140" cy="74" r="26" fill="#0B141C" stroke="#2DD9C4" strokeWidth="5" /><path d="m160 94 18 18" stroke="#2DD9C4" strokeWidth="8" strokeLinecap="round" />
            <animateTransform attributeName="transform" type="translate" values="0 0;-6 -4;0 0" dur="3s" repeatCount="indefinite" /></g>
        </Frame>
      )
    case 'voice':
      return (
        <Frame>
          <g transform="translate(24 52)">{[10, 22, 34, 18, 44, 26, 12, 38, 20, 30, 14, 24, 10, 28].map((h, i) => (
            <rect key={i} x={i * 11} y={18 - h / 2} width="6" height={h} rx="3" fill={i % 3 === 0 ? '#FF5D7A' : '#2DD9C4'} opacity=".85">
              <animate attributeName="height" values={`${h};${Math.max(6, h * 0.35)};${h}`} dur={`${0.9 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
              <animate attributeName="y" values={`${18 - h / 2};${18 - Math.max(6, h * 0.35) / 2};${18 - h / 2}`} dur={`${0.9 + (i % 5) * 0.2}s`} repeatCount="indefinite" />
            </rect>))}</g>
          <circle cx="100" cy="112" r="10" fill="#FF5D7A" opacity=".2"><animate attributeName="r" values="8;14;8" dur="1.6s" repeatCount="indefinite" /></circle><circle cx="100" cy="112" r="5" fill="#FF5D7A" />
        </Frame>
      )
    case 'empty':
    default:
      return (
        <Frame>
          <rect x="52" y="34" width="96" height="72" rx="12" fill="#131E29" stroke="#233443" strokeDasharray="5 5" />
          <path d="M80 70h40M100 50v40" stroke="#2DD9C4" strokeWidth="4" strokeLinecap="round"><animate attributeName="opacity" values=".4;1;.4" dur="2.2s" repeatCount="indefinite" /></path>
        </Frame>
      )
  }
}

/** Gradient hero banner at the top of each page. */
export function PageBanner({ eyebrow, title, sub, illo, actions, accent = 'signal' }) {
  const glow = { signal: 'from-signal/15', amber: 'from-amber/15', coral: 'from-coral/15' }[accent] || 'from-signal/15'
  return (
    <div className={`page-in relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br ${glow} via-panel to-panel p-5 sm:p-8`}>
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-signal/10 blur-3xl anim-drift pointer-events-none" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 max-w-xl">
          {eyebrow && <div className="text-signal text-[11px] sm:text-xs font-mono uppercase tracking-widest mb-2">{eyebrow}</div>}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-paper leading-tight">{title}</h1>
          {sub && <p className="text-mist text-sm sm:text-base mt-2 leading-relaxed">{sub}</p>}
          {actions && <div className="flex flex-wrap gap-2.5 mt-5">{actions}</div>}
        </div>
        {illo && <Illo kind={illo} className="hidden sm:block w-40 lg:w-52 shrink-0 anim-floaty" />}
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action, illo = 'empty' }) {
  return (
    <div className="text-center py-10 px-4 anim-pop">
      <Illo kind={illo} className="w-40 mx-auto" />
      <h3 className="font-display font-semibold text-paper mt-2">{title}</h3>
      {text && <p className="text-mist text-sm mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
