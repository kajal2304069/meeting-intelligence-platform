import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader } from './ui.jsx'

const SUGGESTIONS = [
  'What were the main decisions?',
  'Who is responsible for what?',
  'What are the deadlines?',
  'What is still unresolved?',
]

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * RAG chat for one meeting. The user can type OR speak a question; the
 * answer comes from the meeting's own transcript (backend /api/chat/:id)
 * and can be read aloud. Voice uses the browser's built-in Web Speech API,
 * so nothing extra is installed or paid for.
 */
export default function MeetingChat({ meetingId, hasTranscript }) {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'ai', text, voice? }
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en-IN')
  const [speakReplies, setSpeakReplies] = useState(false)
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const recRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, asking])

  useEffect(() => () => {
    try { recRef.current?.abort() } catch {}
    if (canSpeak) window.speechSynthesis.cancel()
  }, [])

  const speak = (text, idx) => {
    if (!canSpeak) return
    window.speechSynthesis.cancel()
    if (speakingIdx === idx) { setSpeakingIdx(null); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.onend = () => setSpeakingIdx(null)
    u.onerror = () => setSpeakingIdx(null)
    setSpeakingIdx(idx)
    window.speechSynthesis.speak(u)
  }

  const send = async (q, viaVoice = false) => {
    q = (q || '').trim()
    if (!q || asking) return
    setError('')
    setMessages((m) => [...m, { role: 'user', text: q, voice: viaVoice }])
    setQuestion('')
    setAsking(true)
    try {
      const res = await api.chatWithMeeting(meetingId, q)
      const answer = res.answer || "I couldn't find that in this meeting."
      setMessages((m) => {
        const next = [...m, { role: 'ai', text: answer }]
        if (speakReplies) setTimeout(() => speak(answer, next.length - 1), 0)
        return next
      })
    } catch (err) {
      setError(err.message || 'Failed to get an answer')
      setMessages((m) => m.slice(0, -1))
      setQuestion(q)
    } finally {
      setAsking(false)
    }
  }

  const toggleMic = () => {
    if (!SpeechRecognition) return
    if (listening) { recRef.current?.stop(); return }
    setError('')
    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      setQuestion((finalText + interim).trim())
    }
    rec.onerror = (e) => {
      setListening(false)
      if (e.error === 'not-allowed') setError('Microphone permission was blocked. Allow it in your browser and try again.')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError(`Voice input failed (${e.error}). You can type instead.`)
    }
    rec.onend = () => {
      setListening(false)
      if (finalText.trim()) send(finalText, true) // auto-ask once the person stops talking
    }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader eyebrow="AI Assistant · RAG" title="Ask about this meeting" />
      {!hasTranscript ? (
        <p className="text-mist text-sm">A transcript hasn't been processed for this meeting yet — the assistant will be available once it has.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
            <span className="text-mist font-mono">Answers come only from this meeting's transcript.</span>
            <span className="flex-1" />
            {SpeechRecognition && (
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                disabled={listening}
                aria-label="Voice language"
                className="bg-panelLight border border-line rounded-md px-2 py-1 text-paper outline-none"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="hi-IN">हिन्दी</option>
              </select>
            )}
            {canSpeak && (
              <label className="flex items-center gap-1.5 text-mist cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={speakReplies}
                  onChange={(e) => { setSpeakReplies(e.target.checked); if (!e.target.checked) window.speechSynthesis.cancel() }}
                  className="accent-[#2DD9C4]"
                />
                Read answers aloud
              </label>
            )}
          </div>

          <div ref={scrollRef} className="space-y-3 h-72 sm:h-80 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 && (
              <div>
                <p className="text-mist text-sm mb-3">
                  Not sure what was discussed? Ask in your own words — type it or tap the mic and say it.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-line bg-panelLight text-paper/80 hover:border-signal/50 hover:text-signal transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-signal/15 text-paper border border-signal/30'
                      : 'bg-panelLight text-paper/90 border border-line'
                  }`}
                >
                  {msg.voice && <span className="text-signal mr-1" title="Asked by voice">●</span>}
                  {msg.text}
                  {msg.role === 'ai' && canSpeak && (
                    <button
                      onClick={() => speak(msg.text, i)}
                      className="block mt-1.5 text-[11px] font-mono text-mist hover:text-signal"
                    >
                      {speakingIdx === i ? '■ stop' : '▶ listen'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-panelLight text-mist border border-line rounded-xl px-3.5 py-2 text-sm font-mono">searching the transcript…</div>
              </div>
            )}
          </div>

          {error && <p className="text-coral text-xs font-mono mb-2">{error}</p>}
          {listening && <p className="text-coral text-xs font-mono mb-2 animate-pulse">● Listening… speak your question</p>}
          <form onSubmit={(e) => { e.preventDefault(); send(question) }} className="flex gap-2">
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Stop listening' : 'Ask by voice'}
                title={listening ? 'Stop' : 'Ask by voice'}
                className={`shrink-0 w-11 rounded-lg border flex items-center justify-center transition-colors ${
                  listening ? 'bg-coral/20 border-coral text-coral animate-pulse' : 'bg-coral/10 border-coral/30 text-coral hover:bg-coral/20'
                }`}
              >
                ●
              </button>
            )}
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this meeting..."
              className="flex-1 min-w-0 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="bg-signal text-ink font-medium px-4 py-2.5 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-40"
            >
              Ask
            </button>
          </form>
          {!SpeechRecognition && (
            <p className="text-mist text-[11px] mt-2">Voice input isn't supported in this browser — use Chrome or Edge, or type your question.</p>
          )}
        </>
      )}
    </Card>
  )
}
