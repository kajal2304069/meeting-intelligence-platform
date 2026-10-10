import React, { useEffect, useState } from 'react'
import { api } from '../api/client.js'

/** Lets the meeting organizer pick which employees are joining before
 * processing/recording starts, and mark each one online/offline. Used by
 * both the "paste a link" flow and the live-recording flow. */
export default function ParticipantPicker({ selected, onChange }) {
  const [employees, setEmployees] = useState([])

  useEffect(() => { api.getEmployees().then(setEmployees) }, [])

  const isPicked = (name) => selected.some((p) => p.employee_name === name)
  const attendanceOf = (name) => selected.find((p) => p.employee_name === name)?.attendance || 'online'

  const toggle = (name) => {
    if (isPicked(name)) {
      onChange(selected.filter((p) => p.employee_name !== name))
    } else {
      onChange([...selected, { employee_name: name, attendance: 'online' }])
    }
  }

  const setAttendance = (name, attendance) => {
    onChange(selected.map((p) => (p.employee_name === name ? { ...p, attendance } : p)))
  }

  if (employees.length === 0) {
    return <p className="text-mist text-xs">No employees added yet — add your team under Employees to pick attendees here.</p>
  }

  return (
    <div className="space-y-1.5">
      {employees.map((e) => (
        <div key={e.id} className="flex items-center gap-3 bg-panelLight border border-line rounded-lg px-3 py-2">
          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
            <input
              type="checkbox"
              checked={isPicked(e.name)}
              onChange={() => toggle(e.name)}
              className="accent-signal"
            />
            <span className="text-sm text-paper truncate">{e.name}</span>
            {e.team && <span className="text-mist text-[11px] font-mono shrink-0">{e.team}</span>}
          </label>
          {isPicked(e.name) && (
            <select
              value={attendanceOf(e.name)}
              onChange={(ev) => setAttendance(e.name, ev.target.value)}
              className="bg-panel border border-line rounded-md px-2 py-1 text-xs text-paper outline-none focus:border-signal/50 shrink-0"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          )}
        </div>
      ))}
    </div>
  )
}
