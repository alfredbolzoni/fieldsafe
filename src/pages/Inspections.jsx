import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const CHECKLIST = [
  { label: 'PPE available and in good condition', sub: 'Hard hats, vests, gloves, safety boots' },
  { label: 'Fall protection equipment inspected', sub: 'Harnesses, lanyards, anchor points' },
  { label: 'Scaffold inspected by competent worker', sub: 'Bracing, planks, guardrails — NS OHS §83' },
  { label: 'Signage and barriers in place', sub: 'Site perimeter, excavation zones, restricted areas' },
  { label: 'Emergency exits clear and marked', sub: 'All exit routes accessible — 36" minimum clearance' },
  { label: 'Fire extinguisher accessible and charged', sub: 'Check pressure gauge — must be in date' },
  { label: 'First aid kit stocked and accessible', sub: 'Contents per NS OHS First Aid Regulations' },
  { label: 'WHMIS SDS binder on-site', sub: 'Current SDS for all hazardous materials in use today' },
  { label: 'Pre-task JSA completed by foreman', sub: 'Job Safety Analysis for high-risk tasks today' },
  { label: 'Spotter assigned for mobile equipment', sub: 'Forklift, bobcat, crane — NS OHS §91' },
  { label: 'Housekeeping — site clean and tidy', sub: 'Trip hazards, waste management, material storage' },
  { label: 'Toolbox talk completed with crew', sub: 'Daily safety topic communicated — sign-in sheet done' },
]

export default function Inspections() {
  const [view, setView] = useState('list')
  const [inspections, setInspections] = useState([])
  const [activeInspection, setActiveInspection] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supervisor: '',
    location: ''
  })

  useEffect(() => { fetchInspections() }, [])

  async function fetchInspections() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setInspections(data || [])
    setLoading(false)
  }

  async function startInspection() {
    if (!form.supervisor || !form.location) { alert('Fill in supervisor and location'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: inspection } = await supabase
      .from('inspections')
      .insert([{ ...form, user_id: user.id, passed: 0, failed: 0, pending: CHECKLIST.length, score: 0 }])
      .select()
      .single()

    const itemsToInsert = CHECKLIST.map(item => ({
      inspection_id: inspection.id,
      label: item.label,
      sub: item.sub,
      result: 'pending',
      user_id: user.id
    }))
    await supabase.from('inspection_items').insert(itemsToInsert)

    setActiveInspection(inspection)
    setItems(itemsToInsert.map((item, i) => ({ ...item, id: i })))
    setSaving(false)
    setView('active')
    fetchInspection(inspection.id)
  }

  async function fetchInspection(id) {
    const { data } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', id)
      .order('created_at')
    setItems(data || [])
  }

  async function resumeInspection(ins) {
    setActiveInspection(ins)
    await fetchInspection(ins.id)
    setView('active')
  }

  async function setResult(itemId, result) {
    await supabase.from('inspection_items').update({ result }).eq('id', itemId)
    const updated = items.map(i => i.id === itemId ? { ...i, result } : i)
    setItems(updated)

    const passed = updated.filter(i => i.result === 'pass').length
    const failed = updated.filter(i => i.result === 'fail').length
    const pending = updated.filter(i => i.result === 'pending').length
    const score = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0

    await supabase.from('inspections').update({ passed, failed, pending, score }).eq('id', activeInspection.id)
    setActiveInspection(prev => ({ ...prev, passed, failed, pending, score }))
  }

  async function submitInspection() {
    const passed = items.filter(i => i.result === 'pass').length
    const failed = items.filter(i => i.result === 'fail').length
    const score = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0
    const status = score >= 80 ? 'passed' : score >= 60 ? 'action-required' : 'failed'

    await supabase.from('inspections').update({ status, score, passed, failed, pending: 0 }).eq('id', activeInspection.id)
    setView('list')
    fetchInspections()
  }

  function scoreColor(score) {
    if (score >= 80) return 'var(--green)'
    if (score >= 60) return 'var(--amber)'
    return 'var(--red)'
  }

  function statusPill(status) {
    const map = {
      'passed': { bg: '#f0fdf4', text: '#10b981', label: '✓ Passed' },
      'failed': { bg: '#fef2f2', text: '#ef4444', label: '✗ Failed' },
      'action-required': { bg: '#fffbeb', text: '#f59e0b', label: '⚠ Action Req.' },
      'in-progress': { bg: '#eff6ff', text: '#3b82f6', label: '● In Progress' },
    }
    const s = map[status] || map['in-progress']
    return (
      <span style={{ background: s.bg, color: s.text, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
        {s.label}
      </span>
    )
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>

  // ── ACTIVE INSPECTION VIEW ──
  if (view === 'active' && activeInspection) {
    const passed = items.filter(i => i.result === 'pass').length
    const failed = items.filter(i => i.result === 'fail').length
    const pending = items.filter(i => i.result === 'pending').length
    const score = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">Active Inspection</h1>
            <p className="page-sub">{activeInspection.date} · {activeInspection.location} · {activeInspection.supervisor}</p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => { setView('list'); fetchInspections() }}>Save & Exit</button>
            <button className="btn btn-primary" onClick={submitInspection}>Submit Report</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* CHECKLIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: item.result === 'pass' ? 'var(--green-light)' : item.result === 'fail' ? 'var(--red-light)' : 'var(--surface)',
                border: `1px solid ${item.result === 'pass' ? 'rgba(52,199,89,0.25)' : item.result === 'fail' ? 'rgba(255,59,48,0.25)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.sub}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setResult(item.id, item.result === 'pass' ? 'pending' : 'pass')}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: item.result === 'pass' ? 'var(--green)' : 'var(--green-light)', color: item.result === 'pass' ? '#fff' : 'var(--green)' }}>
                    ✓ Pass
                  </button>
                  <button onClick={() => setResult(item.id, item.result === 'fail' ? 'pending' : 'fail')}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: item.result === 'fail' ? 'var(--red)' : 'var(--red-light)', color: item.result === 'fail' ? '#fff' : 'var(--red)' }}>
                    ✗ Fail
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SCORE PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Score</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(score), letterSpacing: '-3px', lineHeight: 1 }}>{score}%</div>
              <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              {[
                { label: '✓ Pass', value: passed, color: 'var(--green)' },
                { label: '✗ Fail', value: failed, color: 'var(--red)' },
                { label: '○ Pending', value: pending, color: 'var(--text-3)' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Site Inspections</h1>
          <p className="page-sub">Daily checklists · NS OHS Act compliant · Auto-scored</p>
        </div>
        <div className="page-actions">
          <ExportPDFButton moduleKey="inspections" rows={inspections} />
          <button className="btn btn-primary" onClick={() => setView('new')}>+ Start Inspection</button>
        </div>
      </div>

      {/* NEW INSPECTION FORM */}
      {view === 'new' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('list')}>
          <div className="modal">
            <div className="modal-title">New Inspection</div>
            <div className="modal-sub">Start a NS OHS compliant daily site checklist</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor</label>
                <input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Building A, North face" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
              <button className="btn btn-primary" onClick={startInspection} disabled={saving}>
                {saving ? 'Starting...' : 'Start Inspection →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTIONS TABLE */}
      <div className="table-wrap">
        {inspections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">No inspections yet</div>
            <div className="empty-sub">Click "+ Start Inspection" to begin your first daily checklist</div>
          </div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Supervisor</th>
                <th>Score</th>
                <th>Pass</th>
                <th>Fail</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(ins => (
                <tr key={ins.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{ins.date}</td>
                  <td>{ins.location}</td>
                  <td>{ins.supervisor}</td>
                  <td>
                    <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(ins.score || 0) }}>{ins.score || 0}%</span>
                  </td>
                  <td><span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>✓ {ins.passed || 0}</span></td>
                  <td><span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>✗ {ins.failed || 0}</span></td>
                  <td>{statusPill(ins.status)}</td>
                  <td>
                    {ins.status === 'in-progress' && (
                      <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => resumeInspection(ins)}>Resume →</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}