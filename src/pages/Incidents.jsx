import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

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
  if (type === 'Time-Loss Injury' && severity === 'Critical') {
    return { class: 'Critical Injury', notificationRequired: true, deadline: '24 hours — NS OHS §63' }
  }
  if (type === 'Time-Loss Injury') {
    return { class: 'Time-Loss Injury', notificationRequired: true, deadline: '3 days — NS OHS §63' }
  }
  if (type === 'Minor Injury' && (severity === 'High' || severity === 'Critical')) {
    return { class: 'Medical Aid Injury', notificationRequired: true, deadline: 'Internal record — NS OHS §62' }
  }
  if (type === 'Minor Injury') {
    return { class: 'First Aid Injury', notificationRequired: false, deadline: 'Internal record only' }
  }
  if (type === 'Near-Miss') {
    return { class: 'Near-Miss', notificationRequired: false, deadline: 'Internal record only' }
  }
  if (type === 'Hazard Observation') {
    return { class: 'Hazard', notificationRequired: false, deadline: 'Log in Hazard Register' }
  }
  if (type === 'Property Damage') {
    return { class: 'Property Damage', notificationRequired: severity === 'High' || severity === 'Critical', deadline: severity === 'High' ? 'Internal record — review required' : 'Internal record only' }
  }
  return { class: 'General Incident', notificationRequired: false, deadline: 'Internal record only' }
}

  const sevPill = { Low: 'pill-green', Medium: 'pill-amber', High: 'pill-orange', Critical: 'pill-red' }
  const priorityPill = { Low: 'pill-green', Medium: 'pill-amber', High: 'pill-orange', Critical: 'pill-red' }

  const filteredIncidents = tab === 'open'
    ? incidents.filter(i => i.status === 'open')
    : tab === 'closed'
    ? incidents.filter(i => i.status === 'closed')
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
          { label: 'Open Incidents', value: incidents.filter(i => i.status === 'open').length, color: incidents.filter(i => i.status === 'open').length > 0 ? 'var(--red)' : 'var(--green)', delta: `${incidents.filter(i => i.status === 'closed').length} closed` },
          { label: 'Open Actions', value: openActions.length, color: openActions.length > 0 ? 'var(--amber)' : 'var(--green)', delta: `${actions.filter(a => a.status === 'closed').length} completed` },
          { label: 'Overdue Actions', value: overdueActions.length, color: overdueActions.length > 0 ? 'var(--red)' : 'var(--green)', delta: overdueActions.length > 0 ? 'Immediate attention' : 'All on track' },
          { label: 'High Severity', value: incidents.filter(i => i.severity === 'High' || i.severity === 'Critical').length, color: 'var(--orange)', delta: 'High + Critical' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        {[
          { id: 'open', label: `Open (${incidents.filter(i=>i.status==='open').length})` },
          { id: 'closed', label: `Closed (${incidents.filter(i=>i.status==='closed').length})` },
          { id: 'all', label: `All (${incidents.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* INCIDENTS TABLE */}
      <div className="table-wrap" style={{ marginBottom: 0 }}>
        {filteredIncidents.length === 0 ? (
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
                <th>Location</th>
                <th>Reported By</th>
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

                return (
                  <>
                    <tr key={inc.id} style={{ background: isExpanded ? 'var(--surface-2)' : undefined }}>
                      <td>
                        <button
                          onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 10, padding: '2px 4px', borderRadius: 3, fontFamily: 'Inter' }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{inc.date}</td>
                      <td><span className="pill pill-blue">{inc.type}</span></td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description}</td>
                      <td>{inc.location}</td>
                      <td>{inc.reported_by}</td>
                      <td><span className={`pill ${sevPill[inc.severity] || 'pill-gray'}`}>{inc.severity}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: overdueAct.length > 0 ? 'var(--red)' : openAct.length > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
                            {incActions.length === 0 ? '—' : `${openAct.length} open`}
                          </span>
                          {overdueAct.length > 0 && <span className="pill pill-red" style={{ fontSize: 9 }}>OVERDUE</span>}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: 10 }}
                            onClick={() => { setSelectedIncident(inc.id); setShowActionForm(true) }}
                          >+ Add</button>
                        </div>
                      </td>
                      <td>
                        {inc.ns_ohs_class ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: inc.notification_required ? 'var(--red)' : 'var(--text-2)', marginBottom: 2 }}>
                              {inc.ns_ohs_class}
                            </div>
                            {inc.notification_required && (
                              <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600 }}>
                                ⚠ {inc.notification_deadline}
                              </div>
                            )}
                            {!inc.notification_required && (
                              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                                {inc.notification_deadline}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>
                      <td><span className={`pill ${inc.status === 'open' ? 'pill-red' : 'pill-green'}`}>{inc.status === 'open' ? 'Open' : 'Closed'}</span></td>
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

                    {/* EXPANDED — corrective actions */}
                    {isExpanded && (
                      <tr key={`${inc.id}-expanded`}>
                        <td colSpan={11} style={{ padding: 0, background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '12px 16px 16px 36px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
                              Corrective Actions
                            </div>

                            {incActions.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '8px 0' }}>
                                No corrective actions assigned — <button
                                  onClick={() => { setSelectedIncident(inc.id); setShowActionForm(true) }}
                                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                  Add one now
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        <div className="alert-title">
                          {c.notificationRequired ? '⚠ ' : 'ℹ '}
                          NS OHS Classification: {c.class}
                        </div>
                        <div className="alert-body">
                          {c.notificationRequired
                            ? `Notification required: ${c.deadline}`
                            : c.deadline}
                        </div>
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
    </div>
  )
}