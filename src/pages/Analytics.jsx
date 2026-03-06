import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [incidents, setIncidents] = useState([])
  const [inspections, setInspections] = useState([])
  const [workers, setWorkers] = useState([])
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: inc }, { data: ins }, { data: wrk }, { data: cer }] = await Promise.all([
      supabase.from('incidents').select('*').eq('user_id', user.id),
      supabase.from('inspections').select('*').eq('user_id', user.id),
      supabase.from('workers').select('*').eq('user_id', user.id),
      supabase.from('certifications').select('*').eq('user_id', user.id),
    ])
    setIncidents(inc || [])
    setInspections(ins || [])
    setWorkers(wrk || [])
    setCerts(cer || [])
    setLoading(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading analytics...</div>

  // ── CALCULATIONS ──
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const closedIncidents = incidents.filter(i => i.status === 'closed').length
  const timeLoss = incidents.filter(i => i.type === 'Time-Loss Injury').length

  const totalWorkers = workers.length || 1
  const trir = totalWorkers > 0 ? ((incidents.length / (totalWorkers * 200000)) * 200000).toFixed(1) : 0
  const ltir = totalWorkers > 0 ? ((timeLoss / (totalWorkers * 200000)) * 200000).toFixed(1) : 0

  const avgScore = inspections.length > 0
    ? Math.round(inspections.reduce((sum, i) => sum + (i.score || 0), 0) / inspections.length)
    : 0
  const passedInspections = inspections.filter(i => i.status === 'passed').length

  const today = new Date()
  const expiredCerts = certs.filter(c => c.expiry_date && new Date(c.expiry_date) < today).length
  const expiringCerts = certs.filter(c => {
    if (!c.expiry_date) return false
    const days = Math.floor((new Date(c.expiry_date) - today) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 30
  }).length
  const validCerts = certs.filter(c => c.expiry_date && new Date(c.expiry_date) > today).length
  const trainingCompliance = certs.length > 0 ? Math.round((validCerts / certs.length) * 100) : 0

  // Days without LTI
  const lastLTI = incidents
    .filter(i => i.type === 'Time-Loss Injury')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const daysWithoutLTI = lastLTI
    ? Math.floor((today - new Date(lastLTI.date)) / (1000 * 60 * 60 * 24))
    : incidents.length > 0 ? 'No LTI' : '—'

  // Incidents by type
  const byType = ['Near-Miss', 'Minor Injury', 'Time-Loss Injury', 'Property Damage', 'Hazard Observation']
    .map(type => ({ type, count: incidents.filter(i => i.type === type).length }))
    .filter(t => t.count > 0)

  // Monthly trend (last 6 months)
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleString('default', { month: 'short' })
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const count = incidents.filter(inc => inc.date && inc.date.startsWith(`${year}-${month}`)).length
    months.push({ label, count })
  }
  const maxMonth = Math.max(...months.map(m => m.count), 1)

  function scoreColor(score) {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Analytics & Benchmarks</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>
          Real-time KPIs calculated from your data · WCB Nova Scotia construction avg: TRIR 3.2 · LTIR 2.1
        </p>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: '🚨', label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#ef4444' : '#10b981', delta: `${closedIncidents} closed` },
          { icon: '📉', label: 'TRIR', value: trir, color: parseFloat(trir) <= 3.2 ? '#10b981' : '#ef4444', delta: 'NS avg: 3.2' },
          { icon: '📅', label: 'Days Without LTI', value: daysWithoutLTI, color: '#10b981', delta: `${timeLoss} total LTI` },
          { icon: '🎓', label: 'Training Compliance', value: `${trainingCompliance}%`, color: trainingCompliance >= 80 ? '#10b981' : '#f59e0b', delta: `${expiringCerts} expiring` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, letterSpacing: '-1px' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* MONTHLY TREND */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Monthly Incident Trend</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Last 6 months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{m.count || ''}</div>
                <div style={{
                  width: '100%',
                  height: m.count > 0 ? `${Math.round((m.count / maxMonth) * 80)}px` : '4px',
                  background: m.count > 0 ? '#f59e0b' : '#f3f4f6',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4
                }} />
                <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VS WCB BENCHMARK */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Your Rates vs WCB NS</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Construction sector · 2023 official data</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Metric', 'Your Site', 'NS Avg', 'Status'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '4px 8px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'TRIR', yours: trir, avg: '3.2', better: parseFloat(trir) <= 3.2 },
                { metric: 'LTIR', yours: ltir, avg: '2.1', better: parseFloat(ltir) <= 2.1 },
                { metric: 'Injury Rate /100', yours: incidents.length > 0 ? (incidents.length / totalWorkers * 100).toFixed(1) : '0', avg: '2.10', better: (incidents.length / totalWorkers * 100) <= 2.1 },
                { metric: 'Training %', yours: `${trainingCompliance}%`, avg: '~70%', better: trainingCompliance >= 70 },
              ].map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontSize: 12, fontWeight: 600 }}>{row.metric}</td>
                  <td style={{ padding: '8px', fontSize: 13, fontWeight: 800, color: row.better ? '#10b981' : '#ef4444' }}>{row.yours}</td>
                  <td style={{ padding: '8px', fontSize: 12, color: '#6b7280' }}>{row.avg}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ background: row.better ? '#f0fdf4' : '#fef2f2', color: row.better ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                      {row.better ? '✓ Better' : '✗ Above avg'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* INCIDENTS BY TYPE */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Incidents by Type</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>All time</div>
          {incidents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No incidents yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byType.map((t, i) => {
                const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981']
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: colors[i % colors.length] }}>{t.count}</span>
                    </div>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(t.count / incidents.length) * 100}%`, background: colors[i % colors.length], borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* INSPECTION SCORES */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Inspection Performance</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>All inspections</div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor(avgScore), letterSpacing: '-2px' }}>{avgScore}%</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Average score</div>
          </div>
          {[
            { label: 'Total Inspections', value: inspections.length, color: '#3b82f6' },
            { label: 'Passed (≥80%)', value: passedInspections, color: '#10b981' },
            { label: 'Action Required', value: inspections.filter(i => i.status === 'action-required').length, color: '#f59e0b' },
            { label: 'Failed (<60%)', value: inspections.filter(i => i.status === 'failed').length, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* TRAINING COMPLIANCE */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Training Compliance</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Certifications status</div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: trainingCompliance >= 80 ? '#10b981' : '#f59e0b', letterSpacing: '-2px' }}>{trainingCompliance}%</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Valid certifications</div>
          </div>
          {[
            { label: 'Valid', value: validCerts, color: '#10b981' },
            { label: 'Expiring (30 days)', value: expiringCerts, color: '#f59e0b' },
            { label: 'Expired', value: expiredCerts, color: '#ef4444' },
            { label: 'Total Workers', value: workers.length, color: '#3b82f6' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}