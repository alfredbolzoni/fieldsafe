import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const STEPS = ['open', 'supervisor_investigation', 'johsc_escalation', 'resolved']
const STEP_LABELS = { open: 'Reported', supervisor_investigation: 'Supervisor Investigation', johsc_escalation: 'JOHSC Escalation', resolved: 'Resolved' }

export default function WorkRefusal() {
  const [refusals, setRefusals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [updateText, setUpdateText] = useState('')
  const [updateFinding, setUpdateFinding] = useState('')

  const emptyForm = {
    refusal_date: new Date().toISOString().split('T')[0],
    employee_name: '', work_refused: '', reason: '', supervisor: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('work_refusals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setRefusals(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.employee_name || !form.work_refused || !form.reason || !form.supervisor) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('work_refusals').insert([{ ...form, user_id: user.id, status: 'open' }])
    setForm(emptyForm)
    setShowForm(false)
    setSubmitting(false)
    fetchAll()
  }

  async function handleSupervisorInvestigation(id) {
    if (!updateText) { alert('Enter investigation notes'); return }
    await supabase.from('work_refusals').update({
      supervisor_investigation: updateText,
      supervisor_finding: updateFinding,
      status: updateFinding === 'danger_confirmed' ? 'johsc_escalation' : 'resolved',
      resolution: updateFinding !== 'danger_confirmed' ? updateText : null
    }).eq('id', id)
    setUpdateTarget(null); setUpdateText(''); setUpdateFinding('')
    fetchAll()
  }

  async function handleJOHSCInvestigation(id) {
    if (!updateText) { alert('Enter JOHSC investigation notes'); return }
    await supabase.from('work_refusals').update({
      johsc_investigation: updateText,
      johsc_finding: updateFinding,
      status: 'resolved',
      resolution: updateText
    }).eq('id', id)
    setUpdateTarget(null); setUpdateText(''); setUpdateFinding('')
    fetchAll()
  }

  function getStepIndex(status) {
    return STEPS.indexOf(status)
  }

  const open = refusals.filter(r => r.status !== 'resolved').length
  const escalated = refusals.filter(r => r.status === 'johsc_escalation').length

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Refusal Register</h1>
          <p className="page-sub">Right to refuse unsafe work · NS OHS Act §43–45 · Formal investigation workflow</p>
        </div>
        <div className="page-actions">
          <ExportPDFButton moduleKey="work_refusals" rows={refusals} />
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowForm(true) }}>+ Log Refusal</button>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act §43 — Right to Refuse Unsafe Work</div>
          <div className="alert-body">Every worker has the right to refuse work they believe is dangerous. The employer must investigate immediately, in the presence of the employee. If unresolved, the JOHSC must be notified and investigate. The employee receives regular pay throughout.</div>
        </div>
      </div>

      {escalated > 0 && (
        <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>⚠ {escalated} Refusal{escalated > 1 ? 's' : ''} Escalated to JOHSC</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Supervisor investigation did not resolve — JOHSC investigation required under NS OHS Act §45</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Refusals', value: refusals.length, color: 'var(--primary)', delta: 'All time' },
          { label: 'Open', value: open, color: open > 0 ? 'var(--orange)' : 'var(--green)', delta: 'Under investigation' },
          { label: 'JOHSC Escalated', value: escalated, color: escalated > 0 ? 'var(--red)' : 'var(--green)', delta: 'Requires committee review' },
          { label: 'Resolved', value: refusals.filter(r => r.status === 'resolved').length, color: 'var(--green)', delta: 'Closed' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {refusals.length === 0 ? (
          <div className="table-wrap"><div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">No work refusals recorded</div>
            <div className="empty-sub">Use this register to document all work refusals per NS OHS Act §43</div>
          </div></div>
        ) : refusals.map(r => {
          const stepIdx = getStepIndex(r.status)
          const isExpanded = expandedId === r.id
          return (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▼' : '▶'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{r.refusal_date}</span>
                    <span className={`pill ${r.status === 'resolved' ? 'pill-green' : r.status === 'johsc_escalation' ? 'pill-red' : 'pill-amber'}`}>
                      {STEP_LABELS[r.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.employee_name} refused: {r.work_refused}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Supervisor: {r.supervisor}</div>
                </div>
                {/* PROGRESS STEPS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {STEPS.map((step, i) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: i <= stepIdx ? (r.status === 'resolved' ? 'var(--green)' : r.status === 'johsc_escalation' && i === stepIdx ? 'var(--red)' : 'var(--primary)') : 'var(--border-strong)' }} />
                      {i < STEPS.length - 1 && <div style={{ width: 16, height: 1, background: i < stepIdx ? 'var(--primary)' : 'var(--border-strong)' }} />}
                    </div>
                  ))}
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Reason for Refusal</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6 }}>{r.reason}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Work Refused</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6 }}>{r.work_refused}</div>
                    </div>
                  </div>

                  {/* SUPERVISOR INVESTIGATION */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Step 1 — Supervisor Investigation</div>
                    {r.supervisor_investigation ? (
                      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)', borderRadius: 6, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>Finding: {r.supervisor_finding === 'danger_confirmed' ? '⚠ Danger Confirmed — Escalated to JOHSC' : '✓ No Immediate Danger Found'}</div>
                        <div style={{ fontSize: 12 }}>{r.supervisor_investigation}</div>
                      </div>
                    ) : r.status === 'open' ? (
                      updateTarget === `supervisor_${r.id}` ? (
                        <div>
                          <textarea className="form-input" value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Document investigation findings..." style={{ minHeight: 70, marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            {['no_danger', 'danger_confirmed'].map(f => (
                              <button key={f} onClick={() => setUpdateFinding(f)}
                                style={{ padding: '5px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${updateFinding === f ? (f === 'danger_confirmed' ? 'var(--red)' : 'var(--green)') : 'var(--border-strong)'}`, background: updateFinding === f ? (f === 'danger_confirmed' ? 'var(--red)' : 'var(--green)') : 'transparent', color: updateFinding === f ? '#fff' : 'var(--text-2)' }}>
                                {f === 'no_danger' ? '✓ No Immediate Danger' : '⚠ Danger Confirmed'}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => handleSupervisorInvestigation(r.id)}>Save Investigation</button>
                            <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setUpdateTarget(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 11 }} onClick={() => setUpdateTarget(`supervisor_${r.id}`)}>Record Supervisor Investigation</button>
                      )
                    ) : <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Pending</div>}
                  </div>

                  {/* JOHSC ESCALATION */}
                  {(r.status === 'johsc_escalation' || r.johsc_investigation) && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Step 2 — JOHSC Investigation (NS OHS §45)</div>
                      {r.johsc_investigation ? (
                        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)', borderRadius: 6, padding: '10px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>JOHSC Finding: {r.johsc_finding}</div>
                          <div style={{ fontSize: 12 }}>{r.johsc_investigation}</div>
                        </div>
                      ) : updateTarget === `johsc_${r.id}` ? (
                        <div>
                          <textarea className="form-input" value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Document JOHSC investigation findings and resolution..." style={{ minHeight: 70, marginBottom: 8 }} />
                          <input className="form-input" value={updateFinding} onChange={e => setUpdateFinding(e.target.value)} placeholder="JOHSC finding summary" style={{ marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => handleJOHSCInvestigation(r.id)}>Save JOHSC Investigation</button>
                            <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setUpdateTarget(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-danger" style={{ padding: '6px 14px', fontSize: 11 }} onClick={() => setUpdateTarget(`johsc_${r.id}`)}>Record JOHSC Investigation</button>
                      )}
                    </div>
                  )}

                  {r.resolution && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Resolution</div>
                      <div style={{ background: 'var(--green-light)', border: '1px solid rgba(26,127,75,0.15)', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--green)' }}>{r.resolution}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-title">Log Work Refusal</div>
            <div className="modal-sub">NS OHS Act §43 — document all work refusals immediately</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.refusal_date} onChange={e => setForm({ ...form, refusal_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Employee Name *</label>
                <input className="form-input" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} placeholder="Full name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Work Refused *</label>
              <input className="form-input" value={form.work_refused} onChange={e => setForm({ ...form, work_refused: e.target.value })} placeholder="Describe the specific task or work refused" />
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Refusal *</label>
              <textarea className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Why does the employee believe the work is dangerous?" style={{ minHeight: 80 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Supervisor Present *</label>
              <input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} placeholder="Name of supervisor" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Log Refusal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}