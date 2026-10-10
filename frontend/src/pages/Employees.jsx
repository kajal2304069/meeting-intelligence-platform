import React, { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { Card, SectionHeader } from '../components/ui.jsx'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [name, setName] = useState('')
  const [team, setTeam] = useState('')
  const [email, setEmail] = useState('')

  const load = () => api.getEmployees().then(setEmployees)
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.addEmployee({ name, team, email })
    setName(''); setTeam(''); setEmail('')
    load()
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Roster" title="Employees" />

      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col md:flex-row gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                 className="flex-1 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <input value={team} onChange={e => setTeam(e.target.value)} placeholder="Team"
                 className="flex-1 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                 className="flex-1 bg-panelLight border border-line rounded-lg px-3 py-2.5 text-sm placeholder:text-mist outline-none focus:border-signal/50" />
          <button className="bg-signal text-ink font-medium px-5 py-2.5 rounded-lg text-sm hover:brightness-110">Add</button>
        </form>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {employees.map(e => (
          <Card key={e.id} className="p-5">
            <div className="w-10 h-10 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center text-signal font-display font-semibold mb-3">
              {e.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
            </div>
            <div className="text-paper text-sm font-medium">{e.name}</div>
            <div className="text-mist text-xs font-mono">{e.team}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
