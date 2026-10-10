import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { StatCard, SentimentBadge, ProductivityDial, PulseLine, Card, SectionHeader } from '../components/ui.jsx'

export default function ExecutiveDashboard() {
  const [overview, setOverview] = useState(null)
  const [productivity, setProductivity] = useState(null)
  const [trends, setTrends] = useState([])
  const [meetings, setMeetings] = useState([])

  useEffect(() => {
    api.getOverview().then(setOverview)
    api.getProductivity().then(setProductivity)
    api.getMeetingTrends().then(setTrends)
    api.getMeetings().then((m) => setMeetings(m.slice(0, 4)))
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <div className="text-signal text-xs font-mono uppercase tracking-widest mb-1">For Managers</div>
        <h1 className="font-display text-3xl font-semibold text-paper">Executive Dashboard</h1>
        <p className="text-mist mt-1 text-sm">Every meeting, decision, and follow-through — in one control room.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
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
          {meetings.map(m => (
            <Link to={`/meetings/${m.id}`} key={m.id} className="block">
              <Card className="p-5 hover:border-signal/40 transition-colors h-full">
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
