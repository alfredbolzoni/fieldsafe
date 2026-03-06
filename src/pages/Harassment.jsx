import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const INCIDENT_TYPES = ['Verbal Harassment', 'Physical Harassment', 'Sexual Harassment', 'Workplace Violence', 'Bullying', 'Discrimination', 'Intimidation', 'Other']
const REPORTER_TYPES = ['Employee', 'Supervisor', 'Manager', 'Contractor', 'Third Party']

export default function Harassment() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [updateText, setUpdateText] = useState('')
  const [updateOutcome, setUpdateOutcome] = useState('')
  const [tab, setTab] = useState('open')

  const emptyForm = {
    report_date: new Date().toISOString().split('T')[0],
    reporter_name: '', reporter_type: 'Employee',
    incident_date: new Date().toISOString().split('T')[0],
    incident_type: 'Verbal Harassment', description: '',
    witnesses: '', respondent: '', location: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('harassment_incidents').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setIncidents(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.reporter_name || !form.description || !form.location || !form.respondent) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('harassment_incidents').insert([{ ...form, user_id: user.id }])
    setForm(emptyForm); setShowForm(false); setSubmitting(false); fetchAll()
  }

  async function handleInvestigate(id) {
    if (!updateText) { alert('Enter investigation notes'); return }
    await supabase.from('harassment_incidents').update({ investigation_notes: updateText, investigation_outcome: updateOutcome, status: 'under_investigation' }).eq('id', id)
    setUpdateTarget(null); setUpdateText(''); setUpdateOutcome(''); fetchAll()
  }

  async function handleResolve(id) {
    if (!updateText) { alert('Enter resolution notes'); return }
    await supabase.from('harassment_incidents').update({ resolution: updateText, status: 'resolved' }).eq('id', id)
    setUpdateTarget(null); setUpdateText(''); fetchAll()
  }

  const filtered = tab === 'open' ? incidents.filter(i => i.status === 'open')
    : tab === 'investigating' ? incidents.filter(i => i.status === 'under_investigation')
    : tab === 'resolved' ? incidents.filter(i => i.status === 'resolved')
    : incidents

  const open = incidents.filter(i => i.status === 'open').length
  const investigating = incidents.filter(i => i.status === 'under_investigation').length

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Violence & Harassment</h1>
          <p className="page-sub">Workplace harassment reporting · NS OHS Act §13 · Updated requirements September 2025</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowForm(true) }}>+ Report Incident</button>
      </div>

      <div className="alert alert-warn" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act §13 — New Requirements Effective September 1, 2025</div>
          <div className="alert-body">Every employer must have a written harassment and violence prevention policy. All incidents must be investigated promptly and confidentially. Retaliation against reporters is prohibited under the Act.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Reports', value: incidents.length, color: 'var(--primary)', delta: 'All time' },
          { label: 'Open', value: open, color: open > 0 ? 'var(--red)' : 'var(--green)', delta: 'Awaiting investigation' },
          { label: 'Under Investigation', value: investigating, color: investigating > 0 ? 'var(--amber)' : 'var(--green)', delta: 'In progress' },
          { label: 'Resolved', value: incidents.filter(i => i.status === 'resolved').length, color: 'var(--green)', delta: 'Closed' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[
          { id: 'open', label: `Open (${open})` },
          { id: 'investigating', label: `Investigating (${investigating})` },
          { id: 'resolved', label: `Resolved (${incidents.filter(i=>i.status==='resolved').length})` },
          { id: 'all', label: `All (${incidents.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="table-wrap"><div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">No incidents reported</div>
            <div className="empty-sub">All workplace harassment incidents must be reported and investigated under NS OHS Act §13</div>
          </div></div>
        ) : filtered.map(inc => {
          const isExpanded = expandedId === inc.id
          return (
            <div key={inc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : inc.id)}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▼' : '▶'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{inc.incident_date}</span>
                    <span className="pill pill-blue">{inc.incident_type}</span>
                    <span className={`pill ${inc.status === 'resolved' ? 'pill-green' : inc.status === 'under_investigation' ? 'pill-amber' : 'pill-red'}`}>{inc.status === 'under_investigation' ? 'Under Investigation' : inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Reported by: <b>{inc.reporter_name}</b> · Location: {inc.location}</div>
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{inc.description}</div>
                  {inc.investigation_notes && <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.15)', borderLeft: '3px solid var(--primary)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Investigation: {inc.investigation_outcome}</div><div style={{ fontSize: 12 }}>{inc.investigation_notes}</div></div>}
                  {inc.resolution && <div style={{ background: 'var(--green-light)', borderLeft: '3px solid var(--green)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--green)' }}>{inc.resolution}</div>}
                  {inc.status === 'open' && updateTarget !== `investigate_${inc.id}` && <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => { setUpdateTarget(`investigate_${inc.id}`); setUpdateText('') }}>Begin Investigation</button>}
                  {inc.status === 'under_investigation' && updateTarget !== `resolve_${inc.id}` && <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => { setUpdateTarget(`resolve_${inc.id}`); setUpdateText('') }}>Record Resolution</button>}
                  {updateTarget === `investigate_${inc.id}` && <div><textarea className="form-input" value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Investigation findings..." style={{ minHeight: 70, marginBottom: 8 }} /><input className="form-input" value={updateOutcome} onChange={e => setUpdateOutcome(e.target.value)} placeholder="Outcome summary" style={{ marginBottom: 8 }} /><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => handleInvestigate(inc.id)}>Save</button><button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setUpdateTarget(null)}>Cancel</button></div></div>}
                  {updateTarget === `resolve_${inc.id}` && <div><textarea className="form-input" value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Resolution notes..." style={{ minHeight: 70, marginBottom: 8 }} /><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => handleResolve(inc.id)}>Close Incident</button><button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setUpdateTarget(null)}>Cancel</button></div></div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ width: 580 }}>
            <div className="modal-title">Report Harassment / Violence Incident</div>
            <div className="modal-sub">NS OHS Act §13 — all reports are confidential</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Reporter Name *</label><input className="form-input" value={form.reporter_name} onChange={e => setForm({ ...form, reporter_name: e.target.value })} placeholder="Name of person reporting" /></div>
              <div className="form-group"><label className="form-label">Reporter Type</label><select className="form-input" value={form.reporter_type} onChange={e => setForm({ ...form, reporter_type: e.target.value })}>{REPORTER_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Incident Date</label><input type="date" className="form-input" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Incident Type</label><select className="form-input" value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })}>{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Location *</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Where did this occur?" /></div>
              <div className="form-group"><label className="form-label">Respondent *</label><input className="form-input" value={form.respondent} onChange={e => setForm({ ...form, respondent: e.target.value })} placeholder="Person the complaint is about" /></div>
            </div>
            <div className="form-group"><label className="form-label">Description *</label><textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what happened..." style={{ minHeight: 90 }} /></div>
            <div className="form-group"><label className="form-label">Witnesses (optional)</label><input className="form-input" value={form.witnesses} onChange={e => setForm({ ...form, witnesses: e.target.value })} placeholder="Names of any witnesses" /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Report'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}