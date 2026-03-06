import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#1a1f2e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#f59e0b', fontSize: 18, fontWeight: 700, fontFamily: 'system-ui'
    }}>
      🦺 Loading FieldSafe...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={session ? <Dashboard /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App