import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Near-Miss',
    description: '',
    location: '',
    reported_by: '',
    severity: 'Low'
  })

  useEffect(() => { fetchIncidents() }, [])

  async function fetchIncidents() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('incidents').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setIncidents(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.description || !form.location || !form.reported_by) {
      alert('Please fill all fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('incidents').insert([{ ...form, user_id: user.id }])
    setForm({ date: new Date().toISOString().split('T')[0], type: 'Near-Miss', description: '', location: '', reported_by: '', severity: 'Low' })
    setShowForm(false)
    setSubmitting(false)
    fetchIncidents()
  }

  async function handleClose(id) {
    await supabase.from('incidents').update({ status: 'closed' }).eq('id', id)
    fetchIncidents()
  }

  const sevColor = { Low: 'pill-green', Medium: 'pill-amber', High: 'pill-red' }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Incident Reports</h1>
          <p className="page-sub">Log and track all incidents, near-misses and hazards</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Log Incident</button>
      </div>

      {/* STATS */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        {[
          { icon: '🔴', label: 'Open', value: incidents.filter(i => i.status === 'open').length, color: 'var(--red)' },
          { icon: '✅', label: 'Closed', value: incidents.filter(i => i.status === 'closed').length, color: 'var(--green)' },
          { icon: '⚠️', label: 'High Severity', value: incidents.filter(i => i.severity === 'High').length, color: 'var(--orange)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        {loading ? (
          <div className="empty-state"><div className="empty-sub">Loading...</div></div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-title">No incidents logged</div>
            <div className="empty-sub">Click "+ Log Incident" to record your first entry</div>
          </div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                {['Date', 'Type', 'Description', 'Location', 'Reported By', 'Severity', 'Status', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id}>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{inc.date}</td>
                  <td><span className="pill pill-blue">{inc.type}</span></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description}</td>
                  <td>{inc.location}</td>
                  <td>{inc.reported_by}</td>
                  <td><span className={`pill ${sevColor[inc.severity]}`}>{inc.severity}</span></td>
                  <td>
                    <span className={`pill ${inc.status === 'open' ? 'pill-red' : 'pill-green'}`}>
                      {inc.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td>
                    {inc.status === 'open' && (
                      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => handleClose(inc.id)}>
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-title">Log Incident</div>
            <div className="modal-sub">All fields required — saved to your database</div>

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
              <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What happened? Be specific..." />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Scaffold Level 2" />
              </div>
              <div className="form-group">
                <label className="form-label">Reported By</label>
                <input className="form-input" value={form.reported_by} onChange={e => setForm({ ...form, reported_by: e.target.value })} placeholder="Full name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Severity</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Low', 'Medium', 'High'].map(s => {
                  const colors = { Low: 'var(--green)', Medium: 'var(--orange)', High: 'var(--red)' }
                  const active = form.severity === s
                  return (
                    <button key={s} onClick={() => setForm({ ...form, severity: s })}
                      style={{
                        padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', border: '2px solid',
                        borderColor: active ? colors[s] : 'var(--border-strong)',
                        background: active ? colors[s] : 'transparent',
                        color: active ? '#fff' : 'var(--text-2)',
                        transition: 'all 0.15s'
                      }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}