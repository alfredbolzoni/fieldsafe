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

        <nav style={{ flex: 1, overflowY: 'auto' }}>
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
    </div>
  )
}

function DashboardHome({ setPage }) {
  const [stats, setStats] = useState({ incidents: 0, openIncidents: 0, inspections: 0, avgScore: 0, workers: 0, expiring: 0, expired: 0, daysLTI: '∞', overdueActions: 0, criticalHazards: 0, overdueHazardReview: 0, timeLossIncidents: 0, activeHazards: 0, openActions: 0 })
  const [, setLoading] = useState(true)
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => { fetchStats() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: inc }, { data: ins }, { data: wrk }, { data: cer }, { data: haz }, { data: act }] = await Promise.all([
      supabase.from('incidents').select('*').eq('user_id', user.id),
      supabase.from('inspections').select('*').eq('user_id', user.id),
      supabase.from('workers').select('*').eq('user_id', user.id),
      supabase.from('certifications').select('*').eq('user_id', user.id),
      supabase.from('hazards').select('*').eq('user_id', user.id),
      supabase.from('corrective_actions').select('*').eq('user_id', user.id),
    ])
    const incidents = inc || [], inspections = ins || [], workers = wrk || [], certs = cer || [], hazards = haz || [], actions = act || []
    const today = new Date()

    const openIncidents = incidents.filter(i => i.status === 'open').length
    const avgScore = inspections.length > 0 ? Math.round(inspections.reduce((s, i) => s + (i.score || 0), 0) / inspections.length) : 0
    const expiring = certs.filter(c => { if (!c.expiry_date) return false; const d = Math.floor((new Date(c.expiry_date) - today) / 86400000); return d >= 0 && d <= 30 }).length
    const expired = certs.filter(c => c.expiry_date && new Date(c.expiry_date) < today).length
    const lastLTI = incidents.filter(i => i.type === 'Time-Loss Injury').sort((a,b) => new Date(b.date)-new Date(a.date))[0]
    const daysLTI = lastLTI ? Math.floor((today - new Date(lastLTI.date)) / 86400000) : '∞'
    const overdueActions = actions.filter(a => a.status !== 'closed' && new Date(a.due_date) < today).length
    const criticalHazards = hazards.filter(h => h.status === 'active' && h.risk_level === 'Critical').length
    const overdueHazardReview = hazards.filter(h => h.status === 'active' && h.review_date && new Date(h.review_date) < today).length
    const timeLossIncidents = incidents.filter(i => i.type === 'Time-Loss Injury').length

    setStats({
      incidents: incidents.length, openIncidents, inspections: inspections.length,
      avgScore, workers: workers.length, expiring, expired, daysLTI,
      overdueActions, criticalHazards, overdueHazardReview, timeLossIncidents,
      activeHazards: hazards.filter(h => h.status === 'active').length,
      openActions: actions.filter(a => a.status !== 'closed').length,
    })
    setLoading(false)
  }

  const kpis = [
    { label: 'Open Incidents', value: stats.openIncidents, unit: '', color: stats.openIncidents > 0 ? 'var(--red)' : 'var(--green)', accent: stats.openIncidents > 0 ? 'var(--red)' : 'var(--green)', delta: `${stats.incidents} total logged`, page: 'incidents' },
    { label: 'Avg Inspection Score', value: stats.avgScore, unit: '%', color: stats.avgScore >= 80 ? 'var(--green)' : stats.avgScore >= 60 ? 'var(--orange)' : 'var(--text-2)', accent: 'var(--orange)', delta: `${stats.inspections} inspections done`, page: 'inspections' },
    { label: 'Days Without LTI', value: stats.daysLTI, unit: '', color: 'var(--green)', accent: 'var(--green)', delta: 'Lost time injury free', page: null },
    { label: 'Certs Expiring Soon', value: stats.expiring, unit: '', color: stats.expiring > 0 ? 'var(--orange)' : 'var(--green)', accent: 'var(--blue)', delta: `${stats.workers} workers tracked`, page: 'training' },
  ]

  const modules = [
    { icon: <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="#dc2626" strokeWidth="1.3"/><path d="M7.5 4.5V8" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="10.5" r="0.75" fill="#dc2626"/></svg>, title: 'Incident Reports', desc: 'Injuries, near-misses & hazards', stat: `${stats.openIncidents} open`, statColor: stats.openIncidents > 0 ? 'var(--red)' : 'var(--green)', id: 'incidents' },
    { icon: <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><path d="M2 3.5h11M2 7.5h11M2 11.5h6" stroke="#2563eb" strokeWidth="1.3" strokeLinecap="round"/><circle cx="12" cy="11.5" r="2" stroke="#2563eb" strokeWidth="1.2"/></svg>, title: 'Site Inspections', desc: 'NS OHS Act daily checklists', stat: `${stats.avgScore}% avg score`, statColor: 'var(--orange)', id: 'inspections' },
    { icon: <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="#16a34a" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="#16a34a" strokeWidth="1.3" strokeLinecap="round"/></svg>, title: 'Training Tracker', desc: 'Certifications & expiry monitoring', stat: `${stats.workers} workers`, statColor: 'var(--blue)', id: 'training' },
    { icon: <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><path d="M1.5 13.5L5.5 8.5L8.5 11L12.5 5.5" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13" cy="5" r="1.2" fill="#7c3aed"/></svg>, title: 'Analytics', desc: 'KPIs vs WCB Nova Scotia benchmarks', stat: 'View report', statColor: '#7c3aed', id: 'analytics' },
  ]

  return (
    <div className="page-wrap">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            {dateStr} · {timeStr}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', marginBottom: 6 }}>Site Overview</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>FieldSafe HSE Platform · Nova Scotia</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => setPage('inspections')}>Start Inspection</button>
          <button className="btn btn-primary" onClick={() => setPage('incidents')}>+ Log Incident</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {kpis.map((k, i) => (
          <div key={i} onClick={() => k.page && setPage(k.page)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 22px 18px', boxShadow: 'var(--shadow-sm)', cursor: k.page ? 'pointer' : 'default', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { if(k.page) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.accent, borderRadius: '16px 16px 0 0' }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>{k.label}</div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-2px', color: k.color, lineHeight: 1, marginBottom: 10 }}>{k.value}{k.unit}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{k.delta}</div>
            {k.page && <div style={{ position: 'absolute', bottom: 16, right: 18, fontSize: 11, fontWeight: 700, color: k.accent, opacity: 0.7 }}>View →</div>}
          </div>
        ))}
      </div>

      {(stats.overdueActions > 0 || stats.criticalHazards > 0 || stats.expired > 0 || stats.timeLossIncidents > 0 || stats.overdueHazardReview > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Action Required</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          {stats.timeLossIncidents > 0 && (
            <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('incidents')}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>🚨 NS OHS Notification Required</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{stats.timeLossIncidents} Time-Loss Injury recorded — must notify NS Dept. of Labour within 24h</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>View →</span>
            </div>
          )}
          {stats.criticalHazards > 0 && (
            <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('hazards')}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>⚠ {stats.criticalHazards} Critical Hazard{stats.criticalHazards > 1 ? 's' : ''} Active</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Critical risk level requires immediate control measures — NS OHS §13</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>View →</span>
            </div>
          )}
          {stats.overdueActions > 0 && (
            <div style={{ background: 'var(--orange-light)', border: '1px solid rgba(192,86,33,0.2)', borderLeft: '3px solid var(--orange)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('incidents')}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>{stats.overdueActions} Overdue Corrective Action{stats.overdueActions > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Open corrective actions past due date — review and update status</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>View →</span>
            </div>
          )}
          {stats.expired > 0 && (
            <div style={{ background: 'var(--orange-light)', border: '1px solid rgba(192,86,33,0.2)', borderLeft: '3px solid var(--orange)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('training')}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>{stats.expired} Expired Certification{stats.expired > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Workers with expired certifications must not perform regulated tasks</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>View →</span>
            </div>
          )}
          {stats.overdueHazardReview > 0 && (
            <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(183,121,31,0.2)', borderLeft: '3px solid var(--amber)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setPage('hazards')}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 2 }}>{stats.overdueHazardReview} Hazard Review{stats.overdueHazardReview > 1 ? 's' : ''} Overdue</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Regular hazard review required under NS OHS Act §9 — update or resolve</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 16 }}>View →</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>Modules</div>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 28 }}>
        {modules.map((mod, i) => (
          <div key={i} onClick={() => setPage(mod.id)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 18, boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <div style={{ width: 52, height: 52, background: 'var(--bg)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{mod.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{mod.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{mod.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: mod.statColor }}>{mod.stat}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Open →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}