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

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading analytics...</div></div></div>

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
    <div className="page-wrap">

      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Benchmarks</h1>
          <p className="page-sub">Real-time KPIs · WCB Nova Scotia construction avg: TRIR 3.2 · LTIR 2.1</p>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? 'var(--red)' : 'var(--green)', delta: `${closedIncidents} closed` },
          { label: 'TRIR', value: trir, color: parseFloat(trir) <= 3.2 ? 'var(--green)' : 'var(--red)', delta: 'NS avg: 3.2' },
          { label: 'Days Without LTI', value: daysWithoutLTI, color: 'var(--green)', delta: `${timeLoss} total LTI` },
          { label: 'Training Compliance', value: `${trainingCompliance}%`, color: trainingCompliance >= 80 ? 'var(--green)' : 'var(--amber)', delta: `${expiringCerts} expiring` },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* MONTHLY TREND */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Monthly Incident Trend</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>Last 6 months</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>{m.count || ''}</div>
                <div style={{
                  width: '100%',
                  height: m.count > 0 ? `${Math.round((m.count / maxMonth) * 80)}px` : '4px',
                  background: m.count > 0 ? 'var(--primary)' : 'var(--border)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4
                }} />
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* VS WCB BENCHMARK */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Your Rates vs WCB NS</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>Construction sector · 2023 official data</div>
          <table className="fs-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Your Site</th>
                <th>NS Avg</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'TRIR', yours: trir, avg: '3.2', better: parseFloat(trir) <= 3.2 },
                { metric: 'LTIR', yours: ltir, avg: '2.1', better: parseFloat(ltir) <= 2.1 },
                { metric: 'Injury Rate /100', yours: incidents.length > 0 ? (incidents.length / totalWorkers * 100).toFixed(1) : '0', avg: '2.10', better: (incidents.length / totalWorkers * 100) <= 2.1 },
                { metric: 'Training %', yours: `${trainingCompliance}%`, avg: '~70%', better: trainingCompliance >= 70 },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.metric}</td>
                  <td style={{ fontWeight: 800, color: row.better ? 'var(--green)' : 'var(--red)' }}>{row.yours}</td>
                  <td style={{ color: 'var(--text-2)' }}>{row.avg}</td>
                  <td>
                    <span className={`pill ${row.better ? 'pill-green' : 'pill-red'}`}>
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
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Incidents by Type</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>All time</div>
          {incidents.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 20 }}>No incidents yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byType.map((t, i) => {
                const colors = ['var(--blue)', 'var(--primary)', 'var(--red)', 'var(--purple)', 'var(--green)']
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: colors[i % colors.length] }}>{t.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(t.count / incidents.length) * 100}%`, background: colors[i % colors.length], borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* INSPECTION SCORES */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Inspection Performance</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>All inspections</div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor(avgScore), letterSpacing: '-2px' }}>{avgScore}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Average score</div>
          </div>
          {[
            { label: 'Total Inspections', value: inspections.length, color: 'var(--blue)' },
            { label: 'Passed (≥80%)', value: passedInspections, color: 'var(--green)' },
            { label: 'Action Required', value: inspections.filter(i => i.status === 'action-required').length, color: 'var(--amber)' },
            { label: 'Failed (<60%)', value: inspections.filter(i => i.status === 'failed').length, color: 'var(--red)' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* TRAINING COMPLIANCE */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Training Compliance</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>Certifications status</div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: trainingCompliance >= 80 ? 'var(--green)' : 'var(--amber)', letterSpacing: '-2px' }}>{trainingCompliance}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Valid certifications</div>
          </div>
          {[
            { label: 'Valid', value: validCerts, color: 'var(--green)' },
            { label: 'Expiring (30 days)', value: expiringCerts, color: 'var(--amber)' },
            { label: 'Expired', value: expiredCerts, color: 'var(--red)' },
            { label: 'Total Workers', value: workers.length, color: 'var(--blue)' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}