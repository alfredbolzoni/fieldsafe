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
    if (error) setError('Incorrect email or password')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1d1d1f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '44px 40px',
        width: 400,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            background: '#f5a623', borderRadius: 10, padding: '7px 13px',
            marginBottom: 20
          }}>
            <span style={{ fontSize: 16 }}></span>
            <b style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>FieldSafe</b>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Sign in to your HSE dashboard
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.25)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13,
            color: '#ff6b63', marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '11px 14px', fontSize: 13, color: '#fff',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#f5a623'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '11px 14px', fontSize: 13, color: '#fff',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = '#f5a623'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', background: loading ? '#c4851a' : '#f5a623',
            border: 'none', borderRadius: 10, padding: '12px',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            color: '#1d1d1f', fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(245,166,35,0.3)'
          }}
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </div>
    </div>
  )
}