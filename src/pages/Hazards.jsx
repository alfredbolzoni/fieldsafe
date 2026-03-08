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
  const [detailHazard, setDetailHazard] = useState(null)

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
    const { title, description, location, category, likelihood, consequence, controls, responsible, review_date, status } = hazard
    setForm({ title, description, location, category, likelihood, consequence, controls, responsible, review_date, status })
    setEditHazard(hazard)
    setShowForm(true)
  }

  function isOverdueReview(date) {
    return date && new Date(date) < new Date()
  }

  function buildHazardReportHTML(h, exportMode = false) {
    const riskColor = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' }[h.risk_level] || '#64748b'
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Hazard Report — ${h.title}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:13px;max-width:820px;margin:0 auto}
      h1{font-size:22px;margin:0 0 6px;color:#0f172a}
      .subtitle{color:#555;font-size:12px;padding-bottom:14px;border-bottom:2px solid #0f172a;display:flex;gap:16px;flex-wrap:wrap}
      h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin:22px 0 10px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin-bottom:8px}
      .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 20px;margin-bottom:8px}
      .lbl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
      .val{font-size:13px;font-weight:700;color:#0f172a}
      .val-n{font-size:13px;font-weight:400;color:#1e293b;line-height:1.55;white-space:pre-wrap}
      .risk-badge{display:inline-block;padding:4px 14px;border-radius:6px;font-size:13px;font-weight:800;letter-spacing:.3px;color:#fff;background:${riskColor};margin-bottom:4px}
      .score-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;text-align:center;margin-bottom:4px}
      .score-num{font-size:22px;font-weight:800}
      .score-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#64748b;margin-top:3px}
      .controls-box{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:4px;line-height:1.6;white-space:pre-wrap;font-size:13px}
      .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
      .save-btn{display:block;width:100%;margin-bottom:20px;padding:12px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer}
      @media print{.save-btn{display:none!important}body{padding:20px}}
    </style></head><body>
    ${exportMode ? `<button class="save-btn" onclick="window.print()">⬇ Save as PDF — use "Save as PDF" in the print dialog</button>` : ''}
    <h1>Hazard Report</h1>
    <div class="subtitle">
      <span><b>Category:</b> ${h.category}</span>
      <span><b>Status:</b> ${h.status === 'active' ? 'Active' : 'Resolved'}</span>
      <span><b>Risk Level:</b> <span style="color:${riskColor};font-weight:700">${h.risk_level}</span></span>
    </div>

    <h2>Hazard Details</h2>
    <div class="grid3">
      <div><div class="lbl">Location</div><div class="val">${h.location}</div></div>
      <div><div class="lbl">Category</div><div class="val">${h.category}</div></div>
      <div><div class="lbl">Review Date</div><div class="val" style="color:${h.review_date && new Date(h.review_date) < new Date() ? '#dc2626' : 'inherit'}">${h.review_date || '—'}</div></div>
      <div><div class="lbl">Responsible</div><div class="val">${h.responsible}</div></div>
      <div><div class="lbl">Status</div><div class="val">${h.status === 'active' ? 'Active' : 'Resolved'}</div></div>
      <div><div class="lbl">Risk Level</div><div class="risk-badge">${h.risk_level}</div></div>
    </div>

    <h2>Risk Assessment</h2>
    <div class="score-row">
      <div><div class="score-num" style="color:#64748b">${h.likelihood}</div><div class="score-lbl">Likelihood</div></div>
      <div><div class="score-num" style="color:#64748b">${h.consequence}</div><div class="score-lbl">Consequence</div></div>
      <div><div class="score-num" style="color:${riskColor}">${h.risk_level}</div><div class="score-lbl">Risk Level</div></div>
    </div>

    ${h.description ? `<h2>Description</h2><div class="controls-box">${h.description}</div>` : ''}

    <h2>Controls in Place</h2>
    <div class="controls-box">${h.controls || '—'}</div>

    <div class="footer">
      FieldSafe HSE Management System · Hazard Report generated ${new Date().toLocaleDateString('en-CA', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ID: ${h.id}
    </div>
    </body></html>`
  }

  function handlePrintHazard(h) {
    const w = window.open('', '_blank', 'width=860,height=700')
    w.document.write(buildHazardReportHTML(h, false))
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  function handleExportHazard(h) {
    const w = window.open('', '_blank', 'width=860,height=720')
    w.document.write(buildHazardReportHTML(h, true))
    w.document.close()
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
                    <div
                      onClick={() => setDetailHazard(h)}
                      style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                    >{h.title}</div>
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
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setDetailHazard(h)}>View</button>
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
      {/* HAZARD DETAIL MODAL */}
      {detailHazard && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailHazard(null)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="modal-title" style={{ marginBottom: 4 }}>{detailHazard.title}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="pill pill-blue">{detailHazard.category}</span>
                  <span className={`pill ${getRiskPill(detailHazard.risk_level)}`} style={{ fontWeight: 700 }}>{detailHazard.risk_level} Risk</span>
                  <span className={`pill ${detailHazard.status === 'active' ? 'pill-green' : 'pill-gray'}`}>{detailHazard.status === 'active' ? 'Active' : 'Resolved'}</span>
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1 }} onClick={() => setDetailHazard(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailHazard.location}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Responsible</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailHazard.responsible}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Likelihood</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailHazard.likelihood}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Consequence</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailHazard.consequence}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Review Date</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isOverdueReview(detailHazard.review_date) && detailHazard.status === 'active' ? 'var(--red)' : 'var(--text-1)' }}>
                  {detailHazard.review_date || '—'}
                  {isOverdueReview(detailHazard.review_date) && detailHazard.status === 'active' && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>OVERDUE</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Risk Level</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: getRiskColor(detailHazard.risk_level) }}>{detailHazard.risk_level}</div>
              </div>
            </div>

            {detailHazard.description && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', background: 'var(--surface-2)', borderRadius: 6, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
                  {detailHazard.description}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Controls in Place</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', background: 'var(--surface-2)', borderRadius: 6, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
                {detailHazard.controls}
              </div>
            </div>

            <div className="modal-footer" style={{ paddingTop: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => handlePrintHazard(detailHazard)}>🖨 PRINT</button>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => handleExportHazard(detailHazard)}>⬇ EXPORT PDF</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setDetailHazard(null); openEdit(detailHazard) }}>Edit</button>
                <button className="btn btn-ghost" onClick={() => setDetailHazard(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}