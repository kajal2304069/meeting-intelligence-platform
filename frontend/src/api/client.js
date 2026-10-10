const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function authHeader() {
  try {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      ...options,
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn(`[api] Falling back to demo data for ${path}:`, err.message)
    return mock(path, options)
  }
}

/** Auth calls never fall back to demo data — a login/signup failure must
 * surface as a real error so the form can show it, not silently "succeed"
 * into a fake session. */
async function authRequest(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
  return data
}

// ---- Demo/mock data so the UI is fully explorable without the backend running ----
const MOCK_MEETINGS = [
  { id: 1, title: 'Q3 Roadmap Sync', date: '2026-07-28T10:00:00', sentiment: 'Positive', sentiment_confidence: 0.82, summary: 'Team aligned on Q3 priorities; mobile revamp confirmed as top bet.', task_count: 4, review_status: 'confirmed' },
  { id: 2, title: 'Client Escalation — Acme Corp', date: '2026-07-30T15:00:00', sentiment: 'Negative', sentiment_confidence: 0.71, summary: 'Delivery delay discussed; client frustrated about missed SLA.', task_count: 3, review_status: 'pending_review' },
  { id: 3, title: 'Design Review — Onboarding Flow', date: '2026-08-01T09:30:00', sentiment: 'Neutral', sentiment_confidence: 0.6, summary: 'Walked through revised onboarding wireframes, minor feedback.', task_count: 2, review_status: 'confirmed' },
  { id: 4, title: 'Weekly Standup', date: '2026-08-03T09:00:00', sentiment: 'Positive', sentiment_confidence: 0.68, summary: 'Sprint on track, two blockers flagged for backend team.', task_count: 5, review_status: 'confirmed' },
]

const MOCK_TASKS = [
  { id: 1, meeting_id: 1, task: 'Finalize mobile revamp scope doc', owner: 'Priya Shah', owner_is_predicted: false, deadline: '2026-08-06', deadline_is_predicted: false, priority: 'high', status: 'In Progress', verified: true },
  { id: 2, meeting_id: 1, task: 'Share Q3 OKRs with leadership', owner: 'Dev Patel', owner_is_predicted: true, deadline: '2026-08-05', deadline_is_predicted: true, priority: 'medium', status: 'Pending', verified: true },
  { id: 3, meeting_id: 2, task: 'Send apology + revised timeline to Acme', owner: 'Priya Shah', owner_is_predicted: false, deadline: '2026-08-02', deadline_is_predicted: false, priority: 'high', status: 'Overdue', verified: false },
  { id: 4, meeting_id: 2, task: 'Root-cause the delivery delay', owner: 'Arjun Mehta', owner_is_predicted: true, deadline: '2026-08-04', deadline_is_predicted: true, priority: 'high', status: 'Pending', verified: false },
  { id: 5, meeting_id: 3, task: 'Update onboarding Figma with feedback', owner: 'Sana Iyer', owner_is_predicted: false, deadline: '2026-08-08', deadline_is_predicted: true, priority: 'low', status: 'Completed', verified: true },
  { id: 6, meeting_id: 4, task: 'Unblock backend deploy pipeline', owner: 'Arjun Mehta', owner_is_predicted: false, deadline: '2026-08-04', deadline_is_predicted: false, priority: 'high', status: 'In Progress', verified: true },
]

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Priya Shah', team: 'Product', email: 'priya@company.com' },
  { id: 2, name: 'Dev Patel', team: 'Strategy', email: 'dev@company.com' },
  { id: 3, name: 'Arjun Mehta', team: 'Engineering', email: 'arjun@company.com' },
  { id: 4, name: 'Sana Iyer', team: 'Design', email: 'sana@company.com' },
]

function mock(path) {
  if (/^\/meetings\/\d+/.test(path)) {
    const id = Number(path.split('/').pop())
    const m = MOCK_MEETINGS.find(m => m.id === id) || MOCK_MEETINGS[0]
    return {
      ...m,
      transcript: 'Full transcript will appear here once the backend + transcription pipeline are connected. This is placeholder demo text so you can preview the meeting detail layout.',
      key_decisions: "['Adopt revised mobile-first roadmap for Q3', 'Freeze onboarding copy by Aug 10']",
      open_questions: "['Do we need a dedicated QA sprint before launch?']",
      participants: [{ employee_name: 'Priya Shah', attendance: 'online' }, { employee_name: 'Arjun Mehta', attendance: 'offline' }],
      tasks: MOCK_TASKS.filter(t => t.meeting_id === id),
    }
  }
  if (path.startsWith('/meetings')) return MOCK_MEETINGS
  if (path.startsWith('/tasks')) return MOCK_TASKS
  if (path.startsWith('/employees')) return MOCK_EMPLOYEES
  if (path.startsWith('/search')) {
    const q = new URLSearchParams(path.split('?')[1] || '').get('q') || ''
    return MOCK_MEETINGS.filter(m => (m.title + m.summary).toLowerCase().includes(q.toLowerCase()))
      .map(m => ({ meeting_id: m.id, title: m.title, date: m.date, relevance: 3, snippet: m.summary }))
  }
  if (path.startsWith('/analytics/overview')) {
    return {
      total_meetings: MOCK_MEETINGS.length,
      total_tasks: MOCK_TASKS.length,
      completed_tasks: MOCK_TASKS.filter(t => t.status === 'Completed').length,
      missed_deadlines: MOCK_TASKS.filter(t => t.status === 'Overdue').length,
      sentiment_breakdown: { Positive: 2, Neutral: 1, Negative: 1 },
    }
  }
  if (path.startsWith('/analytics/productivity')) {
    return {
      team_score: 78,
      employees: {
        'Priya Shah': { score: 88, completed: 5, total: 6, on_time_rate: 80 },
        'Dev Patel': { score: 74, completed: 3, total: 5, on_time_rate: 66 },
        'Arjun Mehta': { score: 69, completed: 4, total: 7, on_time_rate: 60 },
        'Sana Iyer': { score: 92, completed: 6, total: 6, on_time_rate: 100 },
      },
    }
  }
  if (path.startsWith('/analytics/meeting-trends')) {
    return [
      { week: '2026-W28', count: 5 }, { week: '2026-W29', count: 7 },
      { week: '2026-W30', count: 4 }, { week: '2026-W31', count: 9 },
      { week: '2026-W32', count: 6 },
    ]
  }
  if (path.startsWith('/chat')) {
    return { answer: "(demo) Connect the backend to chat with this meeting's real transcript." }
  }
  return {}
}

export const authApi = {
  signup: (payload) => authRequest('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => authRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => authRequest('/auth/me'),
}

export const api = {
  getMeetings: () => request('/meetings'),
  getMeeting: (id) => request(`/meetings/${id}`),
  processMeeting: (source, language, participants = []) =>
    request('/meetings/process', { method: 'POST', body: JSON.stringify({ source, language, participants }) }),
  uploadRecording: (blob, language, participants = []) => {
    const form = new FormData()
    form.append('file', blob, 'recording.webm')
    form.append('language', language)
    form.append('participants', JSON.stringify(participants))
    return fetch(`${BASE}/meetings/upload-recording`, { method: 'POST', headers: authHeader(), body: form })
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`Upload failed (${res.status})`)))
  },
  updateMeetingTitle: (id, title) => request(`/meetings/${id}/title`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  confirmMeeting: (id, title) => request(`/meetings/${id}/confirm`, { method: 'POST', body: JSON.stringify({ title }) }),
  chatWithMeeting: (id, question) => request(`/chat/${id}`, { method: 'POST', body: JSON.stringify({ question }) }),

  getTasks: (params = {}) => request(`/tasks?${new URLSearchParams(params)}`),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  editTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  verifyTask: (id) => request(`/tasks/${id}/verify`, { method: 'POST' }),
  remindTask: (id) => request(`/tasks/${id}/remind`, { method: 'POST' }),

  search: (q) => request(`/search?${new URLSearchParams({ q })}`),
  voiceSearch: async (blob) => {
    try {
      const form = new FormData()
      form.append('file', blob, 'query.webm')
      const res = await fetch(`${BASE}/voice-search`, { method: 'POST', headers: authHeader(), body: form })
      if (!res.ok) throw new Error('voice search failed')
      return await res.json()
    } catch (err) {
      console.warn('[api] voice search demo fallback:', err.message)
      return { heard: '(demo) show me action items from the client escalation call', results: mock('/search?q=escalation') }
    }
  },

  getOverview: () => request('/analytics/overview'),
  getProductivity: () => request('/analytics/productivity'),
  getMeetingTrends: () => request('/analytics/meeting-trends'),
  getEmployees: () => request('/employees'),
  addEmployee: (payload) => request('/employees', { method: 'POST', body: JSON.stringify(payload) }),
}
