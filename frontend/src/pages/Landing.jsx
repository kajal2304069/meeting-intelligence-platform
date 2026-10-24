import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/* =====================  helpers  ===================== */

function useInView(options = { threshold: 0.15 }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, options)
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, seen]
}

function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const [ref, seen] = useInView()
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  )
}

function CountUp({ to, suffix = '', duration = 1400 }) {
  const [ref, seen] = useInView()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    let raf, start
    const tick = (t) => {
      start = start ?? t
      const p = Math.min(1, (t - start) / duration)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, duration])
  return <span ref={ref}>{n}{suffix}</span>
}

function SectionHead({ eyebrow, title, sub, center = false }) {
  return (
    <Reveal className={`mb-12 sm:mb-14 ${center ? 'text-center mx-auto' : ''} max-w-2xl`}>
      <div className={`inline-flex items-center gap-2 text-signal font-mono text-xs tracking-widest uppercase mb-3 ${center ? 'justify-center' : ''}`}>
        <span className="w-6 h-px bg-signal/60" />{eyebrow}
      </div>
      <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight">{title}</h2>
      {sub && <p className="text-mist text-base sm:text-lg mt-3 leading-relaxed">{sub}</p>}
    </Reveal>
  )
}

/* =====================  navbar  ===================== */

const NAV = [
  { id: 'what', label: 'What it does' },
  { id: 'how', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'roles', label: 'Managers & Employees' },
  { id: 'faq', label: 'FAQ' },
]

function Logo({ onClick }) {
  return (
    <a href="#top" onClick={onClick} className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-xl bg-signal/15 border border-signal/30 flex items-center justify-center text-signal font-display font-bold group-hover:bg-signal/25 transition-colors">M</span>
      <span className="leading-tight">
        <span className="block font-display font-semibold text-paper">Meeting AI</span>
        <span className="hidden sm:block text-[10px] text-mist font-mono">Summaries · Tasks · Answers</span>
      </span>
    </a>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 8)
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    NAV.forEach((n) => { const el = document.getElementById(n.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-ink/90 backdrop-blur border-b border-line shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)]' : 'bg-transparent border-b border-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        <Logo onClick={() => setOpen(false)} />
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}
              className={`relative px-3 py-2 text-sm rounded-lg transition-colors ${active === n.id ? 'text-signal' : 'text-mist hover:text-paper'}`}>
              {n.label}
              <span className={`absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-signal origin-left transition-transform duration-300 ${active === n.id ? 'scale-x-100' : 'scale-x-0'}`} />
            </a>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          <Link to="/login" className="text-sm text-paper/90 hover:text-paper px-4 py-2 rounded-lg border border-transparent hover:border-line transition-colors">Log in</Link>
          <Link to="/signup" className="text-sm bg-signal text-ink font-semibold px-5 py-2.5 rounded-lg hover:brightness-110 hover:-translate-y-px transition-all shadow-[0_6px_20px_-6px_rgba(45,217,196,0.6)]">Get started free</Link>
        </div>
        <div className="flex lg:hidden items-center gap-2">
          <Link to="/signup" className="text-xs sm:text-sm bg-signal text-ink font-semibold px-3.5 py-2 rounded-lg">Get started</Link>
          <button className="w-10 h-10 rounded-lg border border-line bg-panel text-paper flex items-center justify-center" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            <span className="relative w-4 h-3 block">
              <span className={`absolute left-0 w-4 h-0.5 bg-paper rounded transition-all ${open ? 'top-1/2 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-paper rounded transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 w-4 h-0.5 bg-paper rounded transition-all ${open ? 'top-1/2 -rotate-45' : 'bottom-0'}`} />
            </span>
          </button>
        </div>
      </div>
      <div className="absolute left-0 bottom-0 h-0.5 bg-signal/80 transition-[width] duration-150" style={{ width: `${progress}%` }} aria-hidden="true" />

      {open && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-ink anim-drawer overflow-y-auto">
          <nav className="px-4 py-6 space-y-1" aria-label="Mobile">
            {NAV.map((n, i) => (
              <a key={n.id} href={`#${n.id}`} onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-4 py-4 rounded-xl text-base border ${active === n.id ? 'border-signal/40 bg-signal/10 text-signal' : 'border-transparent text-paper hover:bg-panel'}`}
                style={{ animation: `pop .35s ease-out ${i * 40}ms both` }}>
                {n.label}<span className="text-mist">→</span>
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-5">
              <Link to="/login" className="text-center border border-line rounded-xl py-3.5 text-sm">Log in</Link>
              <Link to="/signup" className="text-center bg-signal text-ink font-semibold rounded-xl py-3.5 text-sm">Get started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

/* =====================  hero demo (self-playing)  ===================== */

function Waveform({ active = true, className = '' }) {
  const bars = [6, 14, 9, 22, 12, 28, 16, 8, 24, 13, 30, 10, 18, 7, 21, 11, 26, 9, 15, 6]
  return (
    <svg viewBox="0 0 200 36" className={className} preserveAspectRatio="none" aria-hidden="true">
      {bars.map((h, i) => (
        <rect key={i} x={i * 10 + 2} y={18 - h / 2} width="5" height={h} rx="2.5" fill="#2DD9C4" opacity={active ? 0.4 + (h / 30) * 0.6 : 0.25}>
          {active && <animate attributeName="height" values={`${h};${Math.max(4, h * 0.35)};${h}`} dur={`${0.9 + (i % 5) * 0.18}s`} repeatCount="indefinite" />}
          {active && <animate attributeName="y" values={`${18 - h / 2};${18 - Math.max(4, h * 0.35) / 2};${18 - h / 2}`} dur={`${0.9 + (i % 5) * 0.18}s`} repeatCount="indefinite" />}
        </rect>
      ))}
    </svg>
  )
}

const DEMO_STAGES = ['Recording', 'Writing summary', 'Finding tasks', 'Ready to ask']

function HeroDemo() {
  const [stage, setStage] = useState(0)
  const [typed, setTyped] = useState('')
  const answer = 'QA found two blocking bugs, so the team agreed to move launch from the 11th to the 18th.'

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setStage(3); setTyped(answer); return }
    let timers = []
    const run = () => {
      setStage(0); setTyped('')
      timers = [
        setTimeout(() => setStage(1), 2200),
        setTimeout(() => setStage(2), 4200),
        setTimeout(() => setStage(3), 6200),
      ]
    }
    run()
    const loop = setInterval(run, 15500)
    return () => { timers.forEach(clearTimeout); clearInterval(loop) }
  }, [])

  useEffect(() => {
    if (stage !== 3) return
    let i = 0
    const t = setInterval(() => { i += 2; setTyped(answer.slice(0, i)); if (i >= answer.length) clearInterval(t) }, 28)
    return () => clearInterval(t)
  }, [stage])

  const tasks = [['Update pricing copy', 'Riya', 'Fri', 'text-amber'], ['Book legal review', 'Arjun', 'Wed', 'text-coral'], ['Prep support deck', 'Meera', 'Mon', 'text-signal']]

  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0 lg:ml-auto">
      <div className="absolute -top-10 -right-8 w-56 h-56 rounded-full bg-signal/20 blur-3xl anim-drift" aria-hidden="true" />
      <div className="absolute -bottom-10 -left-8 w-48 h-48 rounded-full bg-amber/10 blur-3xl anim-drift" style={{ animationDelay: '-6s' }} aria-hidden="true" />
      <div className="relative bg-panel border border-line rounded-2xl shadow-panel overflow-hidden anim-floaty">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
          <span className="w-2.5 h-2.5 rounded-full bg-coral" /><span className="w-2.5 h-2.5 rounded-full bg-amber" /><span className="w-2.5 h-2.5 rounded-full bg-signal" />
          <span className="ml-2 text-mist text-[11px] font-mono truncate">Q4 launch planning · live demo</span>
        </div>
        {/* progress steps */}
        <div className="px-4 pt-3 flex gap-1.5">
          {DEMO_STAGES.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-colors duration-500 ${i <= stage ? 'bg-signal' : 'bg-line'}`} />
              <div className={`text-[9px] font-mono mt-1 truncate transition-colors ${i === stage ? 'text-signal' : 'text-mist/70'}`}>{s}</div>
            </div>
          ))}
        </div>
        <div className="p-4 space-y-4 min-h-[330px]">
          <div className="flex items-center gap-3 bg-panelLight border border-line rounded-xl px-3 py-2">
            <span className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center ${stage === 0 ? 'bg-coral/20 border-coral/40 text-coral animate-pulse' : 'bg-signal/15 border-signal/40 text-signal'}`}>{stage === 0 ? '●' : '✓'}</span>
            <Waveform active={stage === 0} className="flex-1 h-8" />
            <span className={`font-mono text-[11px] ${stage === 0 ? 'text-coral' : 'text-signal'}`}>{stage === 0 ? 'REC' : 'DONE'}</span>
          </div>
          {stage >= 1 && (
            <div className="anim-pop">
              <div className="text-mist text-[10px] font-mono uppercase mb-1">Summary</div>
              <ul className="text-paper/90 text-xs space-y-1 leading-relaxed">
                {['Launch moved to the 18th after QA feedback', 'Pricing page needs legal review first', 'Support training starts next Monday'].map((l, i) => (
                  <li key={l} className="anim-pop" style={{ animationDelay: `${i * 220}ms` }}>• {l}</li>
                ))}
              </ul>
            </div>
          )}
          {stage >= 2 && (
            <div>
              <div className="text-mist text-[10px] font-mono uppercase mb-1">Action items</div>
              <div className="space-y-1.5">
                {tasks.map(([t, o, d, c], i) => (
                  <div key={t} className="flex items-center justify-between bg-panelLight border border-line rounded-lg px-3 py-1.5 text-xs anim-pop" style={{ animationDelay: `${i * 260}ms` }}>
                    <span className="text-paper truncate">{t}</span>
                    <span className="flex gap-3 shrink-0 font-mono text-[10px]"><span className="text-mist">{o}</span><span className={c}>{d}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stage >= 3 && (
            <div className="space-y-2">
              <div className="flex justify-end anim-pop"><div className="bg-signal/15 border border-signal/30 text-paper text-xs rounded-xl px-3 py-1.5"><span className="text-signal">●</span> Why did the launch date change?</div></div>
              <div className="flex"><div className="bg-panelLight border border-line text-paper/90 text-xs rounded-xl px-3 py-1.5 max-w-[88%] min-h-[2rem]">{typed}<span className="inline-block w-0.5 h-3 bg-signal ml-0.5 align-middle animate-pulse" /></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RotatingWord() {
  const words = ['decisions', 'tasks', 'deadlines', 'owners']
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % words.length), 2200); return () => clearInterval(t) }, [])
  return (
    <span className="relative inline-block align-bottom h-[1.15em] overflow-hidden">
      {words.map((w, k) => (
        <span key={w} className="block text-sheen transition-all duration-500" style={{ transform: `translateY(${(k - i) * 100}%)`, opacity: k === i ? 1 : 0, position: k === 0 ? 'relative' : 'absolute', left: 0, top: 0 }}>{w}</span>
      ))}
    </span>
  )
}

/* =====================  icons & data  ===================== */

function Icon({ name }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const p = {
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
    check: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.5 2.5L16 9.5" /></>,
    chat: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    chart: <><path d="M4 20V4M4 20h16" /><path d="m7 15 4-5 3 3 5-7" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4-4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
    shield: <><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  }
  return <svg viewBox="0 0 24 24" className="w-5 h-5" {...c} aria-hidden="true">{p[name]}</svg>
}

const PROBLEMS = [
  { icon: 'doc', t: 'Decisions get forgotten', d: 'Meetings end and nobody remembers exactly what was agreed.' },
  { icon: 'check', t: 'Tasks slip through', d: 'Owners and deadlines were never written down.' },
  { icon: 'search', t: 'Notes are patchy', d: 'Someone has to scribble while also trying to take part.' },
]

const STEPS = [
  { icon: 'mic', title: 'Record', text: 'Record your Zoom, Meet or Teams call from the browser — or upload a file or paste a link.' },
  { icon: 'doc', title: 'AI writes it up', text: 'It transcribes the audio and writes a title, a summary and a list of action items.' },
  { icon: 'check', title: 'Manager confirms', text: 'The manager checks each owner and deadline, then confirms in one click.' },
  { icon: 'mail', title: 'Team stays in sync', text: 'Tasks go to the right people by email, and anyone can ask the meeting questions.' },
]

const FEATURES = [
  { icon: 'mic', title: 'Record or upload', text: 'Live browser recording, audio/video upload, or a YouTube / recording link.' },
  { icon: 'globe', title: 'English + Hinglish', text: 'Understands Hindi-English mixed speech, the way teams really talk.' },
  { icon: 'doc', title: 'Instant summary', text: 'A clear title and bullet summary of what was discussed and decided.' },
  { icon: 'check', title: 'Action items', text: 'Tasks pulled out with owner, deadline and priority — auto-filled and checkable.' },
  { icon: 'chat', title: 'Ask by voice or text', text: 'Get answers from the real transcript, read aloud if you like.' },
  { icon: 'mail', title: 'Email follow-ups', text: 'Confirmed meetings and task reminders land in everyone’s inbox.' },
  { icon: 'search', title: 'Search all meetings', text: 'Find any past discussion by typing — or by speaking.' },
  { icon: 'chart', title: 'Team dashboards', text: 'Completion, sentiment and workload for the whole team at a glance.' },
  { icon: 'shield', title: 'Private by company', text: 'Each company has its own space. Nobody sees another company’s data.' },
]

const ROLES = {
  manager: {
    label: 'I’m a manager', color: 'text-amber', bar: 'bg-amber',
    heading: 'Run follow-ups without chasing anyone',
    items: [
      ['Everything written down', 'Summary and decisions are ready minutes after the meeting ends.'],
      ['Verify, then confirm', 'Fix any owner or deadline the AI guessed, then confirm in one click.'],
      ['See the whole team', 'Dashboard of done, due-soon and overdue tasks, plus workload per person.'],
      ['Easy onboarding', 'Share your company invite code and your team joins in seconds.'],
    ],
  },
  employee: {
    label: 'I’m an employee', color: 'text-signal', bar: 'bg-signal',
    heading: 'Know exactly what’s yours — and what was said',
    items: [
      ['No note-taking', 'Stay in the conversation; the meeting writes itself up.'],
      ['Your tasks, clearly', 'Owner, deadline and priority for everything assigned to you.'],
      ['Ask when in doubt', 'Missed something? Ask by voice or text and get the answer from the transcript.'],
      ['Search anything', 'Find what was said in any past meeting instead of digging through chats.'],
    ],
  },
}

const FAQ = [
  ['Which meetings can I use it with?', 'Any. Record a Zoom, Google Meet or Teams call from your browser (share the tab or screen with audio), upload a recording, or paste a link to one.'],
  ['Does it understand Hindi-English mix?', 'Yes. Choose Hinglish when you start and it uses a speech model built for code-mixed speech.'],
  ['How do employees join my company?', 'The manager creates the company account and shares an invite code. Employees sign up with that code and see their own tasks and meetings.'],
  ['Can the AI make things up?', 'Answers are generated from the meeting’s transcript only. If something wasn’t said, the assistant tells you it doesn’t have that information. Managers also verify tasks before confirming.'],
  ['Is my meeting data private?', 'Each company has a separate workspace, and people only see data from their own company.'],
]

function RoleIllustration({ kind }) {
  if (kind === 'manager') {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-auto" role="img" aria-label="Manager dashboard with progress bars and a confirm button">
        <rect x="8" y="8" width="304" height="164" rx="14" fill="#131E29" stroke="#233443" />
        {[['DONE', '24', '#2DD9C4', 24, 90], ['DUE SOON', '7', '#F5A623', 124, 90], ['OVERDUE', '2', '#FF5D7A', 224, 72]].map(([l, v, c, x, w]) => (
          <g key={l}><rect x={x} y="24" width={w} height="46" rx="8" fill="#1B2A38" /><text x={x + 12} y="44" fill="#7E93A3" fontSize="9" fontFamily="monospace">{l}</text><text x={x + 12} y="62" fill={c} fontSize="18" fontWeight="700">{v}</text></g>
        ))}
        {[['Riya', 0.85, '#2DD9C4'], ['Arjun', 0.55, '#F5A623'], ['Meera', 0.7, '#2DD9C4']].map(([n, p, c], i) => (
          <g key={n} transform={`translate(24 ${88 + i * 20})`}>
            <text x="0" y="9" fill="#EAF2F5" fontSize="10">{n}</text>
            <rect x="52" y="1" width="160" height="9" rx="4.5" fill="#1B2A38" />
            <rect x="52" y="1" width={160 * p} height="9" rx="4.5" fill={c}><animate attributeName="width" from="0" to={160 * p} dur="1.2s" fill="freeze" /></rect>
          </g>
        ))}
        <rect x="228" y="132" width="68" height="26" rx="8" fill="#2DD9C4"><animate attributeName="opacity" values="1;.7;1" dur="2.4s" repeatCount="indefinite" /></rect>
        <text x="240" y="149" fill="#0B141C" fontSize="10" fontWeight="700">Confirm ✓</text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 180" className="w-full h-auto" role="img" aria-label="Employee asking a question by voice and getting an answer">
      <rect x="8" y="8" width="304" height="164" rx="14" fill="#131E29" stroke="#233443" />
      <rect x="24" y="24" width="150" height="26" rx="13" fill="#2DD9C41F" stroke="#2DD9C44D" /><text x="38" y="41" fill="#EAF2F5" fontSize="10">● When is my deadline?</text>
      <rect x="64" y="62" width="232" height="46" rx="12" fill="#1B2A38" stroke="#233443" />
      <text x="76" y="80" fill="#EAF2F5" fontSize="10">Your pricing-copy task is due Friday.</text>
      <text x="76" y="95" fill="#7E93A3" fontSize="9">Priority: high · set by your manager</text>
      <rect x="24" y="124" width="34" height="34" rx="10" fill="#FF5D7A1A" stroke="#FF5D7A66" /><circle cx="41" cy="141" r="6" fill="#FF5D7A"><animate attributeName="r" values="6;8;6" dur="1.4s" repeatCount="indefinite" /></circle>
      <g transform="translate(70 132)">{[6, 12, 8, 16, 10, 18, 7, 13, 9, 15, 6, 11].map((h, i) => (
        <rect key={i} x={i * 10} y={9 - h / 2} width="5" height={h} rx="2.5" fill="#2DD9C4" opacity=".85">
          <animate attributeName="height" values={`${h};${h * 0.4};${h}`} dur={`${0.8 + (i % 4) * 0.2}s`} repeatCount="indefinite" />
          <animate attributeName="y" values={`${9 - h / 2};${9 - h * 0.2};${9 - h / 2}`} dur={`${0.8 + (i % 4) * 0.2}s`} repeatCount="indefinite" />
        </rect>))}</g>
      <rect x="226" y="128" width="70" height="26" rx="8" fill="#1B2A38" stroke="#233443" /><text x="238" y="145" fill="#7E93A3" fontSize="10">▶ listen</text>
    </svg>
  )
}

/* =====================  page  ===================== */

export default function Landing() {
  const [role, setRole] = useState('manager')
  const [showTop, setShowTop] = useState(false)
  const r = ROLES[role]

  useEffect(() => {
    const on = () => setShowTop(window.scrollY > 700)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div id="top" className="min-h-screen bg-ink text-paper font-body overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" aria-hidden="true"
          style={{ backgroundImage: 'linear-gradient(#2DD9C4 1px, transparent 1px), linear-gradient(90deg, #2DD9C4 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 30% 30%, black, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 30% 30%, black, transparent 70%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <div className="anim-pop inline-flex items-center gap-2 text-xs font-mono text-signal border border-signal/30 bg-signal/10 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" /> AI meeting assistant for teams
            </div>
            <h1 className="anim-pop font-display font-bold text-4xl sm:text-5xl xl:text-6xl leading-[1.08] tracking-tight" style={{ animationDelay: '80ms' }}>
              Turn every meeting into clear <RotatingWord />
            </h1>
            <p className="anim-pop text-mist text-base sm:text-lg mt-5 max-w-xl leading-relaxed" style={{ animationDelay: '160ms' }}>
              Record a meeting and Meeting AI writes the summary, finds every task with an owner and deadline, and lets anyone ask questions about it — by voice or text.
            </p>
            <div className="anim-pop flex flex-col sm:flex-row gap-3 mt-8" style={{ animationDelay: '240ms' }}>
              <Link to="/signup" className="text-center bg-signal text-ink font-semibold px-7 py-3.5 rounded-xl hover:brightness-110 hover:-translate-y-0.5 transition-all shadow-[0_10px_30px_-10px_rgba(45,217,196,0.7)]">Get started free →</Link>
              <a href="#how" className="text-center border border-line text-paper px-7 py-3.5 rounded-xl hover:border-signal/50 hover:bg-panel transition-all">See how it works</a>
            </div>
            <div className="anim-pop flex flex-wrap gap-x-6 gap-y-2 mt-8 text-xs text-mist font-mono" style={{ animationDelay: '320ms' }}>
              <span>✓ English &amp; Hinglish</span><span>✓ Voice questions</span><span>✓ For managers &amp; employees</span>
            </div>
          </div>
          <HeroDemo />
        </div>
      </section>

      {/* works-with marquee */}
      <section aria-label="Works with" className="border-y border-line bg-panel/50 overflow-hidden">
        <div className="flex w-max anim-marquee py-4">
          {[0, 1].map((k) => (
            <div key={k} className="flex items-center gap-10 pr-10 text-mist font-mono text-sm whitespace-nowrap" aria-hidden={k === 1}>
              {['Zoom calls', 'Google Meet', 'Microsoft Teams', 'YouTube links', 'Audio uploads', 'Live browser recording', 'English', 'Hinglish'].map((t) => (
                <span key={t} className="flex items-center gap-10">{t}<span className="text-signal">◆</span></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* WHAT IT DOES */}
      <section id="what" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <SectionHead eyebrow="What it does" title="Meetings shouldn’t end with “who was doing what?”"
          sub="Meeting AI listens so you don’t have to take notes — and turns the conversation into things your team can act on." />
        <div className="grid md:grid-cols-3 gap-4">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.t} delay={i * 100}>
              <div className="h-full bg-panel border border-line rounded-2xl p-6 hover:-translate-y-1 hover:border-coral/40 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-coral/10 border border-coral/30 text-coral flex items-center justify-center mb-4"><Icon name={p.icon} /></div>
                <h3 className="font-display font-semibold text-lg mb-1.5">{p.t}</h3>
                <p className="text-mist text-sm leading-relaxed">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[[4, '', 'simple steps from recording to follow-up'], [2, '', 'languages: English & Hinglish'], [2, '', 'roles: manager & employee'], [1, ' click', 'for a manager to confirm']].map(([n, s, l]) => (
            <div key={l} className="bg-panel/60 border border-line rounded-2xl px-5 py-5 text-center">
              <div className="font-display font-bold text-3xl text-signal"><CountUp to={n} suffix={s} /></div>
              <div className="text-mist text-xs mt-1 leading-snug">{l}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* HOW */}
      <section id="how" className="bg-panel/50 border-y border-line scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <SectionHead eyebrow="How it works" title="From recording to follow-up in four simple steps" sub="No setup headaches. If you can press record, you can use it." />
          <div className="relative">
            <div className="hidden lg:block absolute top-7 left-[12%] right-[12%] h-px bg-line origin-left" aria-hidden="true" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 120}>
                  <div className="relative h-full bg-panel border border-line rounded-2xl p-6 hover:border-signal/40 hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-14 h-14 rounded-full bg-ink border border-signal/40 text-signal flex items-center justify-center relative z-10 shadow-[0_0_0_6px_#131E29]"><Icon name={s.icon} /></span>
                      <span className="font-mono text-mist text-xs">STEP {i + 1}</span>
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
                    <p className="text-mist text-sm leading-relaxed">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <SectionHead eyebrow="Features" title="Everything a meeting should leave behind" sub="Nine things that save your team time after every call." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="group h-full bg-panel border border-line rounded-2xl p-6 hover:border-signal/40 hover:-translate-y-1 hover:shadow-[0_16px_40px_-20px_rgba(45,217,196,0.35)] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-signal/10 border border-signal/25 text-signal flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-signal/20 transition-all"><Icon name={f.icon} /></div>
                <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
                <p className="text-mist text-sm leading-relaxed">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VOICE SPOTLIGHT */}
      <section className="bg-panel/50 border-y border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="order-2 lg:order-1"><RoleIllustration kind="employee" /></Reveal>
          <Reveal className="order-1 lg:order-2" delay={100}>
            <div className="inline-flex items-center gap-2 text-signal font-mono text-xs tracking-widest uppercase mb-3"><span className="w-6 h-px bg-signal/60" />Ask by voice</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight tracking-tight mb-4">Got a doubt? Just ask the meeting.</h2>
            <p className="text-mist leading-relaxed mb-5">
              Tap the mic and say “Who owns the pricing page?” or “Why did we delay the launch?”. The assistant searches the real transcript, answers in plain words, and can read the answer back to you.
            </p>
            <ul className="space-y-2.5 text-sm text-paper/90">
              {['Answers come only from what was actually said', 'Works with English, Indian English and Hindi voice', 'Prefer typing? The same chat works with text'].map((t) => (
                <li key={t} className="flex gap-2.5"><span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-signal/15 text-signal text-xs flex items-center justify-center">✓</span>{t}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-20">
        <SectionHead eyebrow="Managers & Employees" title="How it helps you — whichever side of the table you’re on" sub="Pick your role to see what changes for you." />
        <Reveal>
          <div role="tablist" aria-label="Choose your role" className="inline-flex p-1 rounded-xl bg-panel border border-line mb-8">
            {Object.entries(ROLES).map(([k, v]) => (
              <button key={k} role="tab" aria-selected={role === k} onClick={() => setRole(k)}
                className={`px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${role === k ? `bg-panelLight ${v.color} shadow` : 'text-mist hover:text-paper'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <div key={role} className="grid lg:grid-cols-2 gap-8 items-center anim-pop">
            <div className="bg-panel border border-line rounded-2xl p-5 sm:p-8"><RoleIllustration kind={role} /></div>
            <div>
              <h3 className={`font-display font-semibold text-2xl mb-5 ${r.color}`}>{r.heading}</h3>
              <ul className="space-y-4">
                {r.items.map(([t, d], i) => (
                  <li key={t} className="flex gap-3 anim-pop" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className={`mt-1.5 w-1.5 h-6 rounded-full shrink-0 ${r.bar}`} />
                    <div><div className="font-medium text-paper">{t}</div><div className="text-mist text-sm leading-relaxed">{d}</div></div>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`inline-block mt-7 text-sm font-semibold px-6 py-3 rounded-xl ${role === 'manager' ? 'bg-amber text-ink' : 'bg-signal text-ink'} hover:brightness-110 transition-all`}>
                Get started as {role === 'manager' ? 'a manager' : 'an employee'} →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-panel/50 border-y border-line scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <SectionHead eyebrow="FAQ" title="Questions first-time visitors ask" />
          <div className="space-y-3">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 60}>
                <details className="group bg-panel border border-line rounded-xl px-5 py-4 open:border-signal/40 transition-colors">
                  <summary className="cursor-pointer list-none flex justify-between items-center gap-4 font-medium text-paper">
                    {q}<span className="text-signal transition-transform duration-300 group-open:rotate-45 text-xl leading-none shrink-0">+</span>
                  </summary>
                  <p className="text-mist text-sm leading-relaxed mt-3">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <Reveal className="max-w-4xl mx-auto text-center bg-panel border border-signal/30 rounded-3xl px-6 py-14 sm:py-16 relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 bg-signal/20 blur-3xl anim-drift" aria-hidden="true" />
          <h2 className="relative font-display font-bold text-3xl sm:text-4xl mb-3">Ready for your next meeting to count?</h2>
          <p className="relative text-mist mb-8 max-w-lg mx-auto">Create your company space in a minute, record your first meeting, and see the summary and tasks appear.</p>
          <div className="relative flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/signup" className="bg-signal text-ink font-semibold px-8 py-3.5 rounded-xl hover:brightness-110 hover:-translate-y-0.5 transition-all">Get started free →</Link>
            <Link to="/login" className="border border-line px-8 py-3.5 rounded-xl hover:border-signal/50 transition-colors">I already have an account</Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-mist">
          <Logo />
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className="hover:text-paper">{n.label}</a>)}
            <Link to="/login" className="hover:text-paper">Log in</Link>
          </nav>
          <span className="font-mono">© {new Date().getFullYear()} Meeting AI</span>
        </div>
      </footer>

      <a href="#top" aria-label="Back to top"
        className={`fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-30 w-11 h-11 rounded-full bg-signal text-ink flex items-center justify-center font-bold shadow-lg transition-all duration-300 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>↑</a>
    </div>
  )
}
