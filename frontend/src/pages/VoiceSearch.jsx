import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { Card, SectionHeader, PulseLine } from '../components/ui.jsx'

export default function VoiceSearch() {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [heard, setHeard] = useState('')
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  const startRecording = async () => {
    setError('')
    setResults(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => chunks.current.push(e.data)
      mr.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setProcessing(true)
        const res = await api.voiceSearch(blob)
        setHeard(res.heard)
        setResults(res.results)
        setProcessing(false)
      }
      mediaRecorder.current = mr
      mr.start()
      setRecording(true)
    } catch (e) {
      setError('Microphone access was denied or is unavailable in this browser.')
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    setRecording(false)
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Voice Search" title="Ask questions using your microphone" />

      <Card className="p-10 flex flex-col items-center gap-6">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all border-2 ${
            recording ? 'bg-coral/20 border-coral text-coral animate-pulse' : 'bg-signal/10 border-signal/40 text-signal hover:bg-signal/20'
          }`}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          ●
        </button>
        <p className="text-mist text-sm font-mono">
          {recording ? 'Listening... tap to stop' : processing ? 'Transcribing your question...' : 'Tap to ask a question about any meeting'}
        </p>
        {recording && <PulseLine height={32} animate color="#FF5D7A" />}
        {error && <p className="text-coral text-xs font-mono">{error}</p>}
      </Card>

      {heard && (
        <Card className="p-5">
          <div className="text-mist text-xs font-mono uppercase tracking-wider mb-1">Heard</div>
          <p className="text-paper text-sm">"{heard}"</p>
        </Card>
      )}

      {results && (
        <div className="space-y-3">
          {results.length === 0 && <p className="text-mist text-sm">No matching meetings found.</p>}
          {results.map((r) => (
            <Link to={`/meetings/${r.meeting_id}`} key={r.meeting_id}>
              <Card className="p-5 hover:border-signal/40 transition-colors">
                <h3 className="font-display font-medium text-paper mb-1">{r.title}</h3>
                <p className="text-mist text-sm">{r.snippet}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
