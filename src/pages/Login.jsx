import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o password errati')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1f2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 40,
        width: 380,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          background: '#f59e0b',
          borderRadius: 10,
          padding: '8px 14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 24
        }}>
          <span>🦺</span>
          <b style={{ color: '#1a1f2e', fontSize: 16 }}>FieldSafe</b>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Welcome back
        </h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 28 }}>
          Sign in to your HSE dashboard
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: '#ef4444', marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 5 }}>
          Email
        </label>
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, marginBottom: 14,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 5 }}>
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
            padding: '10px 12px', fontSize: 13, marginBottom: 24,
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#fcd34d' : '#f59e0b',
            border: 'none', borderRadius: 8, padding: '12px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </div>
    </div>
  )
}