import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AssistantChat from './AssistantChat.jsx'
import Robot from './Robot.jsx'

/** Floating "Ask Mia" button + slide-up chat panel, available on every app page
 * except the two pages that already have Mia built in. */
export default function AssistantLauncher() {
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const { pathname } = useLocation()
  const hidden = pathname.startsWith('/search') || pathname.startsWith('/voice-search')

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    const t = setTimeout(() => setHint(true), 2500)
    const t2 = setTimeout(() => setHint(false), 9000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])
  if (hidden) return null

  return (
    <>
      {open && (
        <div className="fixed z-50 inset-x-3 bottom-24 sm:inset-x-auto sm:right-6 sm:w-[26rem] anim-slideup">
          <div className="relative">
            <button onClick={() => setOpen(false)} aria-label="Close assistant"
              className="absolute -top-3 -right-1 z-10 w-7 h-7 rounded-full bg-panelLight border border-line text-mist hover:text-coral text-xs">✕</button>
            <AssistantChat height="h-[min(24rem,50vh)]" className="shadow-2xl" />
          </div>
        </div>
      )}
      {!open && hint && (
        <div className="fixed z-40 right-24 bottom-8 hidden sm:block anim-pop bg-panel border border-signal/30 text-paper text-xs rounded-xl px-3 py-2 shadow-lg">
          Need help? Ask Mia 👋
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close assistant' : 'Open AI assistant'}
        className="fixed z-50 right-4 bottom-4 sm:right-6 sm:bottom-6 w-16 h-16 rounded-full bg-panel border-2 border-signal/50 shadow-[0_10px_30px_-8px_rgba(45,217,196,0.6)] hover:scale-105 transition-transform flex items-center justify-center">
        <Robot mood={open ? 'speaking' : 'idle'} size={46} />
      </button>
    </>
  )
}
