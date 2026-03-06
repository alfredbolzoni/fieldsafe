import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Active Inspection</h2>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              {activeInspection.date} · {activeInspection.location} · {activeInspection.supervisor}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setView('list'); fetchInspections() }}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}>
              Save & Exit
            </button>
            <button onClick={submitInspection}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
              Submit Report
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* CHECKLIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: item.result === 'pass' ? '#f0fdf4' : item.result === 'fail' ? '#fef2f2' : '#fff',
                border: `1px solid ${item.result === 'pass' ? '#bbf7d0' : item.result === 'fail' ? '#fecaca' : '#e5e7eb'}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{item.sub}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setResult(item.id, item.result === 'pass' ? 'pending' : 'pass')}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: item.result === 'pass' ? '#10b981' : '#f0fdf4', color: item.result === 'pass' ? '#fff' : '#10b981' }}>
                    ✓ Pass
                  </button>
                  <button onClick={() => setResult(item.id, item.result === 'fail' ? 'pending' : 'fail')}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: item.result === 'fail' ? '#ef4444' : '#fef2f2', color: item.result === 'fail' ? '#fff' : '#ef4444' }}>
                    ✗ Fail
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* SCORE PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Score</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(score), letterSpacing: '-3px', lineHeight: 1 }}>{score}%</div>
              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              {[
                { label: '✅ Pass', value: passed, color: '#10b981' },
                { label: '❌ Fail', value: failed, color: '#ef4444' },
                { label: '○ Pending', value: pending, color: '#9ca3af' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none' }}>
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
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Site Inspections</h2>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Daily checklists · NS OHS Act compliant · Auto-scored</p>
        </div>
        <button onClick={() => setView('new')}
          style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
          + Start Inspection
        </button>
      </div>

      {/* NEW INSPECTION FORM */}
      {view === 'new' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>New Inspection</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Date</label>
              <input type='date' value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Supervisor</label>
              <input value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })}
                placeholder='Full name'
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder='e.g. Building A, North face'
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView('list')}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}>
              Cancel
            </button>
            <button onClick={startInspection} disabled={saving}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
              {saving ? 'Starting...' : 'Start Inspection →'}
            </button>
          </div>
        </div>
      )}

      {/* INSPECTIONS TABLE */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {inspections.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No inspections yet</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Click "+ Start Inspection" to begin your first daily checklist</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Date', 'Location', 'Supervisor', 'Score', 'Pass', 'Fail', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspections.map(ins => (
                <tr key={ins.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace' }}>{ins.date}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{ins.location}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{ins.supervisor}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(ins.score || 0) }}>{ins.score || 0}%</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>✓ {ins.passed || 0}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>✗ {ins.failed || 0}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>{statusPill(ins.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}