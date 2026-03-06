import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// WCB Nova Scotia Construction Sector Benchmarks 2023
const WCB_BENCHMARKS = {
  TRIR: 3.2,
  LTIR: 1.8,
  severity_rate: 28.4,
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('12')

  useEffect(() => { fetchStats() }, [period])

  async function fetchStats() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - parseInt(period))

    const [{ data: inc }, { data: ins }, { data: wrk }, { data: cer }, { data: haz }, { data: act }] = await Promise.all([
      supabase.from('incidents').select('*').eq('user_id', user.id),
      supabase.from('inspections').select('*').eq('user_id', user.id),
      supabase.from('workers').select('*').eq('user_id', user.id),
      supabase.from('certifications').select('*').eq('user_id', user.id),
      supabase.from('hazards').select('*').eq('user_id', user.id),
      supabase.from('corrective_actions').select('*').eq('user_id', user.id),
    ])

    const incidents = inc || []
    const inspections = ins || []
    const workers = wrk || []
    const certs = cer || []
    const hazards = haz || []
    const actions = act || []

    // TRIR = (Number of recordable incidents × 200,000) / Total hours worked
    // Assuming 2000 hours/worker/year
    const totalHours = workers.length * 2000 * (parseInt(period) / 12)
    const recordable = incidents.filter(i => ['Time-Loss Injury', 'Minor Injury'].includes(i.type))
    const timeLoss = incidents.filter(i => i.type === 'Time-Loss Injury')
    const TRIR = totalHours > 0 ? ((recordable.length * 200000) / totalHours).toFixed(2) : 0
    const LTIR = totalHours > 0 ? ((timeLoss.length * 200000) / totalHours).toFixed(2) : 0

    // Incident by type
    const byType = {}
    incidents.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1 })
    const incidentsByType = Object.entries(byType).map(([type, count]) => ({ type, count }))

    // Incident by severity
    const bySeverity = {}
    incidents.forEach(i => { bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1 })

    // Monthly incidents (last 6 months)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })
      const monthInc = incidents.filter(inc => {
        const incDate = new Date(inc.date)
        return incDate.getMonth() === d.getMonth() && incDate.getFullYear() === d.getFullYear()
      })
      monthlyData.push({
        month,
        incidents: monthInc.length,
        nearMiss: monthInc.filter(i => i.type === 'Near-Miss').length,
        injuries: monthInc.filter(i => i.type.includes('Injury')).length,
      })
    }

    // Inspection scores
    const avgScore = inspections.length > 0
      ? Math.round(inspections.reduce((s, i) => s + (i.score || 0), 0) / inspections.length) : 0

    // Corrective action completion rate
    const closedActions = actions.filter(a => a.status === 'closed').length
    const caRate = actions.length > 0 ? Math.round((closedActions / actions.length) * 100) : 0

    // Cert compliance
    const today = new Date()
    const expiredCerts = certs.filter(c => c.expiry_date && new Date(c.expiry_date) < today).length
    const certCompliance = certs.length > 0 ? Math.round(((certs.length - expiredCerts) / certs.length) * 100) : 100

    // Hazard by risk level
    const hazardsByRisk = ['Critical', 'High', 'Medium', 'Low'].map(level => ({
      level, count: hazards.filter(h => h.risk_level === level && h.status === 'active').length
    }))

    setStats({
      TRIR, LTIR, totalHours: Math.round(totalHours),
      recordable: recordable.length, timeLoss: timeLoss.length,
      workers: workers.length, incidents: incidents.length,
      incidentsByType, bySeverity, monthlyData,
      avgScore, caRate, certCompliance,
      hazardsByRisk, activeHazards: hazards.filter(h => h.status === 'active').length,
      inspections: inspections.length,
    })
    setLoading(false)
  }

  function ScoreCard({ label, value, benchmark, unit = '', higherIsBetter = false, description }) {
    const numVal = parseFloat(value)
    const numBench = parseFloat(benchmark)
    const good = higherIsBetter ? numVal >= numBench : numVal <= numBench
    const color = isNaN(numVal) || numVal === 0 ? 'var(--text-3)' : good ? 'var(--green)' : 'var(--red)'
    return (
      <div className="kpi-card" style={{ borderLeft: `3px solid ${color}` }}>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={{ color, fontSize: 28 }}>{value}{unit}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{description}</div>
        {benchmark && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>WCB NS benchmark: {benchmark}{unit}</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading analytics...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Benchmarks</h1>
          <p className="page-sub">TRIR · LTIR · WCB Nova Scotia Construction Sector benchmarks</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {[{ id: '3', label: '3 months' }, { id: '6', label: '6 months' }, { id: '12', label: '12 months' }].map(p => (
              <button key={p.id} className={`tab-btn ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* WCB BENCHMARK ALERT */}
      {stats && (parseFloat(stats.TRIR) > WCB_BENCHMARKS.TRIR || parseFloat(stats.LTIR) > WCB_BENCHMARKS.LTIR) && (
        <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>⚠ Above WCB Nova Scotia Benchmark</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Your incident rates exceed the NS construction sector average. Review corrective actions and hazard controls.</div>
        </div>
      )}

      {/* RATE CARDS */}
      <div style={{ marginBottom: 6 }}>
        <div className="section-divider"><span className="section-divider-label">Incident Rates</span><div className="section-divider-line" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {stats && <>
          <ScoreCard label="TRIR" value={stats.TRIR} benchmark={WCB_BENCHMARKS.TRIR} description="Total Recordable Incident Rate" />
          <ScoreCard label="LTIR" value={stats.LTIR} benchmark={WCB_BENCHMARKS.LTIR} description="Lost Time Incident Rate" />
          <ScoreCard label="Inspection Score" value={`${stats.avgScore}`} benchmark="80" unit="%" higherIsBetter description="Avg site inspection score" />
          <ScoreCard label="CA Completion" value={`${stats.caRate}`} benchmark="90" unit="%" higherIsBetter description="Corrective actions closed" />
        </>}
      </div>

      {/* COMPLIANCE CARDS */}
      <div style={{ marginBottom: 6 }}>
        <div className="section-divider"><span className="section-divider-label">Compliance Overview</span><div className="section-divider-line" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {stats && <>
          <ScoreCard label="Cert Compliance" value={`${stats.certCompliance}`} benchmark="100" unit="%" higherIsBetter description="Workers with valid certs" />
          <ScoreCard label="Active Hazards" value={stats.activeHazards} description="Open in hazard register" />
          <ScoreCard label="Total Hours" value={stats.totalHours.toLocaleString()} description={`Est. based on ${stats.workers} workers`} />
          <ScoreCard label="Inspections Done" value={stats.inspections} description={`In last ${period} months`} />
        </>}
      </div>

      {/* CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Monthly Incidents */}
        <div className="card">
          <div className="card-title">Monthly Incidents — Last 6 Months</div>
          <div className="card-sub">Near-misses vs injuries by month</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.monthlyData || []} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6 }} />
              <Bar dataKey="nearMiss" name="Near-Miss" fill="#b7791f" radius={[3,3,0,0]} />
              <Bar dataKey="injuries" name="Injuries" fill="#c53030" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hazards by Risk */}
        <div className="card">
          <div className="card-title">Active Hazards by Risk Level</div>
          <div className="card-sub">Current hazard register distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.hazardsByRisk || []} barSize={28} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} allowDecimals={false} />
              <YAxis dataKey="level" type="category" tick={{ fontSize: 10, fill: 'var(--text-3)' }} width={55} />
              <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6 }} />
              <Bar dataKey="count" name="Hazards" radius={[0,3,3,0]}
                fill="#1a6faf"
                label={{ position: 'right', fontSize: 10, fill: 'var(--text-3)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TRIR vs BENCHMARK */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">TRIR vs WCB NS Benchmark — {period}-Month View</div>
        <div className="card-sub">Total Recordable Incident Rate compared to Nova Scotia construction sector average of {WCB_BENCHMARKS.TRIR}</div>
        <div style={{ marginTop: 16 }}>
          {[
            { label: 'Your TRIR', value: parseFloat(stats?.TRIR || 0), max: Math.max(parseFloat(stats?.TRIR || 0), WCB_BENCHMARKS.TRIR) * 1.5, color: parseFloat(stats?.TRIR || 0) <= WCB_BENCHMARKS.TRIR ? 'var(--green)' : 'var(--red)' },
            { label: 'WCB NS Benchmark', value: WCB_BENCHMARKS.TRIR, max: Math.max(parseFloat(stats?.TRIR || 0), WCB_BENCHMARKS.TRIR) * 1.5, color: 'var(--primary)' },
            { label: 'Your LTIR', value: parseFloat(stats?.LTIR || 0), max: Math.max(parseFloat(stats?.LTIR || 0), WCB_BENCHMARKS.LTIR) * 1.5, color: parseFloat(stats?.LTIR || 0) <= WCB_BENCHMARKS.LTIR ? 'var(--green)' : 'var(--red)' },
            { label: 'WCB NS LTIR Benchmark', value: WCB_BENCHMARKS.LTIR, max: Math.max(parseFloat(stats?.LTIR || 0), WCB_BENCHMARKS.LTIR) * 1.5, color: 'var(--primary)' },
          ].map((item, i) => (
            <div key={i} className="progress-row">
              <div className="progress-label">{item.label}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: item.max > 0 ? `${Math.min((item.value / item.max) * 100, 100)}%` : '0%', background: item.color }} />
              </div>
              <div className="progress-val">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INCIDENT BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Incidents by Type</div>
          <div className="card-sub">All time</div>
          {stats?.incidentsByType?.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '16px 0' }}>No incidents recorded</div>
          ) : stats?.incidentsByType?.map((item, i) => (
            <div key={i} className="progress-row">
              <div className="progress-label">{item.type}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(item.count / (stats?.incidents || 1)) * 100}%`, background: 'var(--primary)' }} />
              </div>
              <div className="progress-val">{item.count}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Severity Distribution</div>
          <div className="card-sub">All time</div>
          {Object.keys(stats?.bySeverity || {}).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '16px 0' }}>No incidents recorded</div>
          ) : ['Critical', 'High', 'Medium', 'Low'].map((sev, i) => {
            const count = stats?.bySeverity?.[sev] || 0
            const colors = { Critical: 'var(--red)', High: 'var(--orange)', Medium: 'var(--amber)', Low: 'var(--green)' }
            return (
              <div key={i} className="progress-row">
                <div className="progress-label">{sev}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(count / (stats?.incidents || 1)) * 100}%`, background: colors[sev] }} />
                </div>
                <div className="progress-val">{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}