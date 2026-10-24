import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import Shell from './components/Shell.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ExecutiveDashboard from './pages/ExecutiveDashboard.jsx'
import Meetings from './pages/Meetings.jsx'
import MeetingDetail from './pages/MeetingDetail.jsx'
import Search from './pages/Search.jsx'
import VoiceSearch from './pages/VoiceSearch.jsx'
import Tasks from './pages/Tasks.jsx'
import Analytics from './pages/Analytics.jsx'
import Employees from './pages/Employees.jsx'

function FullScreenLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-mist text-sm font-mono">
      Loading…
    </div>
  )
}

function RequireAuth({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (token) return <Navigate to="/" replace />
  return children
}

function RootGate() {
  const { token, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!token) return <Landing />
  return <Shell><ExecutiveDashboard /></Shell>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route path="/" element={<ExecutiveDashboard />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/meetings/:id" element={<MeetingDetail />} />
                <Route path="/search" element={<Search />} />
                <Route path="/voice-search" element={<VoiceSearch />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
