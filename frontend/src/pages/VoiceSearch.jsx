import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { Card, PulseLine } from '../components/ui.jsx'
import { PageBanner, EmptyState } from '../components/illustrations.jsx'
import AssistantChat from '../components/AssistantChat.jsx'
import Robot from '../components/Robot.jsx'

const TIPS = [
  ['“What did we decide about pricing?”', 'Ask about decisions'],
  ['“Which tasks are due this week?”', 'Check deadlines'],
  ['“Who owns the launch checklist?”', 'Find owners'],
  ['Attach a photo of a whiteboard', 'Mia reads images too'],
]

function ClassicVoiceSearch() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [heard, setHeard] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  const startRecording = async () => {
    setError(''); setResults(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        stream.getTracks().forEach((t) => t.stop())
        setProcessing(true)
        const res = await api.voiceSearch(blob)
        setHeard(res.heard); setResults(res.results); setProcessing(false)
      }
      mediaRecorder.current = mr
      mr.start(); setRecording(true)
    } catch {
      setError('Microphone access was denied or is unavailable in this browser.')
    }
  }
  const stopRecording = () => { mediaRecorder.current?.stop(); setRecording(false) }

  return (
    <div className="space-y-5">
      <Card className="p-8 sm:p-10 flex flex-col items-center gap-5 text-center">
        <div className="relative">
          {recording && <span className="absolute inset-0 rounded-full bg-coral/30 animate-ping" aria-hidden="true" />}
          <button onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop recording' : 'Start recording'}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all border-2 ${recording ? 'bg-coral/20 border-coral text-coral' : 'bg-signal/10 border-signal/40 text-signal hover:bg-signal/20 hover:scale-105'}`}>●</button>
        </div>
        <p className="text-mist text-sm font-mono">{recording ? 'Listening… tap to stop' : processing ? 'Transcribing your question…' : 'Tap, speak, and we’ll find the matching meetings'}</p>
        {recording && <div className="w-full max-w-xs"><PulseLine height={32} animate color="#FF5D7A" /></div>}
        {error && <p className="text-coral text-xs font-mono">{error}</p>}
      </Card>
      {heard && <Card className="p-5"><div className="text-mist text-xs font-mono uppercase tracking-wider mb-1">Heard</div><p className="text-paper text-sm">“{heard}”</p></Card>}
      {results && (
        <div className="space-y-3">
          {results.length === 0 && <Card><EmptyState illo="voice" title="No matching meetings" text="Try asking in different words." /></Card>}
          {results.map((r, i) => (
            <Link to={`/meetings/${r.meeting_id}`} key={r.meeting_id} className="block anim-pop" style={{ animationDelay: `${i * 70}ms` }}>
              <Card className="card-hover p-5"><h3 className="font-display font-medium text-paper mb-1">{r.title}</h3><p className="text-mist text-sm">{r.snippet}</p></Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VoiceSearch() {
  const [tab, setTab] = useState('mia')
  return (
    <div className="space-y-6">
      <PageBanner eyebrow="Voice" illo="voice" accent="coral"
        title="Just talk — Mia is listening"
        sub="Ask about any meeting out loud and Mia answers (and can read it back). Prefer a classic search by voice? Switch tabs." />

      <div role="tablist" className="inline-flex p-1 rounded-xl bg-panel border border-line">
        {[['mia', 'Talk to Mia'], ['classic', 'Voice search']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-panelLight text-signal shadow' : 'text-mist hover:text-paper'}`}>{l}</button>
        ))}
      </div>

      {tab === 'mia' ? (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 min-w-0">
            <AssistantChat autoSpeak height="h-[24rem] sm:h-[30rem]"
              greeting="Hi! Tap the red mic and ask me about your meetings — I'll answer out loud. You can also attach a picture, like a whiteboard or slide."
              suggestions={['What happened in my latest meeting?', 'Which tasks are overdue?', 'Who has the most open tasks?', 'Explain this image for me']} />
          </div>
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-signal/10 to-panel">
              <Robot size={72} mood="idle" className="anim-floaty shrink-0" />
              <div><div className="font-display font-semibold text-paper">Meet Mia</div><p className="text-mist text-sm leading-relaxed">Your meeting assistant. She reads transcripts, tasks and images, and answers in plain words.</p></div>
            </Card>
            <Card className="p-5">
              <div className="text-mist text-xs font-mono uppercase tracking-wider mb-3">Things to try</div>
              <ul className="space-y-3">
                {TIPS.map(([t, d], i) => (
                  <li key={t} className="anim-pop" style={{ animationDelay: `${i * 90}ms` }}>
                    <div className="text-paper text-sm">{t}</div><div className="text-mist text-xs">{d}</div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : <ClassicVoiceSearch />}
    </div>
  )
}
