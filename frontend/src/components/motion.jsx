import React, { useEffect, useRef, useState } from 'react'

export function useInView(options = { threshold: 0.12 }) {
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

/** Fades + slides its children in when scrolled into view. */
export function Reveal({ children, delay = 0, className = '' }) {
  const [ref, seen] = useInView()
  return (
    <div ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/** Counts up to a number when it first appears. Non-numeric values render as-is. */
export function CountUp({ value, duration = 1000 }) {
  const [ref, seen] = useInView()
  const num = typeof value === 'number' ? value : NaN
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen || Number.isNaN(num)) return
    let raf, start
    const tick = (t) => {
      start = start ?? t
      const p = Math.min(1, (t - start) / duration)
      setN(Math.round(num * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, num, duration])
  return <span ref={ref}>{Number.isNaN(num) ? value : n}</span>
}
