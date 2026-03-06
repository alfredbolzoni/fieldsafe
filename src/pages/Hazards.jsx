import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const CATEGORIES = ['Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychological', 'Environmental', 'Electrical', 'Fire', 'Working at Heights', 'Mobile Equipment']
const LIKELIHOOD = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain']
const CONSEQUENCE = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic']

function getRiskLevel(likelihood, consequence) {
  const l = LIKELIHOOD.indexOf(likelihood)
  const c = CONSEQUENCE.indexOf(consequence)
  const score = (l + 1) * (c + 1)
  if (score >= 15) return 'Critical'
  if (score >= 8) return 'High'
  if (score >= 4) return 'Medium'
  return 'Low'
}

function getRiskColor(level) {
  return { Critical: 'var(--red)', High: 'var(--orange)', Medium: 'var(--amber)', Low: 'var(--green)' }[level] || 'var(--text-3)'
}

function getRiskPill(level) {
  return { Critical: 'pill-red', High: 'pill-orange', Medium: 'pill-amber', Low: 'pill-green' }[level] || 'pill-gray'
}

export default function Hazards() {
  const [hazards, setHazards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editHazard, setEditHazard] = useState(null)
  const [tab, setTab] = useState('active')
  const [submitting, setSubmitting] = useState(false)

  const emptyForm = {
    title: '', description: '', location: '', category: 'Physical',
    likelihood: 'Possible', consequence: 'Moderate', controls: '',
    responsible: '', review_date: '', status: 'active'
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchHazards() }, [])

  async function fetchHazards() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('hazards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setHazards(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.title || !form.location || !form.controls || !form.responsible || !form.review_date) {
      alert('Please fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const risk_level = getRiskLevel(form.likelihood, form.consequence)
    if (editHazard) {
      await supabase.from('hazards').update({ ...form, risk_level }).eq('id', editHazard.id)
    } else {
      await supabase.from('hazards').insert([{ ...form, risk_level, user_id: user.id }])
    }
    setForm(emptyForm)
    setShowForm(false)
    setEditHazard(null)
    setSubmitting(false)
    fetchHazards()
  }

  async function handleClose(id) {
    await supabase.from('hazards').update({ status: 'closed' }).eq('id', id)
    fetchHazards()
  }

  async function handleReopen(id) {
    await supabase.from('hazards').update({ status: 'active' }).eq('id', id)
    fetchHazards()
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this hazard? This cannot be undone.')) return
    await supabase.from('hazards').delete().eq('id', id)
    fetchHazards()
  }

  function openEdit(hazard) {
    setForm({ ...hazard })
    setEditHazard(hazard)
    setShowForm(true)
  }

  function isOverdueReview(date) {
    return date && new Date(date) < new Date()
  }

  const filtered = tab === 'active'
    ? hazards.filter(h => h.status === 'active')
    : tab === 'closed'
    ? hazards.filter(h => h.status === 'closed')
    : hazards

  const critical = hazards.filter(h => h.status === 'active' && h.risk_level === 'Critical').length
  const high = hazards.filter(h => h.status === 'active' && h.risk_level === 'High').length
  const overdueReview = hazards.filter(h => h.status === 'active' && isOverdueReview(h.review_date)).length
  const riskLevel = getRiskLevel(form.likelihood, form.consequence)

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hazard Register</h1>
          <p className="page-sub">Identify · Assess · Control · NS OHS Act compliant risk register</p>
        </div>
        <div className="page-actions">
          <ExportPDFButton moduleKey="hazards" rows={filtered} />
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditHazard(null); setShowForm(true) }}>
            + Register Hazard
          </button>
        </div>
      </div>

      {/* OVERDUE ALERT */}
      {overdueReview > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          <div>
            <div className="alert-title">⚠ {overdueReview} Hazard{overdueReview > 1 ? 's' : ''} Overdue for Review</div>
            <div className="alert-body">NS OHS Act requires regular review of identified hazards. Update controls or close resolved hazards.</div>
          </div>
        </div>
      )}

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Hazards', value: hazards.filter(h=>h.status==='active').length, color: 'var(--primary)', delta: `${hazards.filter(h=>h.status==='closed').length} resolved` },
          { label: 'Critical Risk', value: critical, color: critical > 0 ? 'var(--red)' : 'var(--green)', delta: 'Immediate action required' },
          { label: 'High Risk', value: high, color: high > 0 ? 'var(--orange)' : 'var(--green)', delta: 'Action required' },
          { label: 'Overdue Review', value: overdueReview, color: overdueReview > 0 ? 'var(--amber)' : 'var(--green)', delta: 'Review date passed' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* RISK MATRIX LEGEND */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Risk Matrix</span>
        {[
          { label: 'Critical (≥15)', color: 'var(--red)' },
          { label: 'High (8–14)', color: 'var(--orange)' },
          { label: 'Medium (4–7)', color: 'var(--amber)' },
          { label: 'Low (1–3)', color: 'var(--green)' },
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{r.label}</span>
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>Likelihood × Consequence score</span>
      </div>

      {/* TABS */}
      <div className="tabs">
        {[
          { id: 'active', label: `Active (${hazards.filter(h=>h.status==='active').length})` },
          { id: 'closed', label: `Resolved (${hazards.filter(h=>h.status==='closed').length})` },
          { id: 'all', label: `All (${hazards.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡</div>
            <div className="empty-title">No hazards registered</div>
            <div className="empty-sub">Click "+ Register Hazard" to start building your NS OHS compliant risk register</div>
          </div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                <th>Hazard</th>
                <th>Category</th>
                <th>Location</th>
                <th>Likelihood</th>
                <th>Consequence</th>
                <th>Risk Level</th>
                <th>Controls</th>
                <th>Responsible</th>
                <th>Review Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id}>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{h.title}</div>
                    {h.description && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{h.description.slice(0, 50)}{h.description.length > 50 ? '...' : ''}</div>}
                  </td>
                  <td><span className="pill pill-blue">{h.category}</span></td>
                  <td style={{ fontSize: 12 }}>{h.location}</td>
                  <td style={{ fontSize: 12 }}>{h.likelihood}</td>
                  <td style={{ fontSize: 12 }}>{h.consequence}</td>
                  <td>
                    <span className={`pill ${getRiskPill(h.risk_level)}`} style={{ fontWeight: 700 }}>
                      {h.risk_level}
                    </span>
                  </td>
                  <td style={{ maxWidth: 160, fontSize: 12 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.controls}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{h.responsible}</td>
                  <td>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: isOverdueReview(h.review_date) && h.status === 'active' ? 'var(--red)' : 'var(--text-2)', fontWeight: isOverdueReview(h.review_date) ? 600 : 400 }}>
                      {h.review_date}
                      {isOverdueReview(h.review_date) && h.status === 'active' && <span style={{ marginLeft: 4, fontSize: 9, background: 'var(--red-light)', color: 'var(--red)', padding: '1px 4px', borderRadius: 3, fontFamily: 'Inter' }}>OVERDUE</span>}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${h.status === 'active' ? 'pill-green' : 'pill-gray'}`}>
                      {h.status === 'active' ? 'Active' : 'Resolved'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => openEdit(h)}>Edit</button>
                      {h.status === 'active'
                        ? <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => handleClose(h.id)}>Resolve</button>
                        : <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => handleReopen(h.id)}>Reopen</button>
                      }
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10, color: 'var(--red)' }} onClick={() => handleDelete(h.id)}>Delete</button>
                    </div>
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
          <div className="modal" style={{ width: 580 }}>
            <div className="modal-title">{editHazard ? 'Edit Hazard' : 'Register Hazard'}</div>
            <div className="modal-sub">NS OHS Act requires identification, assessment and control of workplace hazards</div>

            <div className="form-group">
              <label className="form-label">Hazard Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Unguarded scaffold edge on Level 3" />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Additional details about the hazard..." style={{ minHeight: 60 }} />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Building A, Level 3 North" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Likelihood</label>
                <select className="form-input" value={form.likelihood} onChange={e => setForm({ ...form, likelihood: e.target.value })}>
                  {LIKELIHOOD.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Consequence</label>
                <select className="form-input" value={form.consequence} onChange={e => setForm({ ...form, consequence: e.target.value })}>
                  {CONSEQUENCE.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* RISK LEVEL PREVIEW */}
            <div style={{ background: 'var(--surface-2)', border: `2px solid ${getRiskColor(riskLevel)}`, borderRadius: 6, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Calculated Risk Level</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: getRiskColor(riskLevel) }}>{riskLevel}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Controls in Place *</label>
              <textarea className="form-input" value={form.controls} onChange={e => setForm({ ...form, controls: e.target.value })} placeholder="What controls are in place? (PPE, engineering controls, administrative controls...)" style={{ minHeight: 70 }} />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Responsible Person *</label>
                <input className="form-input" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="Name of person responsible" />
              </div>
              <div className="form-group">
                <label className="form-label">Review Date *</label>
                <input type="date" className="form-input" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditHazard(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editHazard ? 'Update Hazard' : 'Register Hazard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}