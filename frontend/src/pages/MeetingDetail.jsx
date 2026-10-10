import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { SentimentBadge, PriorityBadge, StatusPill, ReviewStatusBadge, Card, SectionHeader } from '../components/ui.jsx'

function AttendanceBadge({ attendance }) {
  const styles = {
    online: 'bg-signal/10 text-signal border-signal/30',
    offline: 'bg-mist/10 text-mist border-mist/30',
    absent: 'bg-coral/10 text-coral border-coral/30',
  }
  return <span className={`px-2 py-0.5 rounded-md border text-[11px] font-mono ${styles[attendance] || styles.offline}`}>{attendance}</span>
}

function EditableTitle({ meeting, isManager, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(meeting.title || '')
  const [saving, setSaving] = useState(false)

  if (!isManager) {
    return <h1 className="font-display text-2xl font-semibold text-paper">{meeting.title || 'Untitled meeting'}</h1>
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group">
        <h1 className="font-display text-2xl font-semibold text-paper">{meeting.title || 'Untitled meeting'}</h1>
        <button
          onClick={() => { setDraft(meeting.title || ''); setEditing(true) }}
          className="text-mist text-xs font-mono opacity-0 group-hover:opacity-100 hover:text-signal transition-opacity"
        >
          edit
        </button>
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.updateMeetingTitle(meeting.id, draft)
      onSaved(res.title ?? draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="font-display text-xl font-semibold text-paper bg-panelLight border border-signal/40 rounded-lg px-3 py-1.5 outline-none min-w-[20rem]"
      />
      <button onClick={save} disabled={saving} className="text-signal text-xs font-mono px-2 py-1 hover:underline disabled:opacity-50">
        {saving ? 'saving…' : 'save'}
      </button>
      <button onClick={() => setEditing(false)} className="text-mist text-xs font-mono px-2 py-1 hover:underline">cancel</button>
    </div>
  )
}

function TaskRow({ task, isManager, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ owner: task.owner || '', deadline: task.deadline || '', priority: task.priority || 'medium' })
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.editTask(task.id, draft)
      onChanged({ ...task, ...draft, owner_is_predicted: false, deadline_is_predicted: false })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    try {
      await api.verifyTask(task.id)
      onChanged({ ...task, verified: true })
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-paper text-sm">{task.task}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draft.owner}
            onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
            placeholder="Owner"
            className="bg-panelLight border border-line rounded-lg px-2.5 py-1.5 text-xs text-paper outline-none focus:border-signal/50 w-36"
          />
          <input
            type="date"
            value={draft.deadline}
            onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
            className="bg-panelLight border border-line rounded-lg px-2.5 py-1.5 text-xs text-paper outline-none focus:border-signal/50"
          />
          <select
            value={draft.priority}
            onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
            className="bg-panelLight border border-line rounded-lg px-2.5 py-1.5 text-xs text-paper outline-none focus:border-signal/50"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <button onClick={save} disabled={busy} className="text-signal text-xs font-mono px-2 py-1 hover:underline disabled:opacity-50">
            {busy ? 'saving…' : 'save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-mist text-xs font-mono px-2 py-1 hover:underline">cancel</button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-paper text-sm truncate">{task.task}</p>
        <div className="flex items-center gap-2 mt-1 text-xs font-mono text-mist">
          <span>{task.owner}{task.owner_is_predicted && <span className="text-amber"> (auto)</span>}</span>
          <span>·</span>
          <span>{task.deadline}{task.deadline_is_predicted && <span className="text-amber"> (predicted)</span>}</span>
          {task.verified && <span className="text-signal">· verified ✓</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={task.priority} />
        <StatusPill status={task.status} />
        {isManager && (
          <>
            <button onClick={() => setEditing(true)} className="text-mist text-xs font-mono px-2 py-1 hover:text-signal hover:underline">
              edit
            </button>
            {!task.verified && (
              <button onClick={verify} disabled={busy} className="text-signal text-xs font-mono px-2 py-1 border border-signal/30 rounded-md hover:bg-signal/10 disabled:opacity-50">
                {busy ? '…' : 'verify'}
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

function MeetingChat({ meetingId, hasTranscript }) {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'ai', text }
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = React.useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || asking) return
    setError('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setQuestion('')
    setAsking(true)
    try {
      const res = await api.chatWithMeeting(meetingId, q)
      setMessages((m) => [...m, { role: 'ai', text: res.answer }])
    } catch (err) {
      setError(err.message || 'Failed to get an answer')
      setMessages((m) => m.slice(0, -1)) // drop the unanswered question
      setQuestion(q)
    } finally {
      setAsking(false)
    }
  }

  return (
    <Card className="p-6">
      <SectionHeader eyebrow="RAG Chat" title="Ask about this meeting" />
      {!hasTranscript ? (
        <p className="text-mist text-sm">A transcript hasn't been processed for this meeting yet — chat will be available once it has.</p>
      ) : (
        <>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 && (
              <p className="text-mist text-sm">Ask things like "what did we decide about the launch date?" or "who owns the follow-up on pricing?"</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-signal/15 text-paper border border-signal/30'
                      : 'bg-panelLight text-paper/90 border border-line'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="bg-panelLight text-mist border border-line rounded-xl px-3.5 py-2 text-sm font-mono">thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {error && <p className="text-coral text-xs font-mono mb-2">{error}</p>}
          <form onSubmit={ask} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about this meeting..."
              className="flex-1 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="bg-signal text-ink font-medium px-4 py-2.5 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-40"
            >
              Ask
            </button>
          </form>
        </>
      )}
    </Card>
  )
}

export default function MeetingDetail() {
  const { id } = useParams()
  const { isManager } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => { api.getMeeting(id).then(setMeeting) }, [id])

  if (!meeting) return <p className="text-mist">Loading meeting...</p>

  const allVerified = meeting.tasks.length > 0 && meeting.tasks.every((t) => t.verified)
  const confirmed = meeting.review_status === 'confirmed'

  const updateTask = (updated) => {
    setMeeting((m) => ({ ...m, tasks: m.tasks.map((t) => (t.id === updated.id ? updated : t)) }))
  }

  const confirmMeeting = async () => {
    setConfirmError(''); setConfirming(true)
    try {
      const res = await api.confirmMeeting(meeting.id, meeting.title)
      setMeeting((m) => ({ ...m, review_status: res.review_status || 'confirmed', title: res.title ?? m.title }))
    } catch (err) {
      setConfirmError(err.message || 'Failed to confirm meeting')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <EditableTitle meeting={meeting} isManager={isManager} onSaved={(title) => setMeeting((m) => ({ ...m, title }))} />
          <SentimentBadge sentiment={meeting.sentiment} confidence={meeting.sentiment_confidence} />
          <ReviewStatusBadge status={meeting.review_status} />
        </div>
        <p className="text-mist text-sm font-mono">{new Date(meeting.date).toLocaleString()}</p>
      </div>

      {isManager && !confirmed && (
        <Card className="p-5 flex items-center justify-between gap-4 border-signal/20">
          <div>
            <p className="text-paper text-sm font-medium">Manager review</p>
            <p className="text-mist text-xs mt-0.5">
              {meeting.tasks.length === 0
                ? 'No action items to verify — you can confirm this meeting directly.'
                : allVerified
                ? 'All tasks verified. Confirming will email you a confirmation with the final title.'
                : `Verify each task's owner and deadline below before confirming (${meeting.tasks.filter(t => t.verified).length}/${meeting.tasks.length} verified).`}
            </p>
            {confirmError && <p className="text-coral text-xs font-mono mt-1">{confirmError}</p>}
          </div>
          <button
            onClick={confirmMeeting}
            disabled={confirming || (meeting.tasks.length > 0 && !allVerified)}
            className="shrink-0 bg-signal text-ink font-medium px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirming ? 'Confirming…' : 'Confirm meeting'}
          </button>
        </Card>
      )}

      {meeting.participants?.length > 0 && (
        <Card className="p-6">
          <SectionHeader eyebrow="Attendance" title="Participants" />
          <div className="flex flex-wrap gap-2">
            {meeting.participants.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-2 bg-panelLight border border-line rounded-full pl-3 pr-1.5 py-1">
                <span className="text-paper text-xs">{p.employee_name}</span>
                <AttendanceBadge attendance={p.attendance} />
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <SectionHeader eyebrow="AI Summary" title="What happened" />
        <p className="text-paper/90 leading-relaxed text-sm">{meeting.summary}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SectionHeader eyebrow="Outcomes" title="Key decisions" />
          <p className="text-paper/80 text-sm whitespace-pre-wrap">{meeting.key_decisions}</p>
        </Card>
        <Card className="p-6">
          <SectionHeader eyebrow="Follow-ups" title="Open questions" />
          <p className="text-paper/80 text-sm whitespace-pre-wrap">{meeting.open_questions}</p>
        </Card>
      </div>

      <div>
        <SectionHeader eyebrow="Action Item Extraction" title="Tasks from this meeting" />
        <div className="space-y-2">
          {meeting.tasks.map((t) => (
            <TaskRow key={t.id} task={t} isManager={isManager} onChanged={updateTask} />
          ))}
          {meeting.tasks.length === 0 && <p className="text-mist text-sm">No action items detected.</p>}
        </div>
      </div>

      <MeetingChat meetingId={meeting.id} hasTranscript={!!meeting.transcript} />

      <Card className="p-6">
        <SectionHeader eyebrow="Raw Transcript" title="Full transcript" />
        <p className="text-mist text-xs leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">{meeting.transcript}</p>
      </Card>
    </div>
  )
}
