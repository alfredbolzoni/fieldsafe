import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

export default function SafeWorkProcedures() {
  const [swps, setSwps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSwp, setEditSwp] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const emptyForm = {
    title: '', task: '', hazards: '', ppe_required: '', steps: '',
    approved_by: '', approval_date: new Date().toISOString().split('T')[0],
    review_date: '', revision: '1.0'
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('safe_work_procedures').select('*').eq('user_id', user.id).order('title')
    setSwps(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.title || !form.task || !form.hazards || !form.steps || !form.approved_by) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editSwp) {
      await supabase.from('safe_work_procedures').update({ ...form }).eq('id', editSwp.id)
    } else {
      await supabase.from('safe_work_procedures').insert([{ ...form, user_id: user.id }])
    }
    setForm(emptyForm); setShowForm(false); setEditSwp(null); setSubmitting(false); fetchAll()
  }

  async function handleArchive(id) {
    await supabase.from('safe_work_procedures').update({ status: 'archived' }).eq('id', id)
    fetchAll()
  }

  function isReviewOverdue(date) {
    if (!date) return false
    return new Date(date) < new Date()
  }

  const active = swps.filter(s => s.status === 'active')
  const reviewOverdue = active.filter(s => isReviewOverdue(s.review_date)).length
  const filtered = active.filter(s => !search ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.task.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Safe Work Procedures</h1>
          <p className="page-sub">Written SWPs for high-risk tasks · NS OHS Act — required for all non-routine tasks</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditSwp(null); setShowForm(true) }}>+ New SWP</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act — Safe Work Procedures Required</div>
          <div className="alert-body">Written SWPs are required for all tasks with significant hazard potential. Workers must be trained on applicable SWPs before performing the task. Review after any incident or when conditions change.</div>
        </div>
      </div>

      {reviewOverdue > 0 && (
        <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(183,121,31,0.2)', borderLeft: '3px solid var(--amber)', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{reviewOverdue} SWP{reviewOverdue > 1 ? 's' : ''} Overdue for Review</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active SWPs', value: active.length, color: 'var(--primary)', delta: 'In procedure library' },
          { label: 'Review Overdue', value: reviewOverdue, color: reviewOverdue > 0 ? 'var(--amber)' : 'var(--green)', delta: 'Past review date' },
          { label: 'Archived', value: swps.filter(s => s.status === 'archived').length, color: 'var(--text-3)', delta: 'Historical' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search procedures..." style={{ marginBottom: 14 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="table-wrap"><div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No safe work procedures</div>
            <div className="empty-sub">Document step-by-step procedures for all high-risk tasks</div>
          </div></div>
        ) : filtered.map(swp => {
          const isExpanded = expandedId === swp.id
          const reviewOd = isReviewOverdue(swp.review_date)
          return (
            <div key={swp.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : swp.id)}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▼' : '▶'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{swp.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>Rev {swp.revision}</span>
                    {reviewOd && <span className="pill pill-amber">Review Overdue</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Task: {swp.task} · Approved by: <b>{swp.approved_by}</b> · {swp.approval_date}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={e => { e.stopPropagation(); setForm({ ...swp }); setEditSwp(swp); setShowForm(true) }}>Edit</button>
                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={e => { e.stopPropagation(); handleArchive(swp.id) }}>Archive</button>
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Identified Hazards</div>
                      <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.15)', borderRadius: 6, padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>{swp.hazards}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>PPE Required</div>
                      <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.15)', borderRadius: 6, padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>{swp.ppe_required || 'None specified'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Step-by-Step Procedure</div>
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{swp.steps}</div>
                  </div>
                  {swp.review_date && <div style={{ marginTop: 10, fontSize: 11, color: reviewOd ? 'var(--amber)' : 'var(--text-3)' }}>Review due: <b>{swp.review_date}</b></div>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ width: 640 }}>
            <div className="modal-title">{editSwp ? 'Edit SWP' : 'New Safe Work Procedure'}</div>
            <div className="modal-sub">Workers must be trained on this SWP before performing the task</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Procedure Title *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lockout / Tagout Procedure" /></div>
              <div className="form-group"><label className="form-label">Task Description *</label><input className="form-input" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="e.g. Servicing electrical equipment" /></div>
            </div>
            <div className="form-group"><label className="form-label">Identified Hazards *</label><textarea className="form-input" value={form.hazards} onChange={e => setForm({ ...form, hazards: e.target.value })} placeholder="List all hazards associated with this task..." style={{ minHeight: 70 }} /></div>
            <div className="form-group"><label className="form-label">PPE Required</label><input className="form-input" value={form.ppe_required} onChange={e => setForm({ ...form, ppe_required: e.target.value })} placeholder="e.g. Hard hat, safety glasses, steel-toe boots" /></div>
            <div className="form-group"><label className="form-label">Step-by-Step Procedure *</label><textarea className="form-input" value={form.steps} onChange={e => setForm({ ...form, steps: e.target.value })} placeholder="1. Isolate energy source&#10;2. Apply lockout device&#10;3. Verify isolation..." style={{ minHeight: 130 }} /></div>
            <div className="grid-3" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Approved By *</label><input className="form-input" value={form.approved_by} onChange={e => setForm({ ...form, approved_by: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Approval Date</label><input type="date" className="form-input" value={form.approval_date} onChange={e => setForm({ ...form, approval_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Review Date</label><input type="date" className="form-input" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Revision</label><input className="form-input" value={form.revision} onChange={e => setForm({ ...form, revision: e.target.value })} style={{ width: 100 }} /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditSwp(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editSwp ? 'Update SWP' : 'Save SWP'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}