import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

// ── NS OHS Act compliant checklist ─────────────────────────────────────────
const CHECKLIST = [
  // PPE & Personal Safety
  { id: 'ppe1', category: 'PPE & Personal Safety', label: 'Hard hats worn by all workers on site', sub: 'Full brim or standard — mandatory on active construction sites', ref: 'NS OHS §89' },
  { id: 'ppe2', category: 'PPE & Personal Safety', label: 'High-visibility vests worn near mobile equipment or traffic', sub: 'Class 2 minimum in traffic control zones', ref: 'NS OHS §89' },
  { id: 'ppe3', category: 'PPE & Personal Safety', label: 'Fall protection harnesses worn at heights >3m', sub: 'Full-body harness, double lanyard, shock-absorbing device', ref: 'NS OHS §85' },
  { id: 'ppe4', category: 'PPE & Personal Safety', label: 'Safety footwear worn by all workers', sub: 'CSA Grade 1 steel-toe, puncture-resistant where required', ref: 'NS OHS §89' },
  { id: 'ppe5', category: 'PPE & Personal Safety', label: 'Eye and face protection in use where required', sub: 'Grinding, cutting, chemical handling, spray operations', ref: 'NS OHS §90' },

  // Fall Protection & Scaffolding
  { id: 'fp1', category: 'Fall Protection & Scaffolding', label: 'Guardrails on all elevated work platforms >1.2m', sub: 'Top rail 900–1100mm, mid-rail, toe board — load-rated', ref: 'NS OHS §85' },
  { id: 'fp2', category: 'Fall Protection & Scaffolding', label: 'Scaffold inspected by competent worker before use today', sub: 'Bracing, planks, base plates, couplers, guardrails intact', ref: 'NS OHS §83' },
  { id: 'fp3', category: 'Fall Protection & Scaffolding', label: 'Ladders secured, extending 1m above landing, correct angle', sub: '4:1 angle rule — secured at top and/or bottom', ref: 'NS OHS §80' },
  { id: 'fp4', category: 'Fall Protection & Scaffolding', label: 'Anchor points rated and accessible for fall arrest', sub: 'Minimum 22kN load rating per worker attached', ref: 'NS OHS §85' },
  { id: 'fp5', category: 'Fall Protection & Scaffolding', label: 'Openings, floor holes, and excavation edges barricaded', sub: 'Hard barricades, not just tape — covers rated for loads', ref: 'NS OHS §85' },

  // Housekeeping & Site Access
  { id: 'hk1', category: 'Housekeeping & Site Access', label: 'Emergency exits and egress routes clear (min. 914mm)', sub: 'No materials, equipment, or debris blocking exits', ref: 'NS OHS §73' },
  { id: 'hk2', category: 'Housekeeping & Site Access', label: 'Site free from trip hazards, spills, and debris', sub: 'Cords managed, scrap removed, wet surfaces marked', ref: 'NS OHS §13' },
  { id: 'hk3', category: 'Housekeeping & Site Access', label: 'Materials stored safely — not blocking access, properly stacked', sub: 'Unstable stacks braced, flammables segregated', ref: 'NS OHS §13' },
  { id: 'hk4', category: 'Housekeeping & Site Access', label: 'Signage and barricades in place around hazardous areas', sub: 'Excavations, overhead work zones, restricted areas clearly marked', ref: 'NS OHS §13' },

  // Emergency Preparedness
  { id: 'em1', category: 'Emergency Preparedness', label: 'First aid kit stocked and accessible', sub: 'Contents per NS First Aid Regulations — expiry dates checked', ref: 'NS First Aid Regs' },
  { id: 'em2', category: 'Emergency Preparedness', label: 'First aider on site and their name posted', sub: 'Valid NS first aid certificate — must be present during work hours', ref: 'NS First Aid Regs §6' },
  { id: 'em3', category: 'Emergency Preparedness', label: 'Fire extinguisher accessible, charged, and in date', sub: 'Annual inspection tag present, pressure gauge in green zone', ref: 'NS OHS §13' },
  { id: 'em4', category: 'Emergency Preparedness', label: 'Emergency contact numbers and muster point posted', sub: 'Fire, ambulance, site emergency contacts, site address visible', ref: 'NS OHS §28' },

  // Hazardous Materials (WHMIS 2015)
  { id: 'wh1', category: 'Hazardous Materials (WHMIS 2015)', label: 'SDS binder current and accessible for all hazardous products on site', sub: 'SDS for every controlled product in use — current version', ref: 'NS WHMIS Regs §5' },
  { id: 'wh2', category: 'Hazardous Materials (WHMIS 2015)', label: 'All containers properly labelled (WHMIS 2015)', sub: 'GHS-style label with pictograms, signal word, hazard statements', ref: 'NS WHMIS Regs §4' },
  { id: 'wh3', category: 'Hazardous Materials (WHMIS 2015)', label: 'Hazardous waste stored and segregated correctly', sub: 'Labelled containers, secondary containment, no incompatible mixing', ref: 'NS WHMIS Regs' },

  // Equipment & Tools
  { id: 'eq1', category: 'Equipment & Tools', label: 'Pre-use inspection completed for all powered tools and equipment', sub: 'Guards intact, no visible damage, cords undamaged', ref: 'NS OHS §92' },
  { id: 'eq2', category: 'Equipment & Tools', label: 'Spotter assigned for mobile equipment in congested areas', sub: 'Forklift, bobcat, crane — spotter in visual contact at all times', ref: 'NS OHS §91' },
  { id: 'eq3', category: 'Equipment & Tools', label: 'Defective tools removed from service and tagged out', sub: '"DO NOT USE" tag attached — no workarounds permitted', ref: 'NS OHS §94' },
  { id: 'eq4', category: 'Equipment & Tools', label: 'Lockout/tagout procedures in use where required', sub: 'Energy isolation verified before maintenance or repair work', ref: 'NS OHS §95' },

  // Safety Administration
  { id: 'sa1', category: 'Safety Administration', label: 'Site Safety Plan accessible on-site', sub: 'Current version, signed, relevant to today\'s scope of work', ref: 'NS OHS §29' },
  { id: 'sa2', category: 'Safety Administration', label: 'Toolbox talk completed — sign-in sheet done', sub: 'Daily safety topic communicated to all workers before work begins', ref: 'NS OHS §13' },
  { id: 'sa3', category: 'Safety Administration', label: 'JSA / pre-task analysis completed for high-risk work', sub: 'Working at heights, confined space, excavation, hot work', ref: 'NS OHS §29' },
  { id: 'sa4', category: 'Safety Administration', label: 'Visitor and contractor sign-in log current', sub: 'All non-employees signed in, briefed on site hazards and emergency procedures', ref: 'NS OHS §13' },
]

const CATEGORIES = [...new Set(CHECKLIST.map(i => i.category))]

const INSPECTION_TYPES = [
  { id: 'daily',    label: 'Daily Site Inspection',        sub: 'Standard daily pre-work walkthrough' },
  { id: 'monthly',  label: 'Monthly Workplace Inspection', sub: 'Required JOHSC/HSR monthly inspection — NS OHS §29' },
  { id: 'pretask',  label: 'Pre-task / High-Risk Work',    sub: 'Before high-risk activities (heights, confined space, excavation)' },
]

export default function Inspections() {
  const [view, setView] = useState('list')
  const [inspections, setInspections] = useState([])
  const [activeInspection, setActiveInspection] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [noteInputs, setNoteInputs] = useState({})   // { itemId: string }
  const [detailInspection, setDetailInspection] = useState(null)
  const [detailItems, setDetailItems] = useState([])
  const [detailItemNotes, setDetailItemNotes] = useState({})
  const [kpiFilter, setKpiFilter] = useState(null)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    supervisor: '',
    location: '',
    inspection_type: 'daily',
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
      .insert([{ ...form, user_id: user.id, status: 'in-progress', passed: 0, failed: 0, pending: CHECKLIST.length, score: 0 }])
      .select()
      .single()

    const itemsToInsert = CHECKLIST.map(item => ({
      inspection_id: inspection.id,
      label: item.label,
      sub: item.sub,
      category: item.category,
      ref: item.ref,
      result: 'pending',
      user_id: user.id,
      note: '',
    }))
    await supabase.from('inspection_items').insert(itemsToInsert)

    setSaving(false)
    setActiveInspection(inspection)
    await fetchInspection(inspection.id)
    setView('active')
    fetchInspections()
  }

  async function fetchInspection(id) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', id)
      .eq('user_id', user.id)
    setItems(data || [])
  }

  async function resumeInspection(ins) {
    setActiveInspection(ins)
    await fetchInspection(ins.id)
    setView('active')
  }

  async function closeInspection(id) {
    await supabase.from('inspections').update({ status: 'completed' }).eq('id', id)
    fetchInspections()
  }

  async function openDetailModal(ins) {
    setDetailInspection(ins)
    setDetailItems([])
    setDetailItemNotes({})
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', ins.id)
      .eq('user_id', user.id)
      .order('category')
    setDetailItems(data || [])
  }

  async function saveDetailItemNote(itemId) {
    const note = detailItemNotes[itemId] ?? detailItems.find(i => i.id === itemId)?.note ?? ''
    await supabase.from('inspection_items').update({ note }).eq('id', itemId)
    setDetailItems(prev => prev.map(i => i.id === itemId ? { ...i, note } : i))
  }

  function handlePrintInspection(ins, insItems) {
    const passed  = insItems.filter(i => i.result === 'pass').length
    const failed  = insItems.filter(i => i.result === 'fail').length
    const failedItems = insItems.filter(i => i.result === 'fail')
    const w = window.open('', '_blank', 'width=820,height=700')
    w.document.write(`<!DOCTYPE html><html><head><title>Inspection Report — ${ins.date}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:14px}
      h1{font-size:22px;margin:0 0 4px}
      .meta{color:#666;font-size:13px;margin-bottom:28px}
      h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#555;border-bottom:1px solid #ddd;padding-bottom:5px;margin:24px 0 12px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
      .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px}
      .value{font-size:14px;font-weight:600}
      .score-box{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px;background:#f5f5f5;border-radius:8px;text-align:center;margin-bottom:8px}
      .score-num{font-size:32px;font-weight:800}
      .score-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:4px}
      th{text-align:left;padding:6px 8px;background:#f0f0f0;font-size:11px}
      td{padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top}
      .item-fail{background:#fff5f5;border-left:3px solid #dc2626}
      .note{font-size:11px;color:#888;font-style:italic;margin-top:3px}
      .footer{margin-top:40px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#aaa;text-align:center}
      @media print{body{padding:20px}}
    </style></head><body>
    <h1>Site Inspection Report</h1>
    <div class="meta">${typeLabel(ins.inspection_type)} &middot; ${ins.date} &middot; ${ins.location} &middot; Supervisor: ${ins.supervisor}</div>
    <h2>Summary</h2>
    <div class="score-box">
      <div><div class="score-num" style="color:${(ins.score||0)>=80?'#16a34a':(ins.score||0)>=60?'#d97706':'#dc2626'}">${ins.score||0}%</div><div class="score-lbl">Score</div></div>
      <div><div class="score-num" style="color:#16a34a">${ins.passed||0}</div><div class="score-lbl">Passed</div></div>
      <div><div class="score-num" style="color:${(ins.failed||0)>0?'#dc2626':'#9ca3af'}">${ins.failed||0}</div><div class="score-lbl">Failed</div></div>
    </div>
    <div class="grid" style="margin-top:12px">
      <div><div class="label">Inspector</div><div class="value">${ins.supervisor}</div></div>
      <div><div class="label">Location</div><div class="value">${ins.location}</div></div>
      <div><div class="label">Date</div><div class="value">${ins.date}</div></div>
      <div><div class="label">Status</div><div class="value">${ins.status}</div></div>
    </div>
    ${failedItems.length > 0 ? `
    <h2>Failed Items (${failedItems.length})</h2>
    <table><thead><tr><th>Category</th><th>Item</th><th>Note / Deficiency</th></tr></thead><tbody>
      ${failedItems.map(it => `<tr class="item-fail">
        <td style="font-size:11px;color:#666">${it.category||''}</td>
        <td><b>${it.label}</b>${it.sub?`<div class="note">${it.sub}</div>`:''}</td>
        <td class="note">${it.note||'—'}</td>
      </tr>`).join('')}
    </tbody></table>` : ''}
    ${insItems.length > 0 ? `
    <h2>Full Checklist (${insItems.length} items)</h2>
    <table><thead><tr><th>Category</th><th>Item</th><th>Result</th><th>Note</th></tr></thead><tbody>
      ${insItems.map(it => `<tr style="${it.result==='fail'?'background:#fff5f5':it.result==='pass'?'background:#f0fff4':''}">
        <td style="font-size:11px;color:#666">${it.category||''}</td>
        <td>${it.label}</td>
        <td style="font-weight:700;color:${it.result==='pass'?'#16a34a':it.result==='fail'?'#dc2626':'#9ca3af'}">${it.result==='pass'?'PASS':it.result==='fail'?'FAIL':it.result==='na'?'N/A':'PENDING'}</td>
        <td class="note">${it.note||''}</td>
      </tr>`).join('')}
    </tbody></table>` : '<p style="color:#888;font-style:italic">No checklist items on record for this inspection.</p>'}
    <div class="footer">FieldSafe HSE Management System &middot; Generated ${new Date().toLocaleDateString()}</div>
    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
    w.document.close()
  }

  async function setResult(itemId, result) {
    await supabase.from('inspection_items').update({ result }).eq('id', itemId)
    const updated = items.map(i => i.id === itemId ? { ...i, result } : i)
    setItems(updated)
    await syncScore(updated)
  }

  async function saveNote(itemId) {
    const note = noteInputs[itemId] ?? ''
    await supabase.from('inspection_items').update({ note }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, note } : i))
  }

  async function syncScore(updatedItems) {
    const passed  = updatedItems.filter(i => i.result === 'pass').length
    const failed  = updatedItems.filter(i => i.result === 'fail').length
    const pending = updatedItems.filter(i => i.result === 'pending').length
    const scored  = passed + failed
    const score   = scored > 0 ? Math.round((passed / scored) * 100) : 0
    await supabase.from('inspections').update({ passed, failed, pending, score }).eq('id', activeInspection.id)
    setActiveInspection(prev => ({ ...prev, passed, failed, pending, score }))
  }

  async function submitInspection() {
    const passed  = items.filter(i => i.result === 'pass').length
    const failed  = items.filter(i => i.result === 'fail').length
    const scored  = passed + failed
    const score   = scored > 0 ? Math.round((passed / scored) * 100) : 0
    const status  = failed === 0 ? 'passed' : score >= 80 ? 'passed' : score >= 60 ? 'action-required' : 'failed'

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
      'passed':          { cls: 'pill-green', label: '✓ Passed' },
      'completed':       { cls: 'pill-green', label: '✓ Completed' },
      'failed':          { cls: 'pill-red',   label: '✗ Failed' },
      'action-required': { cls: 'pill-amber', label: '⚠ Actions Required' },
      'in-progress':     { cls: 'pill-blue',  label: '● In Progress' },
      'in_progress':     { cls: 'pill-blue',  label: '● In Progress' },
    }
    const s = map[status] || { cls: 'pill-blue', label: '● In Progress' }
    return <span className={`pill ${s.cls}`}>{s.label}</span>
  }

  function typeLabel(type) {
    return INSPECTION_TYPES.find(t => t.id === type)?.label || 'Daily Site Inspection'
  }

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  // ── ACTIVE INSPECTION VIEW ────────────────────────────────────────────────
  if (view === 'active' && activeInspection) {
    const passed  = items.filter(i => i.result === 'pass').length
    const failed  = items.filter(i => i.result === 'fail').length
    const na      = items.filter(i => i.result === 'na').length
    const pending = items.filter(i => i.result === 'pending').length
    const scored  = passed + failed
    const score   = scored > 0 ? Math.round((passed / scored) * 100) : 0
    const allDone = items.length > 0 && pending === 0

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">Active Inspection</h1>
            <p className="page-sub">
              {typeLabel(activeInspection.inspection_type)} · {activeInspection.date} · {activeInspection.location} · {activeInspection.supervisor}
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => { setView('list'); fetchInspections() }}>Save & Exit</button>
            <button className="btn btn-primary" onClick={submitInspection} disabled={!allDone} title={!allDone ? `${pending} items still pending` : ''}>
              {allDone ? 'Submit Report' : `${pending} Pending…`}
            </button>
          </div>
        </div>

        {/* RECOVERY BANNER — inspection exists but has no items (e.g. created via seed/SQL) */}
        {items.length === 0 && (
          <div className="alert alert-warn" style={{ marginBottom: 16 }}>
            <div className="alert-title">⚠ This inspection has no checklist items.</div>
            <div className="alert-body" style={{ marginTop: 4 }}>
              This can happen with inspections imported or created outside the standard flow.<br />
              Click "Load Checklist" to generate the standard {CHECKLIST.length}-item checklist for this inspection,
              or mark it as Complete if the inspection was already conducted manually.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setSaving(true)
                  try {
                    const { data: { user } } = await supabase.auth.getUser()
                    const itemsToInsert = CHECKLIST.map(item => ({
                      inspection_id: activeInspection.id,
                      label: item.label,
                      sub: item.sub,
                      category: item.category,
                      ref: item.ref,
                      result: 'pending',
                      user_id: user.id,
                      note: '',
                    }))
                    const { error } = await supabase.from('inspection_items').insert(itemsToInsert)
                    if (error) throw error
                    await fetchInspection(activeInspection.id)
                  } catch (err) {
                    alert('Failed to load checklist: ' + (err.message || 'Unknown error'))
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}>
                {saving ? 'Loading…' : 'Load Checklist'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('inspections')
                      .update({ status: 'completed' })
                      .eq('id', activeInspection.id)
                    if (error) throw error
                    setView('list')
                    fetchInspections()
                  } catch (err) {
                    alert('Failed to update status: ' + (err.message || 'Unknown error'))
                  }
                }}
                disabled={saving}>
                Mark as Complete
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setView('list'); fetchInspections() }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 280px', gap: 20, alignItems: 'start' }}>

          {/* CHECKLIST BY CATEGORY */}
          {(() => {
            // Derive categories from DB items — supports old inspections with different labels
            const getItemCategory = i => i.category || CHECKLIST.find(c => c.label === i.label)?.category || 'Other'
            const getItemRef      = i => i.ref      || CHECKLIST.find(c => c.label === i.label)?.ref      || ''
            const activeCategories = [...new Set(items.map(getItemCategory))]

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeCategories.map(cat => {
                  const catItems = items.filter(i => getItemCategory(i) === cat)
                  const catFailed  = catItems.filter(i => i.result === 'fail').length
                  const catPending = catItems.filter(i => i.result === 'pending').length

                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{cat}</div>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <div style={{ fontSize: 10, color: catFailed > 0 ? 'var(--red)' : catPending > 0 ? 'var(--text-3)' : 'var(--green)', fontWeight: 600 }}>
                          {catPending > 0 ? `${catPending} pending` : catFailed > 0 ? `${catFailed} failed` : '✓ complete'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {catItems.map(item => {
                          const isFail = item.result === 'fail'
                          const isPass = item.result === 'pass'
                          const isNA   = item.result === 'na'
                          const ref    = getItemRef(item)
                          const noteVal = noteInputs[item.id] !== undefined ? noteInputs[item.id] : (item.note || '')

                          return (
                            <div key={item.id} style={{
                              background: isPass ? 'var(--green-light)' : isFail ? 'var(--red-light)' : isNA ? 'var(--surface-2)' : 'var(--surface)',
                              border: `1px solid ${isPass ? 'rgba(52,199,89,0.2)' : isFail ? 'rgba(255,59,48,0.2)' : 'var(--border)'}`,
                              borderLeft: `3px solid ${isPass ? 'var(--green)' : isFail ? 'var(--red)' : isNA ? 'var(--border-strong)' : 'var(--border)'}`,
                              borderRadius: 8, padding: '10px 14px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: isNA ? 'var(--text-3)' : 'var(--text-1)' }}>{item.label}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                    {item.sub}
                                    {ref && <span style={{ marginLeft: 6, color: 'var(--primary)', fontWeight: 600 }}>{ref}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                  <button
                                    onClick={() => setResult(item.id, isPass ? 'pending' : 'pass')}
                                    style={{ padding: '4px 11px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: isPass ? 'var(--green)' : 'var(--green-light)', color: isPass ? '#fff' : 'var(--green)' }}>
                                    ✓ Pass
                                  </button>
                                  <button
                                    onClick={() => setResult(item.id, isFail ? 'pending' : 'fail')}
                                    style={{ padding: '4px 11px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: isFail ? 'var(--red)' : 'var(--red-light)', color: isFail ? '#fff' : 'var(--red)' }}>
                                    ✗ Fail
                                  </button>
                                  <button
                                    onClick={() => setResult(item.id, isNA ? 'pending' : 'na')}
                                    style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${isNA ? 'var(--border-strong)' : 'var(--border)'}`, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: isNA ? 'var(--surface-2)' : 'transparent', color: isNA ? 'var(--text-2)' : 'var(--text-3)' }}>
                                    N/A
                                  </button>
                                </div>
                              </div>

                              {/* Fail note */}
                              {isFail && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                  <textarea
                                    style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', resize: 'vertical', minHeight: 48, fontFamily: 'inherit' }}
                                    placeholder="Describe the deficiency and immediate action taken…"
                                    value={noteVal}
                                    onChange={e => setNoteInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  />
                                  <button
                                    className="btn btn-ghost"
                                    style={{ padding: '5px 12px', fontSize: 11, flexShrink: 0 }}
                                    onClick={() => saveNote(item.id)}>
                                    Save note
                                  </button>
                                </div>
                              )}
                              {!isFail && item.note && (
                                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Note: {item.note}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* SCORE SIDEBAR */}
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Score</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: scoreColor(score), letterSpacing: '-2px', lineHeight: 1 }}>{score}%</div>
              <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8 }}>
                {scored === 0 ? 'No items scored yet' : score >= 80 ? 'Acceptable — note all fails' : score >= 60 ? 'Actions required before proceeding' : 'Site conditions unacceptable'}
              </div>
            </div>

            <div className="card" style={{ padding: '14px 16px' }}>
              {[
                { label: '✓ Pass',    value: passed,  color: 'var(--green)' },
                { label: '✗ Fail',    value: failed,  color: 'var(--red)' },
                { label: '— N/A',     value: na,      color: 'var(--text-3)' },
                { label: '○ Pending', value: pending, color: 'var(--amber)' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {failed > 0 && (
              <div className="alert alert-warn" style={{ padding: '10px 14px' }}>
                <div className="alert-title" style={{ fontSize: 12 }}>⚠ {failed} Failed Item{failed > 1 ? 's' : ''}</div>
                <div className="alert-body" style={{ fontSize: 11, marginTop: 4 }}>Add notes for each failure. Create corrective actions after submitting.</div>
              </div>
            )}

            {allDone && failed === 0 && (
              <div className="alert alert-info" style={{ padding: '10px 14px' }}>
                <div className="alert-title" style={{ fontSize: 12 }}>All items reviewed — ready to submit</div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Site Inspections</h1>
          <p className="page-sub">NS OHS Act compliant checklists · {CHECKLIST.length} items across {CATEGORIES.length} categories · Auto-scored</p>
        </div>
        <div className="page-actions">
          <ExportPDFButton moduleKey="inspections" rows={inspections} />
          <button className="btn btn-primary" onClick={() => setView('new')}>+ Start Inspection</button>
        </div>
      </div>

      {/* KPI ROW */}
      {inspections.length > 0 && (() => {
        const kpiInProgress = inspections.filter(i => i.status === 'in-progress' || i.status === 'in_progress').length
        const kpiPassed = inspections.filter(i =>
          (i.status === 'completed' || i.status === 'passed') &&
          (!i.failed || i.failed === 0)
        ).length
        const kpiActions = inspections.filter(i => i.status === 'action-required').length
        const kpiFailed = inspections.filter(i => i.status === 'failed').length
        return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Inspections', value: inspections.length, color: 'var(--primary)', delta: `${kpiInProgress} in progress`, filter: null },
            { label: 'Passed', value: kpiPassed, color: 'var(--green)', delta: 'Score ≥ 80% · no fails', filter: 'passed' },
            { label: 'Actions Required', value: kpiActions, color: 'var(--amber)', delta: 'Failed items present', filter: 'actions' },
            { label: 'Failed', value: kpiFailed, color: 'var(--red)', delta: 'Score < 60%', filter: 'failed' },
          ].map((k, i) => {
            const active = kpiFilter === k.filter
            return (
              <div
                key={i}
                className="kpi-card"
                style={{ borderLeft: `3px solid ${k.color}`, cursor: 'pointer', outline: active ? `2px solid ${k.color}` : 'none', outlineOffset: 2 }}
                onClick={() => setKpiFilter(active ? null : k.filter)}
                title={active ? 'Click to clear filter' : 'Click to filter'}
              >
                <div className="kpi-label">{k.label}{active ? ' ✕' : ''}</div>
                <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
                <div className="kpi-delta">{k.delta}</div>
              </div>
            )
          })}
        </div>
        )
      })()}

      {/* NEW INSPECTION MODAL */}
      {view === 'new' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setView('list')}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-title">New Inspection</div>
            <div className="modal-sub">NS OHS compliant site checklist — {CHECKLIST.length} items across {CATEGORIES.length} categories</div>

            <div className="form-group">
              <label className="form-label">Inspection Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {INSPECTION_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, inspection_type: t.id })}
                    style={{
                      padding: '10px 14px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${form.inspection_type === t.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.inspection_type === t.id ? 'rgba(var(--primary-rgb),0.06)' : 'transparent',
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.inspection_type === t.id ? 'var(--primary)' : 'var(--text-1)' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supervisor *</label>
                <input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location *</label>
                <input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Building A" />
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-3)' }}>
              This inspection will load <b style={{ color: 'var(--text-2)' }}>{CHECKLIST.length} checklist items</b> across {CATEGORIES.length} NS OHS categories. Items can be marked Pass / Fail / N/A. Failed items require a deficiency note.
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
              <button className="btn btn-primary" onClick={startInspection} disabled={saving}>
                {saving ? 'Creating…' : 'Start Inspection →'}
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
            <div className="empty-sub">Click "+ Start Inspection" to begin your first NS OHS compliant site checklist</div>
          </div>
        ) : (
          <>
          {kpiFilter && (
            <div style={{ padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>Filtering by: <b>{kpiFilter === 'passed' ? 'Passed (score ≥80%, no fails)' : kpiFilter === 'actions' ? 'Actions Required (failed items)' : 'Failed (score <60%)'}</b></span>
              <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setKpiFilter(null)}>Clear ✕</button>
            </div>
          )}
          <table className="fs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
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
              {inspections.filter(ins => {
                if (!kpiFilter) return true
                if (kpiFilter === 'passed') return ins.status === 'passed' || ins.status === 'completed'
                if (kpiFilter === 'actions') return ins.status === 'action-required'
                if (kpiFilter === 'failed') return ins.status === 'failed'
                return true
              }).map(ins => (
                <tr key={ins.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{ins.date}</td>
                  <td><span style={{ fontSize: 11, color: 'var(--text-2)' }}>{typeLabel(ins.inspection_type)}</span></td>
                  <td>{ins.location}</td>
                  <td>{ins.supervisor}</td>
                  <td>
                    <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(ins.score || 0) }}>{ins.score || 0}%</span>
                  </td>
                  <td><span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13 }}>✓ {ins.passed || 0}</span></td>
                  <td><span style={{ color: ins.failed > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: 700, fontSize: 13 }}>✗ {ins.failed || 0}</span></td>
                  <td>{statusPill(ins.status)}</td>
                  <td>
                    {(ins.status === 'in-progress' || ins.status === 'in_progress') && (
                      <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => resumeInspection(ins)}>
                        Resume →
                      </button>
                    )}
                    {(ins.status === 'action-required' || ins.status === 'failed') && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => openDetailModal(ins)}>
                          View →
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => closeInspection(ins.id)}>
                          Close
                        </button>
                      </div>
                    )}
                    {(ins.status === 'completed' || ins.status === 'passed') && (
                      <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => openDetailModal(ins)}>
                        View →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* INSPECTION DETAIL MODAL */}
      {detailInspection && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailInspection(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="modal-title" style={{ marginBottom: 4 }}>Inspection Report</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{typeLabel(detailInspection.inspection_type)}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 18, lineHeight: 1 }} onClick={() => setDetailInspection(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Date</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailInspection.date}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Supervisor</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailInspection.supervisor}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Location</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{detailInspection.location}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Status</div>
                <div>{statusPill(detailInspection.status)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(detailInspection.score || 0) }}>{detailInspection.score || 0}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>SCORE</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{detailInspection.passed || 0}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>PASSED</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: (detailInspection.failed || 0) > 0 ? 'var(--red)' : 'var(--text-3)' }}>{detailInspection.failed || 0}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>FAILED</div>
              </div>
            </div>

            {(detailInspection.failed || 0) > 0 && (
              <div className="alert alert-warn" style={{ marginBottom: 16, padding: '10px 14px' }}>
                <div className="alert-title" style={{ fontSize: 12 }}>⚠ {detailInspection.failed} failed item{detailInspection.failed > 1 ? 's' : ''} recorded</div>
                <div className="alert-body" style={{ fontSize: 11, marginTop: 2 }}>Review the inspection checklist for deficiency notes and corrective actions.</div>
              </div>
            )}

            {detailItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                  Checklist Items
                  {detailInspection.status === 'action-required' && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--amber)', fontWeight: 600, textTransform: 'none' }}>— add corrective action notes on failed items below</span>
                  )}
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                  {(() => {
                    const cats = [...new Set(detailItems.map(i => i.category))]
                    return cats.map(cat => (
                      <div key={cat}>
                        <div style={{ padding: '6px 10px', background: 'var(--surface-2)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>{cat}</div>
                        {detailItems.filter(i => i.category === cat).map(item => (
                          <div key={item.id} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', background: item.result === 'fail' ? 'rgba(220,38,38,0.04)' : 'transparent' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, color: item.result === 'pass' ? 'var(--green)' : item.result === 'fail' ? 'var(--red)' : item.result === 'na' ? 'var(--text-3)' : 'var(--amber)' }}>
                                {item.result === 'pass' ? 'PASS' : item.result === 'fail' ? 'FAIL' : item.result === 'na' ? 'N/A' : 'PEND'}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                                {item.result !== 'fail' && item.note && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>{item.note}</div>}
                              </div>
                            </div>
                            {item.result === 'fail' && (
                              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'flex-start', paddingLeft: 44 }}>
                                <textarea
                                  style={{ flex: 1, fontSize: 11, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', resize: 'vertical', minHeight: 44, fontFamily: 'inherit' }}
                                  placeholder="Corrective action taken / deficiency note…"
                                  value={detailItemNotes[item.id] !== undefined ? detailItemNotes[item.id] : (item.note || '')}
                                  onChange={e => setDetailItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                />
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 10px', fontSize: 10, flexShrink: 0 }}
                                  onClick={() => saveDetailItemNote(item.id)}
                                >
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
            {detailItems.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 16 }}>Loading checklist items…</div>
            )}

            <div className="modal-footer" style={{ paddingTop: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(detailInspection.status === 'action-required' || detailInspection.status === 'failed') && (
                  <button className="btn btn-secondary" onClick={() => { closeInspection(detailInspection.id); setDetailInspection(null) }}>
                    Mark as Closed
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => handlePrintInspection(detailInspection, detailItems)}>
                  Print / Export PDF
                </button>
              </div>
              <button className="btn btn-ghost" onClick={() => setDetailInspection(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
