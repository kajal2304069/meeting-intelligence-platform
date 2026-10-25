import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { PageBanner, EmptyState } from '../components/illustrations.jsx'
import { StatCard, SentimentBadge, ProductivityDial, PulseLine, Card, SectionHeader } from '../components/ui.jsx'

export default function ExecutiveDashboard() {
  const [overview, setOverview] = useState(null)
  const [productivity, setProductivity] = useState(null)
  const [trends, setTrends] = useState([])
  const [meetings, setMeetings] = useState([])
  const { user, isManager } = useAuth()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    api.getOverview().then(setOverview)
    api.getProductivity().then(setProductivity)
    api.getMeetingTrends().then(setTrends)
    api.getMeetings().then((m) => setMeetings(m.slice(0, 4)))
  }, [])

  return (
    <div className="space-y-8">
      <PageBanner eyebrow={isManager ? 'For Managers' : 'Your workspace'} illo="dashboard"
        title={`${greet}, ${(user?.name || 'there').split(' ')[0]} 👋`}
        sub={isManager ? 'Every meeting, decision and follow-through — in one control room. Here is how your team is doing.' : 'Your meetings, tasks and answers in one place. Ask Mia if you missed anything.'}
        actions={<>
          <Link to="/meetings" className="bg-signal text-ink font-semibold px-4 py-2.5 rounded-xl text-sm hover:brightness-110 transition-all">● Record a meeting</Link>
          <Link to="/voice-search" className="border border-line bg-panel px-4 py-2.5 rounded-xl text-sm text-paper hover:border-signal/50 transition-colors">Ask Mia</Link>
          <Link to="/tasks" className="border border-line bg-panel px-4 py-2.5 rounded-xl text-sm text-paper hover:border-signal/50 transition-colors">My tasks</Link>
        </>} />

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <ProductivityDial score={productivity?.team_score ?? 0} size={140} label="Team score" />
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-mist text-xs font-mono uppercase tracking-wider">Meeting activity, last 5 weeks</span>
              <span className="text-signal text-xs font-mono">{trends.reduce((a, t) => a + t.count, 0)} meetings</span>
            </div>
            <PulseLine peaks={trends.map(t => t.count)} height={64} animate />
            <div className="flex justify-between mt-1">
              {trends.map(t => <span key={t.week} className="text-mist text-[10px] font-mono">{t.week.split('-W')[1]}</span>)}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Meetings" value={overview?.total_meetings ?? '—'} accent="signal" />
        <StatCard label="Team Productivity" value={productivity?.team_score ? `${productivity.team_score}%` : '—'} accent="signal" />
        <StatCard label="Missed Deadlines" value={overview?.missed_deadlines ?? '—'} accent="coral" />
        <StatCard label="Tasks Completed" value={overview ? `${overview.completed_tasks}/${overview.total_tasks}` : '—'} accent="amber" />
      </div>

      <div>
        <SectionHeader eyebrow="AI Insights" title="Recent meetings" action={<Link to="/meetings" className="text-signal text-sm font-mono hover:underline">View all →</Link>} />
        <div className="grid md:grid-cols-2 gap-4">
          {meetings.length === 0 && <div className="md:col-span-2"><Card><EmptyState illo="meetings" title="No meetings yet" text="Record or upload your first meeting and the summary and tasks will appear here." action={<Link to="/meetings" className="bg-signal text-ink font-semibold px-4 py-2 rounded-lg text-sm">Add a meeting</Link>} /></Card></div>}
          {meetings.map(m => (
            <Link to={`/meetings/${m.id}`} key={m.id} className="block">
              <Card className="card-hover p-5 h-full">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-medium text-paper">{m.title}</h3>
                  <SentimentBadge sentiment={m.sentiment} confidence={m.sentiment_confidence} />
                </div>
                <p className="text-mist text-sm mb-3 line-clamp-2">{m.summary}</p>
                <div className="flex items-center justify-between text-xs font-mono text-mist">
                  <span>{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>{m.task_count} tasks</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
