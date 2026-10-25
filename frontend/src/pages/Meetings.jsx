import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { PageBanner, EmptyState } from '../components/illustrations.jsx'
import { SentimentBadge, ReviewStatusBadge, Card, SectionHeader } from '../components/ui.jsx'
import ParticipantPicker from '../components/ParticipantPicker.jsx'
import RecordMeeting from '../components/RecordMeeting.jsx'

export default function Meetings() {
  const [meetings, setMeetings] = useState([])
  const [mode, setMode] = useState('link') // "link" (paste a recording URL) or "record" (live in-browser)
  const [source, setSource] = useState('')
  const [language, setLanguage] = useState('english')
  const [participants, setParticipants] = useState([])
  const [status, setStatus] = useState(null)

  const load = () => api.getMeetings().then(setMeetings)
  useEffect(() => { load() }, [])

  const submitLink = async (e) => {
    e.preventDefault()
    if (!source.trim()) return
    setStatus('Submitting to pipeline (Zoom/Teams/Meet recording → Whisper/Sarvam → summary → tasks)...')
    const res = await api.processMeeting(source, language, participants)
    setStatus(res.message || 'Processing started.')
    setSource('')
    setTimeout(load, 1500)
  }

  const onRecordingUploaded = (res) => {
    setStatus(res.message || 'Recording uploaded and is being processed.')
    setTimeout(load, 1500)
  }

  return (
    <div className="space-y-8">
      <PageBanner eyebrow="Recordings" illo="meetings" title="Meetings" sub="Record a call live, paste a link, or upload a file — Meeting AI writes the summary and finds the tasks." />

      <Card className="p-4 sm:p-5 space-y-5">
        <div className="flex gap-2 bg-panelLight rounded-lg p-1 w-fit">
          <button type="button" onClick={() => setMode('link')}
            className={`text-xs font-mono px-4 py-1.5 rounded-md transition-colors ${mode === 'link' ? 'bg-signal text-ink' : 'text-mist'}`}>
            Paste a link
          </button>
          <button type="button" onClick={() => setMode('record')}
            className={`text-xs font-mono px-4 py-1.5 rounded-md transition-colors ${mode === 'record' ? 'bg-signal text-ink' : 'text-mist'}`}>
            Record live
          </button>
        </div>

        <div>
          <div className="text-mist text-xs font-mono uppercase tracking-wide mb-2">Who's joining?</div>
          <ParticipantPicker selected={participants} onChange={setParticipants} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-mist text-xs font-mono uppercase tracking-wide shrink-0">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-panelLight border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal/50"
          >
            <option value="english">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>

        {mode === 'link' ? (
          <form onSubmit={submitLink} className="flex flex-col lg:flex-row gap-3">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste a Zoom/Teams/Meet recording link, YouTube URL, or local file path"
              className="flex-1 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50"
            />
            <button type="submit" className="bg-signal text-ink font-medium px-5 py-2.5 rounded-lg text-sm hover:brightness-110 transition-all">
              Process meeting
            </button>
          </form>
        ) : (
          <RecordMeeting language={language} participants={participants} onUploaded={onRecordingUploaded} />
        )}

        {status && <div className="text-mist text-xs font-mono">{status}</div>}
      </Card>

      <div className="space-y-3">
        {meetings.map((m, i) => (
          <Link to={`/meetings/${m.id}`} key={m.id} className="block anim-pop" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
            <Card className="card-hover p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                  <h3 className="font-display font-medium text-paper truncate">{m.title}</h3>
                  <SentimentBadge sentiment={m.sentiment} confidence={m.sentiment_confidence} />
                  <ReviewStatusBadge status={m.review_status} />
                </div>
                <p className="text-mist text-sm truncate">{m.summary}</p>
              </div>
              <div className="sm:text-right shrink-0 flex sm:block gap-3">
                <div className="text-xs font-mono text-mist">{new Date(m.date).toLocaleDateString()}</div>
                <div className="text-xs font-mono text-signal">{m.task_count} tasks</div>
              </div>
            </Card>
          </Link>
        ))}
        {meetings.length === 0 && <Card><EmptyState illo="meetings" title="No meetings yet" text="Process your first recording above and it will show up here." /></Card>}
      </div>
    </div>
  )
}
