import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Incidents from './Incidents'
import Training from './Training'
import Inspections from './Inspections'
import Analytics from './Analytics'

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'incidents', icon: '🚨', label: 'Incidents' },
    { id: 'inspections', icon: '✅', label: 'Inspections' },
    { id: 'training', icon: '🎓', label: 'Training' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ width: 220, background: '#1a1f2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ background: '#f59e0b', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>🦺</span>
            <b style={{ color: '#1a1f2e', fontSize: 14 }}>FieldSafe</b>
          </div>
        </div>

        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.id}
              onClick={() => setPage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                marginBottom: 2, fontSize: 13, fontWeight: 500,
                background: page === item.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: page === item.id ? '#f59e0b' : 'rgba(255,255,255,0.5)',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: 220, flex: 1, background: '#f5f6fa' }}>
        {page === 'dashboard' && (
          <div style={{ padding: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Good morning 👋</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 32 }}>FieldSafe HSE Dashboard</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              {[
                { icon: '🚨', label: 'Open Incidents', value: '0', color: '#ef4444' },
                { icon: '✅', label: 'Inspections Today', value: '0/0', color: '#f59e0b' },
                { icon: '📅', label: 'Days Without LTI', value: '0', color: '#10b981' },
                { icon: '🎓', label: 'Training Compliance', value: '—', color: '#3b82f6' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{kpi.icon}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {page === 'incidents' && <Incidents />}
        {page === 'inspections' && <Inspections />}
        {page === 'training' && <Training />}
        {page === 'analytics' && <Analytics />}
      </div>
    </div>
  )
}