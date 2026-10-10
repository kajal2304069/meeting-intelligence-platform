import React, { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { PriorityBadge, Card, SectionHeader } from '../components/ui.jsx'

const COLUMNS = ['Pending', 'In Progress', 'Completed', 'Overdue']
const NEXT_STATUS = { Pending: 'In Progress', 'In Progress': 'Completed', Overdue: 'In Progress', Completed: 'Pending' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [ownerFilter, setOwnerFilter] = useState('')

  const load = () => api.getTasks().then(setTasks)
  useEffect(() => { load() }, [])

  const advance = async (task) => {
    const newStatus = NEXT_STATUS[task.status]
    await api.updateTaskStatus(task.id, newStatus)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const remind = async (task) => {
    await api.remindTask(task.id)
  }

  const owners = [...new Set(tasks.map(t => t.owner))]
  const visible = ownerFilter ? tasks.filter(t => t.owner === ownerFilter) : tasks

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader eyebrow="Task Assignment & Reminders" title="Task Tracking" />
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="bg-panel border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-signal/50"
        >
          <option value="">All owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col}>
            <div className="text-mist text-xs font-mono uppercase tracking-wider mb-3 flex items-center justify-between">
              {col}
              <span className="text-paper/60">{visible.filter(t => t.status === col).length}</span>
            </div>
            <div className="space-y-3">
              {visible.filter(t => t.status === col).map(t => (
                <Card key={t.id} className="p-4">
                  <p className="text-paper text-sm mb-2">{t.task}</p>
                  <div className="flex items-center justify-between mb-3">
                    <PriorityBadge priority={t.priority} />
                    <span className="text-xs font-mono text-mist">{t.deadline}</span>
                  </div>
                  <div className="text-xs font-mono text-mist mb-3">
                    {t.owner}{t.owner_is_predicted && <span className="text-amber"> · auto-assigned</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => advance(t)} className="flex-1 text-xs font-mono bg-panelLight hover:bg-line text-paper rounded-md py-1.5 transition-colors">
                      Mark {NEXT_STATUS[t.status]}
                    </button>
                    <button onClick={() => remind(t)} className="text-xs font-mono bg-panelLight hover:bg-line text-mist rounded-md px-2.5 py-1.5 transition-colors" title="Send reminder email">
                      ✉
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
