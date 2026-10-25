import React from 'react'

/**
 * "Mia", the assistant's face. mood: 'idle' | 'thinking' | 'listening' | 'speaking'.
 * Pure SVG + CSS, so it needs no image files and stays crisp at any size.
 */
export default function Robot({ mood = 'idle', size = 64, className = '' }) {
  const listening = mood === 'listening'
  const speaking = mood === 'speaking'
  const thinking = mood === 'thinking'
  const accent = listening ? '#FF5D7A' : '#2DD9C4'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`${thinking ? 'rb-think' : ''} ${className}`} role="img" aria-label={`Mia the AI assistant is ${mood}`}>
      {listening && (
        <>
          <circle className="rb-ring" cx="50" cy="56" r="34" fill="none" stroke="#FF5D7A" strokeWidth="2" />
          <circle className="rb-ring" cx="50" cy="56" r="34" fill="none" stroke="#FF5D7A" strokeWidth="2" style={{ animationDelay: '.8s' }} />
        </>
      )}
      {/* antenna */}
      <line x1="50" y1="22" x2="50" y2="10" stroke="#7E93A3" strokeWidth="3" strokeLinecap="round" />
      <circle className="rb-antenna" cx="50" cy="8" r="5" fill={accent} />
      {/* ears */}
      <rect x="10" y="48" width="9" height="20" rx="4" fill="#1B2A38" stroke={accent} strokeOpacity=".6" />
      <rect x="81" y="48" width="9" height="20" rx="4" fill="#1B2A38" stroke={accent} strokeOpacity=".6" />
      {/* head */}
      <rect x="18" y="22" width="64" height="58" rx="18" fill="#131E29" stroke="#2DD9C4" strokeOpacity=".55" strokeWidth="2" />
      <rect x="18" y="22" width="64" height="58" rx="18" fill="url(#rbShine)" />
      {/* visor */}
      <rect x="26" y="34" width="48" height="26" rx="12" fill="#0B141C" stroke="#233443" />
      <g>
        <ellipse className="rb-eye" cx="39" cy="47" rx="5" ry="6" fill={accent} />
        <ellipse className="rb-eye" cx="61" cy="47" rx="5" ry="6" fill={accent} style={{ animationDelay: '.05s' }} />
      </g>
      {/* cheeks */}
      <circle cx="30" cy="64" r="2.5" fill="#FF5D7A" opacity=".35" />
      <circle cx="70" cy="64" r="2.5" fill="#FF5D7A" opacity=".35" />
      {/* mouth */}
      {speaking ? (
        <g fill={accent}>
          {[40, 46, 52, 58].map((x, i) => (
            <rect key={x} className="rb-mouth" x={x - 1.5} y="64" width="3" height="9" rx="1.5" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </g>
      ) : (
        <path d={thinking ? 'M42 70h16' : 'M41 68q9 7 18 0'} stroke={accent} strokeWidth="3" strokeLinecap="round" fill="none" />
      )}
      <defs>
        <linearGradient id="rbShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2DD9C4" stopOpacity=".12" />
          <stop offset="1" stopColor="#2DD9C4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
