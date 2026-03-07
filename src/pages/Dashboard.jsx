import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Incidents from './Incidents'
import Training from './Training'
import Inspections from './Inspections'
import Analytics from './Analytics'
import Hazards from './Hazards'
import JOHSC from './JOHSC'
import WorkRefusal from './WorkRefusal'
import Harassment from './Harassment'
import WHMIS from './WHMIS'
import EmergencyPlans from './EmergencyPlans'
import SafeWorkProcedures from './SafeWorkProcedures'
import DOLOrders from './DOLOrders'
import ResourcesAI from './ResourcesAI'
import AIFloatingChat from '../AIFloatingChat'

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'HS'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1L14 4V8C14 11.3 11.3 14.2 8 15C4.7 14.2 2 11.3 2 8V4L8 1Z" fill="#1a1200" fillOpacity="0.9"/>
              <path d="M6 8L7.5 9.5L10.5 6.5" stroke="#1a1200" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="logo-text">
            <b>FieldSafe</b>
            <span>Nova Scotia · HSE</span>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {[
            { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg> }] },
            { section: 'Operations', items: [
              { id: 'incidents', label: 'Incidents', icon: <svg viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="10.5" r="0.75" fill="currentColor"/></svg> },
              { id: 'inspections', label: 'Inspections', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M2 3.5h11M2 7.5h11M2 11.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="12" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M13.4 12.9l1.1 1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
              { id: 'hazards', label: 'Hazard Register', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 13H1L7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7.5 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="11" r="0.75" fill="currentColor"/></svg> },
              { id: 'workrefusal', label: 'Work Refusals', icon: <svg viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5l5 5M10 5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              { id: 'johsc', label: 'JOHSC', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M2 4h11M2 8h11M2 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              { id: 'harassment', label: 'Harassment', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 13H1L7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7.5 5.5V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7.5" cy="10.5" r="0.75" fill="currentColor"/></svg> },
              { id: 'whmis', label: 'WHMIS / SDS', icon: <svg viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              { id: 'emergency', label: 'Emergency Plans', icon: <svg viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              { id: 'swp', label: 'Safe Work Procedures', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M2 3.5h11M2 7.5h8M2 11.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
              { id: 'dolorders', label: 'DOL Orders', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M2 2h11v11H2V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5 5h5M5 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            ]},
            { section: 'People', items: [
              { id: 'training', label: 'Training', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
            ]},
            { section: 'Insights', items: [
              { id: 'analytics', label: 'Analytics', icon: <svg viewBox="0 0 15 15" fill="none"><path d="M1.5 13.5L5.5 8.5L8.5 11L12.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="5" r="1.2" fill="currentColor"/></svg> },
            ]},
            { section: 'Resources', items: [
              { id: 'resources', label: 'NS OHS Resources & AI', icon: <svg viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="10.5" r="0.75" fill="currentColor"/></svg> },
            ]},
          ].map(group => (
            <div key={group.section} className="nav-section">
              <div className="nav-section-label">{group.section}</div>
              {group.items.map(item => (
                <div key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">{initials}</div>
            <div>
              <div className="user-name">HSE Manager</div>
              <div className="user-role">{userEmail}</div>
            </div>
            <div className="online-dot" />
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <div className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-root">FieldSafe</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{page.charAt(0).toUpperCase() + page.slice(1)}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{new Date().toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}</span>
            <button className="btn btn-primary" onClick={() => setPage('incidents')}>+ Log Incident</button>
          </div>
        </div>

        {page === 'dashboard' && <DashboardHome setPage={setPage} />}
        {page === 'incidents' && <Incidents />}
        {page === 'inspections' && <Inspections />}
        {page === 'training' && <Training />}
        {page === 'analytics' && <Analytics />}
        {page === 'hazards' && <Hazards />}
        {page === 'johsc' && <JOHSC />}
        {page === 'workrefusal' && <WorkRefusal />}
        {page === 'harassment' && <Harassment />}
        {page === 'whmis' && <WHMIS />}
        {page === 'emergency' && <EmergencyPlans />}
        {page === 'swp' && <SafeWorkProcedures />}
        {page === 'dolorders' && <DOLOrders />}
        {page === 'resources' && <ResourcesAI />}
      </main>

      <AIFloatingChat page={page} setPage={setPage} />
    </div>
  )
}

function DashboardHome({ setPage }) {
  const [data, setData] = useState({
    openIncidents: 0, totalIncidents: 0,
    avgScore: 0, totalInspections: 0,
    daysLTI: '∞',
    openHazards: 0,
    overdueActions: 0,
    activeRefusals: 0,
    criticalHazards: 0,
    unassignedIncidents: 0,
    overdueHazardReview: 0,
    expiringCerts: 0,
    expiredCerts: 0,
    timeLossIncidents: 0,
    incidentsByMonth: [],
    hazardsByRisk: [],
    recentIncidents: [],
  })
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => { fetchAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date()

    const [{ data: inc }, { data: ins }, { data: haz }, { data: act }, { data: ref }, { data: cer }] = await Promise.all([
      supabase.from('incidents').select('*').eq('user_id', user.id),
      supabase.from('inspections').select('*').eq('user_id', user.id),
      supabase.from('hazards').select('*').eq('user_id', user.id),
      supabase.from('corrective_actions').select('*').eq('user_id', user.id),
      supabase.from('work_refusals').select('*').eq('user_id', user.id),
      supabase.from('certifications').select('*').eq('user_id', user.id),
    ])
    const incidents = inc || [], inspections = ins || [], hazards = haz || []
    const actions = act || [], refusals = ref || [], certs = cer || []

    // KPIs
    const openIncidents   = incidents.filter(i => i.status !== 'closed').length
    const avgScore        = inspections.length > 0 ? Math.round(inspections.reduce((s, i) => s + (i.score || 0), 0) / inspections.length) : 0
    const openHazards     = hazards.filter(h => h.status === 'open' || h.status === 'active').length
    const overdueActions  = actions.filter(a => a.status !== 'closed' && a.due_date && new Date(a.due_date) < today).length
    const activeRefusals  = refusals.filter(r => r.status === 'open').length

    const lastLTI = incidents
      .filter(i => i.severity === 'critical' || i.type === 'Time-Loss Injury')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    const daysLTI = lastLTI ? Math.floor((today - new Date(lastLTI.date)) / 86400000) : '∞'

    // Alert signals
    const criticalHazards      = hazards.filter(h => (h.status === 'active' || h.status === 'open') && (h.risk_level === 'Critical' || h.risk_level === 'High')).length
    const unassignedIncidents  = incidents.filter(i => i.status !== 'closed' && !i.assignee).length
    const overdueHazardReview  = hazards.filter(h => h.status === 'active' && h.review_date && new Date(h.review_date) < today).length
    const expiringCerts        = certs.filter(c => { if (!c.expiry_date) return false; const d = Math.floor((new Date(c.expiry_date) - today) / 86400000); return d >= 0 && d <= 30 }).length
    const expiredCerts         = certs.filter(c => c.expiry_date && new Date(c.expiry_date) < today).length
    const timeLossIncidents    = incidents.filter(i => i.type === 'Time-Loss Injury').length

    // Incident trend — last 6 months
    const incidentsByMonth = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const label = d.toLocaleDateString('en-CA', { month: 'short' })
      const count = incidents.filter(inc => {
        const id = new Date(inc.date)
        return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth()
      }).length
      incidentsByMonth.push({ label, count })
    }

    // Hazards by risk level
    const riskOrder = ['Critical', 'High', 'Medium', 'Low']
    const hazardsByRisk = riskOrder
      .map(level => ({ level, count: hazards.filter(h => h.risk_level === level).length }))
      .filter(r => r.count > 0)

    // Recent incidents (last 5)
    const recentIncidents = [...incidents].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

    setData({
      openIncidents, totalIncidents: incidents.length,
      avgScore, totalInspections: inspections.length,
      daysLTI, openHazards, overdueActions, activeRefusals,
      criticalHazards, unassignedIncidents, overdueHazardReview,
      expiringCerts, expiredCerts, timeLossIncidents,
      incidentsByMonth, hazardsByRisk, recentIncidents,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="page-wrap">
      <div style={{ height: 84, background: 'var(--surface)', borderRadius: 12, marginBottom: 28, opacity: 0.5 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 24 }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ height: 108, background: 'var(--surface)', borderRadius: 12, opacity: 0.5 }} />)}
      </div>
    </div>
  )

  const statusColor = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)', neutral: 'var(--text-3)' }

  const kpis = [
    { label: 'Open Incidents',        value: data.openIncidents,   unit: '', sub: `${data.totalIncidents} total logged`,           status: data.openIncidents > 0 ? 'red' : 'green',                                                          page: 'incidents'   },
    { label: 'Avg Inspection Score',  value: data.avgScore,        unit: '%', sub: `${data.totalInspections} inspections done`,    status: data.avgScore >= 80 ? 'green' : data.avgScore >= 60 ? 'amber' : data.avgScore === 0 ? 'neutral' : 'red', page: 'inspections' },
    { label: 'Days Without LTI',      value: data.daysLTI,         unit: '', sub: 'Lost time injury free',                        status: 'green',                                                                                            page: null          },
    { label: 'Open Hazards',          value: data.openHazards,     unit: '', sub: `${data.criticalHazards} critical/high priority`, status: data.openHazards > 0 ? (data.criticalHazards > 0 ? 'red' : 'amber') : 'green',                     page: 'hazards'     },
    { label: 'Overdue Actions',       value: data.overdueActions,  unit: '', sub: 'Corrective actions past due',                  status: data.overdueActions > 0 ? 'red' : 'green',                                                         page: 'incidents'   },
    { label: 'Work Refusals',         value: data.activeRefusals,  unit: '', sub: 'Active NS OHS §43 refusals',                   status: data.activeRefusals > 0 ? 'amber' : 'green',                                                        page: 'workrefusal' },
  ]

  const alerts = [
    data.timeLossIncidents > 0   && { level: 'red',    title: `🚨 NS OHS Notification Required`,                                                      body: `${data.timeLossIncidents} Time-Loss Injury recorded — notify NS Dept. of Labour within 24h`,           page: 'incidents'   },
    data.criticalHazards > 0     && { level: 'red',    title: `⚠ ${data.criticalHazards} Critical/High Hazard${data.criticalHazards > 1 ? 's' : ''} Active`, body: 'Critical risk requires immediate control measures — NS OHS §13',                                page: 'hazards'     },
    data.unassignedIncidents > 0 && { level: 'red',    title: `${data.unassignedIncidents} Open Incident${data.unassignedIncidents > 1 ? 's' : ''} Without Assignee`, body: 'Assign a responsible person to each open incident',                                page: 'incidents'   },
    data.overdueActions > 0      && { level: 'amber',  title: `${data.overdueActions} Overdue Corrective Action${data.overdueActions > 1 ? 's' : ''}`, body: 'Open corrective actions past due date — review and update status',                                   page: 'incidents'   },
    data.expiredCerts > 0        && { level: 'amber',  title: `${data.expiredCerts} Expired Certification${data.expiredCerts > 1 ? 's' : ''}`,         body: 'Workers with expired certs must not perform regulated tasks',                                         page: 'training'    },
    data.overdueHazardReview > 0 && { level: 'amber',  title: `${data.overdueHazardReview} Hazard Review${data.overdueHazardReview > 1 ? 's' : ''} Overdue`, body: 'Regular hazard review required under NS OHS Act §9',                                         page: 'hazards'     },
    data.expiringCerts > 0       && { level: 'yellow', title: `${data.expiringCerts} Certification${data.expiringCerts > 1 ? 's' : ''} Expiring Within 30 Days`, body: 'Schedule renewal to avoid compliance gaps',                                              page: 'training'    },
  ].filter(Boolean)

  if (alerts.length === 0) {
    alerts.push({ level: 'green', title: '✓ All systems compliant', body: 'No overdue actions, hazards under control, certifications current', page: null })
  }

  const severityBadge = sev => {
    const map   = { 'critical': 'pill-red', 'major': 'pill-orange', 'minor': 'pill-amber', 'near-miss': 'pill-blue', 'near miss': 'pill-blue' }
    const label = { 'critical': 'Critical', 'major': 'Major',       'minor': 'Minor',      'near-miss': 'Near Miss', 'near miss': 'Near Miss' }
    const k = (sev || '').toLowerCase()
    return <span className={`pill ${map[k] || 'pill-gray'}`}>{label[k] || sev || '—'}</span>
  }

  const statusBadge = status => {
    const map = { 'open': ['pill-red', 'Open'], 'in-progress': ['pill-amber', 'In Progress'], 'closed': ['pill-green', 'Closed'] }
    const [cls, label] = map[status] || ['pill-gray', status || '—']
    return <span className={`pill ${cls}`}>{label}</span>
  }

  // Bar chart
  const maxBar = Math.max(...data.incidentsByMonth.map(m => m.count), 1)

  // Donut chart (stroke-dasharray)
  const R_DONUT = 54
  const CIRC = 2 * Math.PI * R_DONUT
  const riskColors = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#10b981' }
  const totalRisk = data.hazardsByRisk.reduce((s, r) => s + r.count, 0)
  let donutOffset = 0
  const donutSegs = data.hazardsByRisk.map(r => {
    const dash = (r.count / totalRisk) * CIRC
    const seg = { ...r, dash, offset: donutOffset }
    donutOffset += dash
    return seg
  })

  return (
    <div className="page-wrap dashboard-v2">

      {/* 1. HEADER */}
      <div className="dv2-header">
        <div>
          <div className="dv2-date">{dateStr} · {timeStr}</div>
          <h1 className="dv2-title">Site Overview</h1>
          <p className="dv2-sub">FieldSafe HSE Platform · Nova Scotia · NS OHS Act Compliant</p>
        </div>
        <div className="dv2-header-actions">
          <button className="btn btn-secondary" onClick={() => setPage('inspections')}>Start Inspection</button>
          <button className="btn btn-primary" onClick={() => setPage('incidents')}>+ Log Incident</button>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="dv2-kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="dv2-kpi-card" onClick={() => k.page && setPage(k.page)}
            style={{ cursor: k.page ? 'pointer' : 'default', borderTop: `3px solid ${statusColor[k.status]}` }}>
            <div className="dv2-kpi-top">
              <span className="dv2-kpi-label">{k.label}</span>
              {k.page && <span className="dv2-kpi-link">View →</span>}
            </div>
            <div className="dv2-kpi-value" style={{ color: statusColor[k.status] }}>{k.value}{k.unit}</div>
            <div className="dv2-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 3. ALERTS */}
      <div className="dv2-section">
        <div className="dv2-section-hd">
          <span className="dv2-section-label">Action Required</span>
          <div className="dv2-section-line" />
          {alerts.filter(a => a.level !== 'green').length > 0 && (
            <span className="dv2-badge-red">{alerts.filter(a => a.level !== 'green').length} item{alerts.filter(a => a.level !== 'green').length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="dv2-alerts">
          {alerts.map((a, i) => (
            <div key={i} className={`dv2-alert dv2-alert-${a.level}`}
              onClick={() => a.page && setPage(a.page)} style={{ cursor: a.page ? 'pointer' : 'default' }}>
              <div style={{ flex: 1 }}>
                <div className="dv2-alert-title">{a.title}</div>
                <div className="dv2-alert-body">{a.body}</div>
              </div>
              {a.page && <span className="dv2-alert-link">View →</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 4. CHARTS */}
      <div className="dv2-charts-row">

        {/* Bar: Incident Trend */}
        <div className="dv2-chart-card">
          <div className="dv2-chart-hd">
            <span className="dv2-chart-title">Incident Trend</span>
            <span className="dv2-chart-sub">Last 6 months</span>
          </div>
          <div className="dv2-bar-chart">
            {data.incidentsByMonth.map((m, i) => (
              <div key={i} className="dv2-bar-col">
                {m.count > 0 && <div className="dv2-bar-count">{m.count}</div>}
                <div className="dv2-bar-track">
                  <div className="dv2-bar-fill" style={{
                    height: `${(m.count / maxBar) * 100}%`,
                    background: m.count === 0 ? 'var(--border)' : m.count >= 3 ? 'var(--red)' : 'var(--primary)',
                  }} />
                </div>
                <div className="dv2-bar-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: Risk Distribution */}
        <div className="dv2-chart-card">
          <div className="dv2-chart-hd">
            <span className="dv2-chart-title">Risk Distribution</span>
            <span className="dv2-chart-sub">Hazards by level</span>
          </div>
          {totalRisk === 0 ? (
            <div className="dv2-chart-empty">No hazards recorded</div>
          ) : (
            <div className="dv2-donut-wrap">
              <svg width="148" height="148" viewBox="0 0 148 148" style={{ flexShrink: 0 }}>
                <circle cx="74" cy="74" r={R_DONUT} fill="none" stroke="var(--border)" strokeWidth="22" />
                {donutSegs.map((seg, i) => (
                  <circle key={i} cx="74" cy="74" r={R_DONUT} fill="none"
                    stroke={riskColors[seg.level] || '#8a9bb0'} strokeWidth="22"
                    strokeDasharray={`${seg.dash} ${CIRC}`}
                    strokeDashoffset={-seg.offset}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '74px 74px' }}
                  />
                ))}
                <text x="74" y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">{totalRisk}</text>
                <text x="74" y="84" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-3)" letterSpacing="1">TOTAL</text>
              </svg>
              <div className="dv2-donut-legend">
                {data.hazardsByRisk.map((r, i) => (
                  <div key={i} className="dv2-legend-row">
                    <span className="dv2-legend-dot" style={{ background: riskColors[r.level] || '#8a9bb0' }} />
                    <span className="dv2-legend-label">{r.level}</span>
                    <span className="dv2-legend-val">{r.count}</span>
                    <span className="dv2-legend-pct">{Math.round((r.count / totalRisk) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 5. RECENT INCIDENTS */}
      <div className="dv2-section">
        <div className="dv2-section-hd">
          <span className="dv2-section-label">Recent Incidents</span>
          <div className="dv2-section-line" />
          <span className="dv2-section-link" style={{ cursor: 'pointer' }} onClick={() => setPage('incidents')}>View all →</span>
        </div>
        <div className="table-wrap">
          {data.recentIncidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <div className="empty-title">No incidents logged</div>
              <div className="empty-sub">Incidents you report will appear here</div>
            </div>
          ) : (
            <table className="fs-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data.recentIncidents.map(inc => (
                  <tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => setPage('incidents')}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{inc.date}</td>
                    <td>{inc.type || '—'}</td>
                    <td>{inc.location || '—'}</td>
                    <td>{severityBadge(inc.severity)}</td>
                    <td>{statusBadge(inc.status)}</td>
                    <td><span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>View →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. QUICK ACTIONS */}
      <div className="dv2-section">
        <div className="dv2-section-hd">
          <span className="dv2-section-label">Quick Actions</span>
          <div className="dv2-section-line" />
        </div>
        <div className="dv2-qa-grid">
          {[
            { icon: <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="#ef4444" strokeWidth="1.5"/><path d="M10 6v4.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="13.5" r="1" fill="#ef4444"/></svg>,     label: '+ Log Incident',   sub: 'Report injury, near-miss or hazard', page: 'incidents'   },
            { icon: <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="var(--primary)" strokeWidth="1.5"/><path d="M7 10l2.5 2.5L13 7.5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Start Inspection', sub: 'NS OHS Act daily site checklist',    page: 'inspections' },
            { icon: <svg viewBox="0 0 20 20" fill="none"><path d="M10 2l8 14H2L10 2Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 8v4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="14.5" r="1" fill="#f59e0b"/></svg>, label: 'Add Hazard',      sub: 'Log to hazard register',            page: 'hazards'     },
            { icon: <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8.5" stroke="#10b981" strokeWidth="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/></svg>,                                                label: 'Report Refusal',   sub: 'NS OHS §43 work refusal',           page: 'workrefusal' },
          ].map((a, i) => (
            <div key={i} className="dv2-qa-card" onClick={() => setPage(a.page)}>
              <div className="dv2-qa-icon">{a.icon}</div>
              <div className="dv2-qa-label">{a.label}</div>
              <div className="dv2-qa-sub">{a.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}