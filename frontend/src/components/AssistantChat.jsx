import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import Robot from './Robot.jsx'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Shrinks a picked image so uploads stay small and fast (max 1280px, JPEG). */
function fileToDataUrl(file, max = 1280) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be opened.'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/** Tiny formatter: **bold**, "- " bullets, line breaks. No HTML injection. */
function RichText({ text }) {
  const inline = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="text-paper">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>)
  return (
    <div className="space-y-1">
      {String(text).split('\n').map((line, i) => {
        const m = line.match(/^\s*[-*•]\s+(.*)/)
        if (m) return <div key={i} className="flex gap-2"><span className="text-signal">•</span><span>{inline(m[1])}</span></div>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <div key={i}>{inline(line)}</div>
      })}
    </div>
  )
}

const DEFAULT_SUGGESTIONS = [
  'What happened in my latest meeting?',
  'Which tasks are overdue?',
  'What decisions did we make this week?',
  'Explain this screenshot for me',
]

/**
 * Mia — a friendly assistant that answers from the company's meetings and can
 * look at an image you attach, by text or by voice.
 * Props: meetingId (optional focus), suggestions, greeting, autoSpeak, height, className
 */
export default function AssistantChat({
  meetingId = null,
  suggestions = DEFAULT_SUGGESTIONS,
  greeting = "Hi, I'm Mia! Ask me anything about your meetings and tasks — type it, say it, or attach a picture and I'll take a look.",
  autoSpeak = false,
  height = 'h-[26rem]',
  className = '',
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(autoSpeak)
  const [lang, setLang] = useState('en-IN')
  const [notice, setNotice] = useState('')
  const [drag, setDrag] = useState(false)
  const recRef = useRef(null)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  const speakRef = useRef(speakReplies)
  speakRef.current = speakReplies

  const mood = busy ? 'thinking' : listening ? 'listening' : speaking ? 'speaking' : 'idle'

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => () => {
    try { recRef.current?.abort() } catch {}
    if (canSpeak) window.speechSynthesis.cancel()
  }, [])

  const speak = (text) => {
    if (!canSpeak) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(String(text).replace(/\*\*/g, ''))
    u.lang = lang
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }
  const stopSpeaking = () => { if (canSpeak) window.speechSynthesis.cancel(); setSpeaking(false) }

  const attach = async (file) => {
    if (!file) return
    setNotice('')
    try { setImage(await fileToDataUrl(file)) } catch (e) { setNotice(e.message) }
  }

  const send = async (text, viaVoice = false) => {
    text = (text ?? input).trim()
    if ((!text && !image) || busy) return
    const img = image
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { role: 'user', text: text || '(image)', image: img, voice: viaVoice }])
    setInput(''); setImage(null); setNotice(''); setBusy(true)
    try {
      const res = await api.assistantChat({ message: text, image: img, history, meeting_id: meetingId })
      setMessages((m) => [...m, { role: 'ai', text: res.answer, sources: res.sources }])
      if (speakRef.current) speak(res.answer)
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', error: true, text: err.message || 'Something went wrong. Please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  const toggleMic = () => {
    if (!SR) return
    if (listening) { recRef.current?.stop(); return }
    stopSpeaking(); setNotice('')
    const rec = new SR()
    rec.lang = lang; rec.interimResults = true
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t; else interim += t
      }
      setInput((finalText + interim).trim())
    }
    rec.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed') setNotice('Microphone is blocked. Allow it in your browser, or type instead.')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setNotice(`Voice input failed (${e.error}). You can type instead.`)
    }
    rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText, true) }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  const onPaste = (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); attach(f) }
  }

  return (
    <div
      className={`relative bg-panel border rounded-2xl shadow-panel overflow-hidden flex flex-col ${drag ? 'border-signal' : 'border-line'} ${className}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); attach(e.dataTransfer.files?.[0]) }}
    >
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-gradient-to-r from-signal/10 to-transparent">
        <Robot mood={mood} size={48} />
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-paper leading-tight">Mia</div>
          <div className="text-[11px] font-mono text-mist truncate">
            {mood === 'thinking' ? 'thinking…' : mood === 'listening' ? 'listening…' : mood === 'speaking' ? 'speaking…' : 'AI assistant · reads text & images'}
          </div>
        </div>
        {speaking && <button onClick={stopSpeaking} className="text-[11px] font-mono text-coral border border-coral/40 rounded-md px-2 py-1">■ stop</button>}
        {canSpeak && (
          <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-mist cursor-pointer select-none">
            <input type="checkbox" className="accent-[#2DD9C4]" checked={speakReplies}
              onChange={(e) => { setSpeakReplies(e.target.checked); if (!e.target.checked) stopSpeaking() }} />
            Voice replies
          </label>
        )}
        {SR && (
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={listening} aria-label="Voice language"
            className="bg-panelLight border border-line rounded-md px-1.5 py-1 text-[11px] text-paper outline-none">
            <option value="en-IN">EN-IN</option><option value="en-US">EN-US</option><option value="hi-IN">हिन्दी</option>
          </select>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className={`${height} overflow-y-auto px-4 py-4 space-y-3`}>
        {messages.length === 0 && (
          <div className="anim-pop">
            <div className="flex gap-3 items-start">
              <div className="bg-panelLight border border-line rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-paper/90 leading-relaxed max-w-[92%]">{greeting}</div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {suggestions.map((s, i) => (
                <button key={s} onClick={() => (s.toLowerCase().includes('screenshot') || s.toLowerCase().includes('image') ? fileRef.current?.click() : send(s))}
                  className="anim-pop text-xs px-3 py-1.5 rounded-full border border-line bg-panelLight text-paper/80 hover:border-signal/50 hover:text-signal transition-colors"
                  style={{ animationDelay: `${150 + i * 70}ms` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex anim-pop ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-signal/15 border border-signal/30 text-paper rounded-tr-sm'
              : m.error ? 'bg-coral/10 border border-coral/30 text-coral rounded-tl-sm'
              : 'bg-panelLight border border-line text-paper/90 rounded-tl-sm'}`}>
              {m.image && <img src={m.image} alt="Attached" className="rounded-lg mb-2 max-h-40 w-auto border border-line" />}
              {m.voice && <span className="text-signal mr-1" title="Asked by voice">●</span>}
              {m.role === 'ai' && !m.error ? <RichText text={m.text} /> : m.text}
              {m.sources?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-line flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono text-mist uppercase">From:</span>
                  {m.sources.map((s) => (
                    <Link key={s.meeting_id} to={`/meetings/${s.meeting_id}`} className="text-[11px] text-signal hover:underline">{s.title}</Link>
                  ))}
                </div>
              )}
              {m.role === 'ai' && !m.error && canSpeak && (
                <button onClick={() => speak(m.text)} className="block mt-1.5 text-[11px] font-mono text-mist hover:text-signal">▶ listen</button>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-panelLight border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5" aria-label="Mia is thinking">
              {[0, 1, 2].map((d) => <span key={d} className="w-2 h-2 rounded-full bg-signal animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-line p-3 space-y-2">
        {listening && <p className="text-coral text-xs font-mono animate-pulse">● Listening… speak your question</p>}
        {notice && <p className="text-coral text-xs font-mono">{notice}</p>}
        {image && (
          <div className="flex items-center gap-2 anim-pop">
            <img src={image} alt="To send" className="h-14 w-14 object-cover rounded-lg border border-line" />
            <span className="text-xs text-mist flex-1">Image ready — add a question or just send.</span>
            <button onClick={() => setImage(null)} className="text-mist hover:text-coral text-sm px-2" aria-label="Remove image">✕</button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = '' }} />
          <button type="button" onClick={() => fileRef.current?.click()} title="Attach an image" aria-label="Attach an image"
            className="shrink-0 w-10 h-10 rounded-xl border border-line bg-panelLight text-mist hover:text-signal hover:border-signal/40 transition-colors flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
          </button>
          {SR && (
            <button type="button" onClick={toggleMic} title={listening ? 'Stop' : 'Ask by voice'} aria-label={listening ? 'Stop listening' : 'Ask by voice'}
              className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${listening ? 'bg-coral/20 border-coral text-coral animate-pulse' : 'bg-coral/10 border-coral/30 text-coral hover:bg-coral/20'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
          )}
          <input value={input} onChange={(e) => setInput(e.target.value)} onPaste={onPaste}
            placeholder={image ? 'Ask something about this image…' : 'Ask Mia anything…'}
            className="flex-1 min-w-0 bg-panelLight border border-line rounded-xl px-3.5 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <button type="submit" disabled={busy || (!input.trim() && !image)}
            className="shrink-0 bg-signal text-ink font-semibold px-4 h-10 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40">
            Send
          </button>
        </form>
        {!SR && <p className="text-mist text-[11px]">Voice input works in Chrome or Edge. You can still type or attach images.</p>}
      </div>
      {drag && <div className="absolute inset-0 bg-signal/10 border-2 border-dashed border-signal rounded-2xl flex items-center justify-center text-signal font-display pointer-events-none">Drop an image for Mia to look at</div>}
    </div>
  )
}
