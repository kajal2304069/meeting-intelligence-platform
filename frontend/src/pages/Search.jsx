import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { Card, SectionHeader } from '../components/ui.jsx'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const runSearch = async (query) => {
    if (!query.trim()) return
    setLoading(true)
    const res = await api.search(query)
    setResults(res)
    setLoading(false)
  }

  useEffect(() => { if (params.get('q')) runSearch(params.get('q')) }, [])

  const submit = (e) => {
    e.preventDefault()
    setParams({ q })
    runSearch(q)
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="AI Meeting Search" title="Search across all transcripts" />
      <form onSubmit={submit} className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Try: "what did we decide about the mobile revamp"'
          className="flex-1 bg-panel border border-line rounded-lg px-4 py-3 text-sm placeholder:text-mist outline-none focus:border-signal/50"
        />
        <button className="bg-signal text-ink font-medium px-6 rounded-lg text-sm hover:brightness-110">Search</button>
      </form>

      {loading && <p className="text-mist text-sm font-mono">Searching every transcript...</p>}

      {results && (
        <div className="space-y-3">
          {results.length === 0 && <p className="text-mist text-sm">No matches. Try different words.</p>}
          {results.map((r) => (
            <Link to={`/meetings/${r.meeting_id}`} key={r.meeting_id}>
              <Card className="p-5 hover:border-signal/40 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-medium text-paper">{r.title}</h3>
                  <span className="text-xs font-mono text-mist">{r.date && new Date(r.date).toLocaleDateString()}</span>
                </div>
                <p className="text-mist text-sm">{r.snippet}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
