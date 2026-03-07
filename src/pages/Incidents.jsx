import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const PHASES = [
  { label: 'Assignment',          short: '1' },
  { label: 'Investigation',       short: '2' },
  { label: 'Corrective Actions',  short: '3' },
  { label: 'Formal Closure',      short: '4' },
]

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showActionForm, setShowActionForm] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [expandedIncident, setExpandedIncident] = useState(null)
  const [tab, setTab] = useState('open')
  const [submitting, setSubmitting] = useState(false)
  const [detailIncident, setDetailIncident] = useState(null)
  const [actionsFilter, setActionsFilter] = useState(null) // null | 'open' | 'overdue'

  // Workflow state
  const [activePhase, setActivePhase] = useState({})   // { incId: 0|1|2|3 }
  const [wfEdits, setWfEdits] = useState({})            // { incId: { field: value } }
  const [savingWf, setSavingWf] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Near-Miss', description: '', location: '',
    reported_by: '', severity: 'Low'
  })

  const [actionForm, setActionForm] = useState({
    description: '', assigned_to: '', due_date: '', priority: 'Medium', notes: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: inc }, { data: act }] = await Promise.all([
      supabase.from('incidents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('corrective_actions').select('*').eq('user_id', user.id).order('due_date')
    ])
    setIncidents(inc || [])
    setActions(act || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.description || !form.location || !form.reported_by) {
      alert('Please fill all fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const classification = classifyIncident(form.type, form.severity)
    await supabase.from('incidents').insert([{
      ...form,
      user_id: user.id,
      ns_ohs_class: classification.class,
      notification_required: classification.notificationRequired,
      notification_deadline: classification.deadline
    }])
    setForm({ date: new Date().toISOString().split('T')[0], type: 'Near-Miss', description: '', location: '', reported_by: '', severity: 'Low' })
    setShowForm(false)
    setSubmitting(false)
    fetchAll()
  }

  async function handleClose(id) {
    await supabase.from('incidents').update({ status: 'closed' }).eq('id', id)
    fetchAll()
  }

  async function handleReopen(id) {
    await supabase.from('incidents').update({ status: 'open' }).eq('id', id)
    fetchAll()
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this incident? This cannot be undone.')) return
    await supabase.from('corrective_actions').delete().eq('incident_id', id)
    await supabase.from('incidents').delete().eq('id', id)
    fetchAll()
  }

  async function handleAddAction() {
    if (!actionForm.description || !actionForm.assigned_to || !actionForm.due_date) { alert('Fill all required fields'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('corrective_actions').insert([{
      ...actionForm, incident_id: selectedIncident, user_id: user.id
    }])
    setActionForm({ description: '', assigned_to: '', due_date: '', priority: 'Medium', notes: '' })
    setShowActionForm(false)
    setSelectedIncident(null)
    fetchAll()
  }

  async function handleCloseAction(id) {
    await supabase.from('corrective_actions').update({
      status: 'closed',
      closed_at: new Date().toISOString().split('T')[0],
      closed_by: 'HSE Manager'
    }).eq('id', id)
    fetchAll()
  }

  async function handleUpdateActionStatus(id, status) {
    await supabase.from('corrective_actions').update({ status }).eq('id', id)
    fetchAll()
  }

  // ── Workflow helpers ──────────────────────────────────────────────

  function wfVal(incId, field, fallback = '') {
    return wfEdits[incId]?.[field] !== undefined ? wfEdits[incId][field] : fallback
  }

  function setWfField(incId, field, value) {
    setWfEdits(prev => ({ ...prev, [incId]: { ...(prev[incId] || {}), [field]: value } }))
  }

  async function handleSaveWf(incId, fields) {
    setSavingWf(true)
    const updates = {}
    fields.forEach(f => { if (wfEdits[incId]?.[f] !== undefined) updates[f] = wfEdits[incId][f] })
    if (Object.keys(updates).length > 0) {
      await supabase.from('incidents').update(updates).eq('id', incId)
      await fetchAll()
    }
    setSavingWf(false)
  }

  async function handleFormalClose(incId) {
    const inc = incidents.find(i => i.id === incId)
    const signedBy   = wfEdits[incId]?.hse_signed_by   ?? inc?.hse_signed_by   ?? ''
    const signedDate = wfEdits[incId]?.hse_signed_date  ?? inc?.hse_signed_date  ?? new Date().toISOString().split('T')[0]
    const confirmed  = wfEdits[incId]?.closure_confirmed ?? inc?.closure_confirmed ?? false
    if (!signedBy || !signedDate || !confirmed) {
      alert('Fill in all closure fields and confirm corrective actions are complete.'); return
    }
    setSavingWf(true)
    await supabase.from('incidents').update({
      hse_signed_by: signedBy,
      hse_signed_date: signedDate,
      closure_confirmed: confirmed,
      status: 'closed'
    }).eq('id', incId)
    await fetchAll()
    setSavingWf(false)
  }

  function getPhaseComplete(inc, incActions) {
    return [
      !!inc.assignee,
      !!inc.root_cause,
      incActions.length > 0 && incActions.every(a => a.status === 'closed'),
      !!(inc.hse_signed_by && inc.closure_confirmed),
    ]
  }

  function handleExpandIncident(inc, incActions) {
    if (expandedIncident === inc.id) { setExpandedIncident(null); return }
    setExpandedIncident(inc.id)
    // Jump to first incomplete phase
    const complete = getPhaseComplete(inc, incActions)
    const first = complete.findIndex(c => !c)
    setActivePhase(prev => ({ ...prev, [inc.id]: first === -1 ? 3 : first }))
  }

  // ── Misc helpers ──────────────────────────────────────────────────

  function getActionsForIncident(incidentId) {
    return actions.filter(a => a.incident_id === incidentId)
  }

  function isOverdue(dueDate) {
    return new Date(dueDate) < new Date()
  }

  function daysUntil(dueDate) {
    const days = Math.floor((new Date(dueDate) - new Date()) / 86400000)
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Due today'
    return `${days}d remaining`
  }

  function classifyIncident(type, severity) {
    if (type === 'Time-Loss Injury' && severity === 'Critical') return { class: 'Critical Injury', notificationRequired: true, deadline: '24 hours — NS OHS §63' }
    if (type === 'Time-Loss Injury') return { class: 'Time-Loss Injury', notificationRequired: true, deadline: '3 days — NS OHS §63' }
    if (type === 'Minor Injury' && (severity === 'High' || severity === 'Critical')) return { class: 'Medical Aid Injury', notificationRequired: true, deadline: 'Internal record — NS OHS §62' }
    if (type === 'Minor Injury') return { class: 'First Aid Injury', notificationRequired: false, deadline: 'Internal record only' }
    if (type === 'Near-Miss') return { class: 'Near-Miss', notificationRequired: false, deadline: 'Internal record only' }
    if (type === 'Hazard Observation') return { class: 'Hazard', notificationRequired: false, deadline: 'Log in Hazard Register' }
    if (type === 'Property Damage') return { class: 'Property Damage', notificationRequired: severity === 'High' || severity === 'Critical', deadline: severity === 'High' ? 'Internal record — review required' : 'Internal record only' }
    return { class: 'General Incident', notificationRequired: false, deadline: 'Internal record only' }
  }

  function handlePrintIncident(inc) {
    const incActions = getActionsForIncident(inc.id)
    const w = window.open('', '_blank', 'width=820,height=700')
    w.document.write(`<!DOCTYPE html><html><head><title>Incident Report — ${inc.date}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:14px}
      h1{font-size:22px;margin:0 0 4px}
      .meta{color:#666;font-size:13px;margin-bottom:28px}
      h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin:24px 0 12px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:8px}
      .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}
      .value{font-size:14px;font-weight:600}
      .desc{background:#f5f5f5;padding:14px;border-radius:6px;line-height:1.6;white-space:pre-wrap}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
      th{text-align:left;padding:6px 8px;background:#f0f0f0;font-size:11px}
      td{padding:7px 8px;border-bottom:1px solid #eee}
      .warn{background:#fff8e1;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;font-size:12px;margin-bottom:12px}
      .footer{margin-top:40px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#aaa;text-align:center}
      @media print{body{padding:20px}}
    </style></head><body>
    <h1>Incident Report</h1>
    <div class="meta">${inc.type} &middot; ${inc.severity} severity &middot; Reported ${inc.date} &middot; Status: ${inc.status}</div>
    <h2>Incident Details</h2>
    <div class="grid">
      <div><div class="label">Date</div><div class="value">${inc.date}</div></div>
      <div><div class="label">Location</div><div class="value">${inc.location}</div></div>
      <div><div class="label">Reported By</div><div class="value">${inc.reported_by}</div></div>
      ${inc.ns_ohs_class ? `<div><div class="label">NS OHS Classification</div><div class="value">${inc.ns_ohs_class}</div></div>` : ''}
    </div>
    ${inc.notification_required ? `<div class="warn">⚠ Regulatory notification required: ${inc.notification_deadline}</div>` : ''}
    <h2>Description</h2>
    <div class="desc">${inc.description}</div>
    ${inc.root_cause ? `
    <h2>Investigation</h2>
    <div class="grid">
      <div style="grid-column:1/-1"><div class="label">Root Cause</div><div class="value" style="font-weight:400;margin-top:4px">${inc.root_cause}</div></div>
      ${inc.contributing_factors ? `<div style="grid-column:1/-1"><div class="label">Contributing Factors</div><div class="value" style="font-weight:400;margin-top:4px">${inc.contributing_factors}</div></div>` : ''}
      ${inc.witnesses ? `<div><div class="label">Witnesses</div><div class="value">${inc.witnesses}</div></div>` : ''}
      ${inc.investigation_notes ? `<div style="grid-column:1/-1"><div class="label">Investigation Notes</div><div class="value" style="font-weight:400;margin-top:4px">${inc.investigation_notes}</div></div>` : ''}
    </div>` : ''}
    ${incActions.length > 0 ? `
    <h2>Corrective Actions (${incActions.length})</h2>
    <table><thead><tr><th>Description</th><th>Assigned To</th><th>Due Date</th><th>Priority</th><th>Status</th></tr></thead><tbody>
      ${incActions.map(a => `<tr><td>${a.description}</td><td>${a.assigned_to}</td><td>${a.due_date}</td><td>${a.priority}</td><td>${a.status}</td></tr>`).join('')}
    </tbody></table>` : ''}
    ${inc.hse_signed_by ? `
    <h2>Formal Closure</h2>
    <div class="grid">
      <div><div class="label">Signed By</div><div class="value">${inc.hse_signed_by}</div></div>
      <div><div class="label">Closure Date</div><div class="value">${inc.hse_signed_date}</div></div>
    </div>` : ''}
    <div class="footer">FieldSafe HSE Management System &middot; Generated ${new Date().toLocaleDateString()}</div>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
    w.document.close()
  }

  const sevPill = { Low: 'pill-green', Medium: 'pill-amber', High: 'pill-orange', Critical: 'pill-red' }
  const priorityPill = { Low: 'pill-green', Medium: 'pill-amber', High: 'pill-orange', Critical: 'pill-red' }

  const filteredIncidents = tab === 'open'
    ? incidents.filter(i => i.status === 'open')
    : tab === 'closed'
    ? incidents.filter(i => i.status === 'closed')
    : tab === 'high'
    ? incidents.filter(i => i.severity === 'High' || i.severity === 'Critical')
    : incidents

  const overdueActions = actions.filter(a => a.status !== 'closed' && isOverdue(a.due_date))
  const openActions = actions.filter(a => a.status !== 'closed')

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Incident Management</h1>
          <p className="page-sub">Log incidents · Assign corrective actions · Track closure</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => { setShowActionForm(true) }}>+ Corrective Action</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Log Incident</button>
          <ExportPDFButton moduleKey="incidents" rows={incidents} />
        </div>
      </div>

      {/* ALERT — overdue actions */}
      {overdueActions.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          <div>
            <div className="alert-title">⚠ {overdueActions.length} Overdue Corrective Action{overdueActions.length > 1 ? 's' : ''}</div>
            <div className="alert-body">
              {overdueActions.slice(0,2).map(a => `"${a.description}" assigned to ${a.assigned_to} — ${daysUntil(a.due_date)}`).join(' · ')}
              {overdueActions.length > 2 && ` · +${overdueActions.length - 2} more`}
            </div>
          </div>
        </div>
      )}

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Open Incidents', value: incidents.filter(i => i.status === 'open').length, color: incidents.filter(i => i.status === 'open').length > 0 ? 'var(--red)' : 'var(--green)', delta: `${incidents.filter(i => i.status === 'closed').length} closed`, onClick: () => setTab('open') },
          { label: 'Open Actions', value: openActions.length, color: openActions.length > 0 ? 'var(--amber)' : 'var(--green)', delta: `${actions.filter(a => a.status === 'closed').length} completed`, onClick: () => { setTab('actions'); setActionsFilter('open') } },
          { label: 'Overdue Actions', value: overdueActions.length, color: overdueActions.length > 0 ? 'var(--red)' : 'var(--green)', delta: overdueActions.length > 0 ? 'Immediate attention' : 'All on track', onClick: () => { setTab('actions'); setActionsFilter('overdue') } },
          { label: 'High Severity', value: incidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length, color: 'var(--orange)', delta: 'High + Critical', onClick: () => setTab('high') },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}`, cursor: 'pointer' }} onClick={k.onClick}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        {[
          { id: 'open',    label: `Open (${incidents.filter(i=>i.status==='open').length})` },
          { id: 'closed',  label: `Closed (${incidents.filter(i=>i.status==='closed').length})` },
          { id: 'high',    label: `High/Critical (${incidents.filter(i=>i.severity==='High'||i.severity==='Critical').length})` },
          { id: 'all',     label: `All (${incidents.length})` },
          { id: 'actions', label: `Actions (${actions.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); if (t.id !== 'actions') setActionsFilter(null) }}>{t.label}</button>
        ))}
      </div>

      {/* INCIDENTS TABLE */}
      <div className="table-wrap" style={{ marginBottom: 0 }}>
        {tab === 'actions' ? (
          (() => {
            const displayedActions = actionsFilter === 'open' ? openActions : actionsFilter === 'overdue' ? overdueActions : actions
            return displayedActions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <div className="empty-title">No corrective actions</div>
              <div className="empty-sub">Add actions from within an incident's workflow</div>
            </div>
          ) : (
            <>
            {actionsFilter && (
              <div style={{ padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>Showing: <b>{actionsFilter === 'open' ? `Open actions (${openActions.length})` : `Overdue actions (${overdueActions.length})`}</b></span>
                <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setActionsFilter(null)}>Show all ✕</button>
              </div>
            )}
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Linked Incident</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayedActions.map(action => {
                  const linkedInc = incidents.find(i => i.id === action.incident_id)
                  const overdue = action.status !== 'closed' && isOverdue(action.due_date)
                  return (
                    <tr key={action.id} style={{ background: overdue ? 'rgba(255,59,48,0.04)' : undefined }}>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{action.description}</div>
                        {action.notes && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{action.notes}</div>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {linkedInc ? `${linkedInc.date} — ${linkedInc.description.slice(0,40)}` : '—'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{action.assigned_to}</td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: overdue ? 'var(--red)' : 'var(--text-1)' }}>{action.due_date}</div>
                        <div style={{ fontSize: 10, color: overdue ? 'var(--red)' : 'var(--text-3)', fontWeight: overdue ? 700 : 400 }}>{daysUntil(action.due_date)}</div>
                      </td>
                      <td><span className={`pill ${priorityPill[action.priority] || 'pill-gray'}`}>{action.priority}</span></td>
                      <td>
                        {action.status === 'closed'
                          ? <span className="pill pill-green">Closed</span>
                          : overdue
                          ? <span className="pill pill-red">Overdue</span>
                          : action.status === 'in-progress'
                          ? <span className="pill pill-blue">In Progress</span>
                          : <span className="pill pill-amber">Open</span>
                        }
                      </td>
                      <td>
                        {action.status !== 'closed' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            {action.status === 'open' && (
                              <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleUpdateActionStatus(action.id, 'in-progress')}>Start</button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleCloseAction(action.id)}>✓ Done</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </>
          )
          })()
        ) : filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">No {tab === 'open' ? 'open ' : ''}incidents</div>
            <div className="empty-sub">{tab === 'open' ? 'All incidents are closed or none logged yet' : 'No incidents logged yet'}</div>
          </div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                <th style={{ width: 20 }}></th>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Actions</th>
                <th>NS OHS Class</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map(inc => {
                const incActions = getActionsForIncident(inc.id)
                const openAct = incActions.filter(a => a.status !== 'closed')
                const overdueAct = incActions.filter(a => a.status !== 'closed' && isOverdue(a.due_date))
                const isExpanded = expandedIncident === inc.id
                const phaseComplete = getPhaseComplete(inc, incActions)
                const doneCount = phaseComplete.filter(Boolean).length

                return (
                  <>
                    <tr key={inc.id} style={{ background: isExpanded ? 'var(--surface-2)' : undefined }}>
                      <td>
                        <button
                          onClick={() => handleExpandIncident(inc, incActions)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 10, padding: '2px 4px', borderRadius: 3, fontFamily: 'Inter' }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{inc.date}</td>
                      <td><span className="pill pill-blue">{inc.type}</span></td>
                      <td style={{ maxWidth: 240 }}>
                        <div
                          onClick={() => setDetailIncident(inc)}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                          title="Click to view full description"
                        >{inc.description}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{inc.location} · {inc.reported_by}</div>
                      </td>
                      <td><span className={`pill ${sevPill[inc.severity] || 'pill-gray'}`}>{inc.severity}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: overdueAct.length > 0 ? 'var(--red)' : openAct.length > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                            {incActions.length === 0 ? '—' : `${openAct.length} open`}
                          </span>
                          {overdueAct.length > 0 && <span className="pill pill-red" style={{ fontSize: 9 }}>OVERDUE</span>}
                        </div>
                      </td>
                      <td>
                        {inc.ns_ohs_class ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: inc.notification_required ? 'var(--red)' : 'var(--text-2)', marginBottom: 2 }}>
                              {inc.ns_ohs_class}
                            </div>
                            {inc.notification_required && (
                              <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600 }}>⚠ {inc.notification_deadline}</div>
                            )}
                            {!inc.notification_required && (
                              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{inc.notification_deadline}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className={`pill ${inc.status === 'open' ? 'pill-red' : 'pill-green'}`}>{inc.status === 'open' ? 'Open' : 'Closed'}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>{doneCount}/4 phases</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {inc.status === 'open'
                            ? <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleClose(inc.id)}>Close</button>
                            : <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => handleReopen(inc.id)}>Reopen</button>
                          }
                          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, color: 'var(--red)' }} onClick={() => handleDelete(inc.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED — 4-phase workflow dossier */}
                    {isExpanded && (
                      <tr key={`${inc.id}-expanded`}>
                        <td colSpan={9} style={{ padding: 0, background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>

                          {/* STEPPER HEADER */}
                          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                            {PHASES.map((phase, idx) => {
                              const done = phaseComplete[idx]
                              const active = (activePhase[inc.id] ?? 0) === idx
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setActivePhase(prev => ({ ...prev, [inc.id]: idx }))}
                                  style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    border: 'none',
                                    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                                    background: active ? 'var(--surface-2)' : 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    transition: 'background 0.12s',
                                  }}
                                >
                                  <span style={{
                                    width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    background: done ? 'var(--green)' : active ? 'var(--primary)' : 'var(--border-strong)',
                                    color: done || active ? '#fff' : 'var(--text-3)',
                                  }}>
                                    {done ? '✓' : phase.short}
                                  </span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--text-1)' : done ? 'var(--green)' : 'var(--text-3)' }}>
                                    {phase.label}
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          {/* PHASE CONTENT */}
                          <div style={{ padding: '16px 24px 20px 24px' }}>

                            {/* ── PHASE 1: ASSIGNMENT ── */}
                            {(activePhase[inc.id] ?? 0) === 0 && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                  Case Assignment — who manages this incident?
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 540 }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Responsible Person</label>
                                    <input
                                      className="form-input"
                                      value={wfVal(inc.id, 'assignee', inc.assignee || '')}
                                      onChange={e => setWfField(inc.id, 'assignee', e.target.value)}
                                      placeholder="Full name"
                                    />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Date Taken Over</label>
                                    <input
                                      type="date"
                                      className="form-input"
                                      value={wfVal(inc.id, 'assignee_date', inc.assignee_date || '')}
                                      onChange={e => setWfField(inc.id, 'assignee_date', e.target.value)}
                                    />
                                  </div>
                                </div>
                                {inc.assignee && (
                                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                                    Currently assigned to {inc.assignee}{inc.assignee_date ? ` · taken over ${inc.assignee_date}` : ''}
                                  </div>
                                )}
                                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 18px', fontSize: 12 }}
                                    disabled={savingWf}
                                    onClick={() => handleSaveWf(inc.id, ['assignee', 'assignee_date'])}
                                  >
                                    {savingWf ? 'Saving...' : 'Save Assignment'}
                                  </button>
                                  {phaseComplete[0] && (
                                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
                                      onClick={() => setActivePhase(prev => ({ ...prev, [inc.id]: 1 }))}>
                                      Next: Investigation →
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ── PHASE 2: INVESTIGATION ── */}
                            {(activePhase[inc.id] ?? 0) === 1 && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                  Investigation — root cause analysis
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680 }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Root Cause *</label>
                                    <textarea
                                      className="form-input"
                                      style={{ minHeight: 64 }}
                                      value={wfVal(inc.id, 'root_cause', inc.root_cause || '')}
                                      onChange={e => setWfField(inc.id, 'root_cause', e.target.value)}
                                      placeholder="What was the fundamental cause of this incident?"
                                    />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Contributing Factors</label>
                                    <textarea
                                      className="form-input"
                                      style={{ minHeight: 56 }}
                                      value={wfVal(inc.id, 'contributing_factors', inc.contributing_factors || '')}
                                      onChange={e => setWfField(inc.id, 'contributing_factors', e.target.value)}
                                      placeholder="Environmental, organisational, human factors..."
                                    />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Witnesses</label>
                                    <input
                                      className="form-input"
                                      value={wfVal(inc.id, 'witnesses', inc.witnesses || '')}
                                      onChange={e => setWfField(inc.id, 'witnesses', e.target.value)}
                                      placeholder="Names of witnesses present"
                                    />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Investigation Notes</label>
                                    <textarea
                                      className="form-input"
                                      style={{ minHeight: 56 }}
                                      value={wfVal(inc.id, 'investigation_notes', inc.investigation_notes || '')}
                                      onChange={e => setWfField(inc.id, 'investigation_notes', e.target.value)}
                                      placeholder="Additional findings, interviews conducted, documentation reviewed..."
                                    />
                                  </div>
                                </div>
                                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 18px', fontSize: 12 }}
                                    disabled={savingWf}
                                    onClick={() => handleSaveWf(inc.id, ['root_cause', 'contributing_factors', 'witnesses', 'investigation_notes'])}
                                  >
                                    {savingWf ? 'Saving...' : 'Save Investigation'}
                                  </button>
                                  {phaseComplete[1] && (
                                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
                                      onClick={() => setActivePhase(prev => ({ ...prev, [inc.id]: 2 }))}>
                                      Next: Corrective Actions →
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ── PHASE 3: CORRECTIVE ACTIONS ── */}
                            {(activePhase[inc.id] ?? 0) === 2 && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    Corrective Actions
                                  </div>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 12px', fontSize: 11 }}
                                    onClick={() => { setSelectedIncident(inc.id); setShowActionForm(true) }}
                                  >
                                    + Add Action
                                  </button>
                                </div>

                                {incActions.length === 0 ? (
                                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '8px 0' }}>
                                    No corrective actions assigned yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
                                    {incActions.map(action => (
                                      <div key={action.id} style={{
                                        background: 'var(--surface)', border: '1px solid var(--border)',
                                        borderLeft: `3px solid ${action.status === 'closed' ? 'var(--green)' : isOverdue(action.due_date) ? 'var(--red)' : 'var(--amber)'}`,
                                        borderRadius: 6, padding: '10px 14px',
                                        display: 'flex', alignItems: 'center', gap: 14
                                      }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{action.description}</div>
                                          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                                            Assigned to <b>{action.assigned_to}</b> · Due {action.due_date} ·{' '}
                                            <span style={{ color: action.status === 'closed' ? 'var(--green)' : isOverdue(action.due_date) ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                                              {action.status === 'closed' ? 'Completed' : daysUntil(action.due_date)}
                                            </span>
                                          </div>
                                          {action.notes && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{action.notes}</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                          <span className={`pill ${priorityPill[action.priority] || 'pill-gray'}`}>{action.priority}</span>
                                          {action.status !== 'closed' && (
                                            <>
                                              {action.status === 'open' && (
                                                <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 10 }}
                                                  onClick={() => handleUpdateActionStatus(action.id, 'in-progress')}>
                                                  Start
                                                </button>
                                              )}
                                              <button className="btn btn-secondary" style={{ padding: '3px 9px', fontSize: 10 }}
                                                onClick={() => handleCloseAction(action.id)}>
                                                ✓ Done
                                              </button>
                                            </>
                                          )}
                                          {action.status === 'closed' && (
                                            <span className="pill pill-green">Closed</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {phaseComplete[2] && (
                                  <div style={{ marginTop: 14 }}>
                                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
                                      onClick={() => setActivePhase(prev => ({ ...prev, [inc.id]: 3 }))}>
                                      Next: Formal Closure →
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── PHASE 4: FORMAL CLOSURE ── */}
                            {(activePhase[inc.id] ?? 0) === 3 && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                  Formal Closure — HSE Manager sign-off
                                </div>

                                {/* Prerequisites checklist */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, maxWidth: 480 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Prerequisites</div>
                                  {[
                                    { label: 'Case assigned', done: phaseComplete[0] },
                                    { label: 'Investigation complete', done: phaseComplete[1] },
                                    { label: 'All corrective actions closed', done: phaseComplete[2] },
                                  ].map((req, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: req.done ? 'var(--green)' : 'var(--border-strong)', color: req.done ? '#fff' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                        {req.done ? '✓' : '!'}
                                      </span>
                                      <span style={{ color: req.done ? 'var(--text-2)' : 'var(--text-3)' }}>{req.label}</span>
                                    </div>
                                  ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 540 }}>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">HSE Manager Name</label>
                                    <input
                                      className="form-input"
                                      value={wfEdits[inc.id]?.hse_signed_by ?? inc.hse_signed_by ?? ''}
                                      onChange={e => setWfField(inc.id, 'hse_signed_by', e.target.value)}
                                      placeholder="Full name"
                                      disabled={inc.hse_signed_by && inc.closure_confirmed}
                                    />
                                  </div>
                                  <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Closure Date</label>
                                    <input
                                      type="date"
                                      className="form-input"
                                      value={wfEdits[inc.id]?.hse_signed_date ?? inc.hse_signed_date ?? new Date().toISOString().split('T')[0]}
                                      onChange={e => setWfField(inc.id, 'hse_signed_date', e.target.value)}
                                      disabled={inc.hse_signed_by && inc.closure_confirmed}
                                    />
                                  </div>
                                </div>

                                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <input
                                    type="checkbox"
                                    id={`confirm-${inc.id}`}
                                    checked={wfEdits[inc.id]?.closure_confirmed ?? inc.closure_confirmed ?? false}
                                    onChange={e => setWfField(inc.id, 'closure_confirmed', e.target.checked)}
                                    disabled={inc.hse_signed_by && inc.closure_confirmed}
                                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                                  />
                                  <label htmlFor={`confirm-${inc.id}`} style={{ fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
                                    I confirm all corrective actions are complete and this incident is ready for formal closure
                                  </label>
                                </div>

                                {inc.hse_signed_by && inc.closure_confirmed ? (
                                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--green)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480 }}>
                                    <span style={{ fontSize: 18, color: 'var(--green)' }}>✓</span>
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Formally closed</div>
                                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Signed by {inc.hse_signed_by} · {inc.hse_signed_date}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ marginTop: 14 }}>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '6px 18px', fontSize: 12 }}
                                      disabled={savingWf || !phaseComplete[0] || !phaseComplete[1] || !phaseComplete[2]}
                                      onClick={() => handleFormalClose(inc.id)}
                                    >
                                      {savingWf ? 'Saving...' : 'Sign & Close Incident'}
                                    </button>
                                    {(!phaseComplete[0] || !phaseComplete[1] || !phaseComplete[2]) && (
                                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Complete all prerequisites before formal closure.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* LOG INCIDENT MODAL */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-title">Log Incident</div>
            <div className="modal-sub">Record incident details — corrective actions can be added after</div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option>Near-Miss</option>
                  <option>Minor Injury</option>
                  <option>Time-Loss Injury</option>
                  <option>Property Damage</option>
                  <option>Hazard Observation</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What happened? Be specific about sequence of events..." />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Scaffold Level 2, North face" />
              </div>
              <div className="form-group">
                <label className="form-label">Reported By</label>
                <input className="form-input" value={form.reported_by} onChange={e => setForm({ ...form, reported_by: e.target.value })} placeholder="Full name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Severity</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Low', 'Medium', 'High', 'Critical'].map(s => {
                  const colors = { Low: 'var(--green)', Medium: 'var(--amber)', High: 'var(--orange)', Critical: 'var(--red)' }
                  const active = form.severity === s
                  return (
                    <button key={s} onClick={() => setForm({ ...form, severity: s })}
                      style={{ padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? colors[s] : 'var(--border-strong)'}`, background: active ? colors[s] : 'transparent', color: active ? '#fff' : 'var(--text-2)', transition: 'all 0.12s' }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {form.type !== 'Near-Miss' && form.type !== 'Hazard Observation' && (
              <div className={`alert ${
                (form.type === 'Time-Loss Injury' || (form.type === 'Minor Injury' && (form.severity === 'High' || form.severity === 'Critical')))
                  ? 'alert-warn' : 'alert-info'
              }`} style={{ marginTop: 4 }}>
                <div>
                  {(() => {
                    const c = classifyIncident(form.type, form.severity)
                    return (
                      <>
                        <div className="alert-title">{c.notificationRequired ? '⚠ ' : 'ℹ '}NS OHS Classification: {c.class}</div>
                        <div className="alert-body">{c.notificationRequired ? `Notification required: ${c.deadline}` : c.deadline}</div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CORRECTIVE ACTION MODAL */}
      {showActionForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowActionForm(false)}>
          <div className="modal">
            <div className="modal-title">Add Corrective Action</div>
            <div className="modal-sub">
              {selectedIncident
                ? `Linked to: ${incidents.find(i => i.id === selectedIncident)?.description?.slice(0,50) || 'incident'}...`
                : 'Select the incident this action belongs to'}
            </div>

            {!selectedIncident && (
              <div className="form-group">
                <label className="form-label">Linked Incident</label>
                <select className="form-input" value={selectedIncident || ''} onChange={e => setSelectedIncident(e.target.value)}>
                  <option value=''>Select incident...</option>
                  {incidents.filter(i => i.status === 'open').map(i => (
                    <option key={i.id} value={i.id}>{i.date} — {i.description.slice(0,50)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Action Description *</label>
              <textarea className="form-input" value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} placeholder="What corrective action must be taken?" style={{ minHeight: 70 }} />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Assigned To *</label>
                <input className="form-input" value={actionForm.assigned_to} onChange={e => setActionForm({ ...actionForm, assigned_to: e.target.value })} placeholder="Responsible person" />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input type="date" className="form-input" value={actionForm.due_date} onChange={e => setActionForm({ ...actionForm, due_date: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITIES.map(p => {
                  const colors = { Low: 'var(--green)', Medium: 'var(--amber)', High: 'var(--orange)', Critical: 'var(--red)' }
                  const active = actionForm.priority === p
                  return (
                    <button key={p} onClick={() => setActionForm({ ...actionForm, priority: p })}
                      style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? colors[p] : 'var(--border-strong)'}`, background: active ? colors[p] : 'transparent', color: active ? '#fff' : 'var(--text-2)', transition: 'all 0.12s' }}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} placeholder="Additional context or instructions..." />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowActionForm(false); setSelectedIncident(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddAction}>Save Action</button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT DETAIL MODAL */}
      {detailIncident && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailIncident(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="modal-title" style={{ marginBottom: 4 }}>Incident Details</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="pill pill-blue">{detailIncident.type}</span>
                  <span className={`pill ${sevPill[detailIncident.severity] || 'pill-gray'}`}>{detailIncident.severity}</span>
                  <span className={`pill ${detailIncident.status === 'open' ? 'pill-red' : 'pill-green'}`}>{detailIncident.status === 'open' ? 'Open' : 'Closed'}</span>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1 }} onClick={() => setDetailIncident(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Date</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailIncident.date}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailIncident.location}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Reported By</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailIncident.reported_by}</div>
              </div>
              {detailIncident.ns_ohs_class && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>NS OHS Class</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: detailIncident.notification_required ? 'var(--red)' : 'var(--text-1)' }}>{detailIncident.ns_ohs_class}</div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', background: 'var(--surface-2)', borderRadius: 6, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
                {detailIncident.description}
              </div>
            </div>

            {detailIncident.notification_required && (
              <div className="alert alert-warn" style={{ marginBottom: 16, padding: '10px 14px' }}>
                <div className="alert-title" style={{ fontSize: 12 }}>⚠ Regulatory notification required</div>
                <div className="alert-body" style={{ fontSize: 11, marginTop: 2 }}>{detailIncident.notification_deadline}</div>
              </div>
            )}

            {detailIncident.root_cause && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Root Cause</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{detailIncident.root_cause}</div>
              </div>
            )}

            <div className="modal-footer" style={{ paddingTop: 12, justifyContent: 'space-between' }}>
              <button className="btn btn-primary" onClick={() => handlePrintIncident(detailIncident)}>Print / Export PDF</button>
              <button className="btn btn-secondary" onClick={() => setDetailIncident(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
