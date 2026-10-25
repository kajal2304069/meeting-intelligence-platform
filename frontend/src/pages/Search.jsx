import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { Card } from '../components/ui.jsx'
import { PageBanner, EmptyState } from '../components/illustrations.jsx'
import AssistantChat from '../components/AssistantChat.jsx'

const EXAMPLES = ['mobile revamp', 'client escalation', 'deadline', 'budget']

function Highlight({ text, query }) {
  const terms = (query || '').split(/\s+/).filter((t) => t.length > 2).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length || !text) return <>{text}</>
  const re = new RegExp(`(${terms.join('|')})`, 'gi')
  return <>{String(text).split(re).map((p, i) => (re.test(p) && (re.lastIndex = 0, true) ? <mark key={i} className="bg-signal/20 text-signal rounded px-0.5">{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>))}</>
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState('')

  const runSearch = async (query) => {
    if (!query.trim()) return
    setLoading(true); setSearched(query)
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
    <div className="space-y-6">
      <PageBanner eyebrow="AI Meeting Search" illo="search" accent="signal"
        title="Find anything that was ever said"
        sub="Search every transcript by keyword — or just chat with Mia, your AI assistant, on the right. She can even read screenshots." />

      <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-5 gap-6 items-start">
        <div className="xl:col-span-3 space-y-5 min-w-0">
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist">⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Try: "what did we decide about the mobile revamp"'
                className="w-full bg-panel border border-line rounded-xl pl-10 pr-4 py-3.5 text-sm placeholder:text-mist outline-none focus:border-signal/50 focus:shadow-[0_0_0_4px_rgba(45,217,196,0.08)] transition-all" />
            </div>
            <button className="bg-signal text-ink font-semibold px-7 py-3.5 rounded-xl text-sm hover:brightness-110 transition-all">Search</button>
          </form>

          {!results && !loading && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-mist font-mono">Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => { setQ(ex); setParams({ q: ex }); runSearch(ex) }}
                  className="px-3 py-1.5 rounded-full border border-line bg-panel text-paper/80 hover:border-signal/50 hover:text-signal transition-colors">{ex}</button>
              ))}
            </div>
          )}

          {loading && (
            <div className="space-y-3" aria-label="Searching">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl border border-line" />)}
            </div>
          )}

          {results && !loading && (
            <div className="space-y-3">
              <div className="text-mist text-xs font-mono">{results.length} result{results.length === 1 ? '' : 's'} for “{searched}”</div>
              {results.length === 0 && <Card><EmptyState illo="search" title="No matches" text="Try different words — or ask Mia in your own words." /></Card>}
              {results.map((r, i) => (
                <Link to={`/meetings/${r.meeting_id}`} key={r.meeting_id} className="block anim-pop" style={{ animationDelay: `${i * 70}ms` }}>
                  <Card className="card-hover p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="font-display font-medium text-paper">{r.title}</h3>
                      <span className="text-xs font-mono text-mist">{r.date && new Date(r.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-mist text-sm leading-relaxed"><Highlight text={r.snippet} query={searched} /></p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 xl:sticky xl:top-24 min-w-0">
          <AssistantChat height="h-[22rem] sm:h-[26rem]" />
        </div>
      </div>
    </div>
  )
}
