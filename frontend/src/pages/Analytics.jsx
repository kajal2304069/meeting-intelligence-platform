import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { api } from '../api/client.js'
import { Card, SectionHeader, ProductivityDial } from '../components/ui.jsx'

const SENTIMENT_COLORS = { Positive: '#2DD9C4', Neutral: '#7E93A3', Negative: '#FF5D7A' }

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [productivity, setProductivity] = useState(null)
  const [trends, setTrends] = useState([])

  useEffect(() => {
    api.getOverview().then(setOverview)
    api.getProductivity().then(setProductivity)
    api.getMeetingTrends().then(setTrends)
  }, [])

  const sentimentData = overview ? Object.entries(overview.sentiment_breakdown).map(([name, value]) => ({ name, value })) : []
  const employeeData = productivity ? Object.entries(productivity.employees).map(([name, v]) => ({ name, score: v.score })) : []

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Insights" title="Analytics" />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-mist text-xs font-mono uppercase tracking-wider mb-4">Meeting volume over time</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends}>
              <CartesianGrid stroke="#233443" strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fill: '#7E93A3', fontSize: 11 }} tickFormatter={(w) => w.split('-W')[1]} />
              <YAxis tick={{ fill: '#7E93A3', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#131E29', border: '1px solid #233443', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2DD9C4" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="text-mist text-xs font-mono uppercase tracking-wider mb-4">Meeting sentiment breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {sentimentData.map((d) => <Cell key={d.name} fill={SENTIMENT_COLORS[d.name] || '#7E93A3'} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#131E29', border: '1px solid #233443', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {sentimentData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs font-mono text-mist">
                <span className="w-2 h-2 rounded-full" style={{ background: SENTIMENT_COLORS[d.name] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="text-mist text-xs font-mono uppercase tracking-wider mb-4">Productivity score by employee</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={employeeData}>
            <CartesianGrid stroke="#233443" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fill: '#7E93A3', fontSize: 11 }} />
            <YAxis tick={{ fill: '#7E93A3', fontSize: 11 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#131E29', border: '1px solid #233443', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="score" fill="#2DD9C4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {productivity && (
        <div>
          <div className="text-mist text-xs font-mono uppercase tracking-wider mb-4">Employee scorecards</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(productivity.employees).map(([name, v]) => (
              <Card key={name} className="p-5 flex flex-col items-center gap-2">
                <ProductivityDial score={v.score ?? 0} size={90} />
                <span className="text-paper text-sm font-medium">{name}</span>
                <span className="text-mist text-xs font-mono">{v.completed}/{v.total} done · {v.on_time_rate}% on time</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
