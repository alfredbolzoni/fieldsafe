import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const PLAN_TYPES = ['Fire', 'Medical Emergency', 'Chemical Spill', 'Severe Weather', 'Evacuation', 'Power Failure', 'Workplace Violence', 'Natural Disaster', 'Pandemic / Communicable Disease', 'Other']
const PLAN_ICONS = { 'Fire': '🔥', 'Medical Emergency': '🚑', 'Chemical Spill': '☣', 'Severe Weather': '🌩', 'Evacuation': '🚪', 'Power Failure': '⚡', 'Workplace Violence': '🛡', 'Natural Disaster': '🌊', 'Pandemic / Communicable Disease': '🦠', 'Other': '📋' }

export default function EmergencyPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const emptyForm = {
    plan_type: 'Fire', title: '', description: '', assembly_point: '',
    emergency_contacts: '', procedures: '', equipment_location: '',
    last_drill_date: '', next_drill_date: '', reviewed_by: '',
    review_date: new Date().toISOString().split('T')[0]
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('emergency_plans').select('*').eq('user_id', user.id).order('plan_type')
    setPlans(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.title || !form.procedures || !form.reviewed_by) { alert('Fill all required fields'); return }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editPlan) {
      await supabase.from('emergency_plans').update({ ...form }).eq('id', editPlan.id)
    } else {
      await supabase.from('emergency_plans').insert([{ ...form, user_id: user.id }])
    }
    setForm(emptyForm); setShowForm(false); setEditPlan(null); setSubmitting(false); fetchAll()
  }

  function isDrillOverdue(date) {
    if (!date) return false
    return new Date(date) < new Date(new Date().setMonth(new Date().getMonth() - 6))
  }

  function isReviewOverdue(date) {
    if (!date) return false
    return new Date(date) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  }

  const drillOverdue = plans.filter(p => isDrillOverdue(p.last_drill_date)).length
  const reviewOverdue = plans.filter(p => isReviewOverdue(p.review_date)).length
  const missingCore = ['Fire', 'Medical Emergency', 'Chemical Spill', 'Evacuation'].filter(t => !plans.find(p => p.plan_type === t)).length

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Emergency Response Plans</h1>
          <p className="page-sub">Fire · Medical · Chemical Spill · Evacuation · NS OHS Act compliant</p>
        </div>
        <div className="page-actions">
          <ExportPDFButton moduleKey="emergency_plans" rows={plans} />
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditPlan(null); setShowForm(true) }}>+ Add Plan</button>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act — Emergency Preparedness Required</div>
          <div className="alert-body">Every workplace must have written emergency procedures. Plans must be reviewed annually, drills conducted every 6 months, and all workers trained before starting work.</div>
        </div>
      </div>

      {(drillOverdue > 0 || reviewOverdue > 0 || missingCore > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {missingCore > 0 && <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px' }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>⚠ {missingCore} Core Emergency Plan{missingCore > 1 ? 's' : ''} Missing (Fire / Medical / Spill / Evacuation)</div></div>}
          {drillOverdue > 0 && <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(183,121,31,0.2)', borderLeft: '3px solid var(--amber)', borderRadius: 6, padding: '10px 14px' }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{drillOverdue} Drill{drillOverdue > 1 ? 's' : ''} Overdue — drills required every 6 months</div></div>}
          {reviewOverdue > 0 && <div style={{ background: 'var(--amber-light)', border: '1px solid rgba(183,121,31,0.2)', borderLeft: '3px solid var(--amber)', borderRadius: 6, padding: '10px 14px' }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>{reviewOverdue} Plan{reviewOverdue > 1 ? 's' : ''} Overdue for Annual Review</div></div>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Plans in Place', value: plans.length, color: 'var(--primary)', delta: `of ${PLAN_TYPES.length} types` },
          { label: 'Core Plans Missing', value: missingCore, color: missingCore > 0 ? 'var(--red)' : 'var(--green)', delta: 'Fire/Medical/Spill/Evac' },
          { label: 'Drills Overdue', value: drillOverdue, color: drillOverdue > 0 ? 'var(--orange)' : 'var(--green)', delta: 'Last drill >6 months' },
          { label: 'Reviews Overdue', value: reviewOverdue, color: reviewOverdue > 0 ? 'var(--amber)' : 'var(--green)', delta: 'Annual review required' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Plan Coverage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PLAN_TYPES.map(type => {
            const has = plans.find(p => p.plan_type === type)
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: has ? 'var(--green-light)' : 'var(--surface-2)', border: `1px solid ${has ? 'rgba(26,127,75,0.2)' : 'var(--border)'}`, borderRadius: 6, cursor: has ? 'default' : 'pointer' }}
                onClick={() => { if (!has) { setForm({ ...emptyForm, plan_type: type, title: `${type} Emergency Response Plan` }); setShowForm(true) } }}>
                <span>{PLAN_ICONS[type]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: has ? 'var(--green)' : 'var(--text-3)' }}>{has ? '✓' : '+'} {type}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.length === 0 ? (
          <div className="table-wrap"><div className="empty-state"><div className="empty-icon">🚨</div><div className="empty-title">No emergency plans documented</div><div className="empty-sub">Click any plan type above or "+ Add Plan" to get started</div></div></div>
        ) : plans.map(plan => {
          const isExpanded = expandedId === plan.id
          const drillOd = isDrillOverdue(plan.last_drill_date)
          const reviewOd = isReviewOverdue(plan.review_date)
          return (
            <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▼' : '▶'}</div>
                <span style={{ fontSize: 20 }}>{PLAN_ICONS[plan.plan_type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{plan.title}</span>
                    <span className="pill pill-blue">{plan.plan_type}</span>
                    {drillOd && <span className="pill pill-orange">Drill Overdue</span>}
                    {reviewOd && <span className="pill pill-amber">Review Overdue</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Reviewed by: <b>{plan.reviewed_by}</b> · {plan.review_date}{plan.assembly_point && ` · Assembly: ${plan.assembly_point}`}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={e => { e.stopPropagation(); setForm({ ...plan }); setEditPlan(plan); setShowForm(true) }}>Edit</button>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Procedures</div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 6, whiteSpace: 'pre-wrap' }}>{plan.procedures}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plan.assembly_point && <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Assembly Point</div><div style={{ fontSize: 12 }}>{plan.assembly_point}</div></div>}
                      {plan.emergency_contacts && <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Emergency Contacts</div><div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{plan.emergency_contacts}</div></div>}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '10px 12px' }}><div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>LAST DRILL</div><div style={{ fontSize: 12, fontWeight: 600, color: drillOd ? 'var(--orange)' : 'var(--text)' }}>{plan.last_drill_date || 'Not recorded'}</div></div>
                        <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '10px 12px' }}><div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>NEXT DRILL</div><div style={{ fontSize: 12, fontWeight: 600 }}>{plan.next_drill_date || '—'}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ width: 620 }}>
            <div className="modal-title">{editPlan ? 'Edit Plan' : 'Add Emergency Response Plan'}</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Plan Type</label><select className="form-input" value={form.plan_type} onChange={e => setForm({ ...form, plan_type: e.target.value })}>{PLAN_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fire Emergency Response Plan" /></div>
            </div>
            <div className="form-group"><label className="form-label">Procedures * (step-by-step)</label><textarea className="form-input" value={form.procedures} onChange={e => setForm({ ...form, procedures: e.target.value })} placeholder="1. Sound alarm&#10;2. Call 911&#10;3. Evacuate via nearest exit&#10;4. Assemble at muster point..." style={{ minHeight: 120 }} /></div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Assembly Point</label><input className="form-input" value={form.assembly_point} onChange={e => setForm({ ...form, assembly_point: e.target.value })} placeholder="e.g. Parking Lot B" /></div>
              <div className="form-group"><label className="form-label">Equipment Location</label><input className="form-input" value={form.equipment_location} onChange={e => setForm({ ...form, equipment_location: e.target.value })} placeholder="e.g. Fire ext near exits" /></div>
            </div>
            <div className="form-group"><label className="form-label">Emergency Contacts</label><textarea className="form-input" value={form.emergency_contacts} onChange={e => setForm({ ...form, emergency_contacts: e.target.value })} placeholder="Fire: 911&#10;NS OHS: 1-800-952-2687" style={{ minHeight: 70 }} /></div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Last Drill Date</label><input type="date" className="form-input" value={form.last_drill_date} onChange={e => setForm({ ...form, last_drill_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Next Drill Date</label><input type="date" className="form-input" value={form.next_drill_date} onChange={e => setForm({ ...form, next_drill_date: e.target.value })} /></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Reviewed By *</label><input className="form-input" value={form.reviewed_by} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} placeholder="Name" /></div>
              <div className="form-group"><label className="form-label">Review Date</label><input type="date" className="form-input" value={form.review_date} onChange={e => setForm({ ...form, review_date: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditPlan(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editPlan ? 'Update' : 'Save Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}