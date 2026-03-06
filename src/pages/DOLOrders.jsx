import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const ORDER_TYPES = ['Compliance Order', 'Stop Work Order', 'Improvement Order', 'Prohibition Order', 'Administrative Penalty', 'Inspection Report']

export default function DOLOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [updateTarget, setUpdateTarget] = useState(null)
  const [updateText, setUpdateText] = useState('')
  const [tab, setTab] = useState('open')

  const emptyForm = {
    order_date: new Date().toISOString().split('T')[0],
    order_number: '', officer_name: '', order_type: 'Compliance Order',
    description: '', compliance_required_by: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('dol_orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.order_number || !form.officer_name || !form.description || !form.compliance_required_by) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('dol_orders').insert([{ ...form, user_id: user.id }])
    setForm(emptyForm); setShowForm(false); setSubmitting(false); fetchAll()
  }

  async function handleComply(id) {
    if (!updateText) { alert('Enter compliance notes'); return }
    await supabase.from('dol_orders').update({
      compliance_notes: updateText,
      compliance_date: new Date().toISOString().split('T')[0],
      status: 'complied'
    }).eq('id', id)
    setUpdateTarget(null); setUpdateText(''); fetchAll()
  }

  function isOverdue(date) { return new Date(date) < new Date() }

  const open = orders.filter(o => o.status === 'open')
  const overdue = open.filter(o => isOverdue(o.compliance_required_by))
  const stopWork = open.filter(o => o.order_type === 'Stop Work Order')

  const filtered = tab === 'open' ? open
    : tab === 'complied' ? orders.filter(o => o.status === 'complied')
    : orders

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Department of Labour Orders</h1>
          <p className="page-sub">NS OHS Officer orders · Must be posted at workplace · NS OHS Act §56</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowForm(true) }}>+ Log Order</button>
      </div>

      <div className="alert alert-warn" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act §56 — Employer Obligations</div>
          <div className="alert-body">All orders from NS OHS Officers must be posted at the workplace with the notice of compliance. Stop Work Orders must be obeyed immediately. Non-compliance is a serious offence.</div>
        </div>
      </div>

      {stopWork.length > 0 && (
        <div style={{ background: 'var(--red-light)', border: '2px solid var(--red)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', marginBottom: 4 }}>🛑 STOP WORK ORDER IN EFFECT</div>
          <div style={{ fontSize: 12, color: 'var(--red)' }}>Work in affected areas must cease immediately until compliance is confirmed with NS Department of Labour.</div>
        </div>
      )}

      {overdue.length > 0 && (
        <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>⚠ {overdue.length} Order{overdue.length > 1 ? 's' : ''} Past Compliance Deadline — Contact NS OHS: 1-800-952-2687</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Orders', value: orders.length, color: 'var(--primary)', delta: 'All time' },
          { label: 'Open', value: open.length, color: open.length > 0 ? 'var(--amber)' : 'var(--green)', delta: 'Pending compliance' },
          { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? 'var(--red)' : 'var(--green)', delta: 'Past deadline' },
          { label: 'Stop Work', value: stopWork.length, color: stopWork.length > 0 ? 'var(--red)' : 'var(--green)', delta: 'Active' },
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
          { id: 'open', label: `Open (${open.length})` },
          { id: 'complied', label: `Complied (${orders.filter(o => o.status === 'complied').length})` },
          { id: 'all', label: `All (${orders.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="table-wrap"><div className="empty-state">
            <div className="empty-icon">✓</div>
            <div className="empty-title">No orders recorded</div>
            <div className="empty-sub">Log any orders received from NS Department of Labour OHS Officers</div>
          </div></div>
        ) : filtered.map(order => {
          const isExpanded = expandedId === order.id
          const od = order.status === 'open' && isOverdue(order.compliance_required_by)
          const isStop = order.order_type === 'Stop Work Order'
          return (
            <div key={order.id} style={{ background: 'var(--surface)', border: `1px solid ${isStop && order.status === 'open' ? 'var(--red)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▼' : '▶'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{order.order_number}</span>
                    <span className={`pill ${isStop ? 'pill-red' : 'pill-blue'}`}>{order.order_type}</span>
                    <span className={`pill ${order.status === 'complied' ? 'pill-green' : od ? 'pill-red' : 'pill-amber'}`}>{order.status === 'complied' ? 'Complied' : od ? 'Overdue' : 'Open'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                    Officer: <b>{order.officer_name}</b> · Issued: {order.order_date} · Comply by: <span style={{ color: od ? 'var(--red)' : 'inherit', fontWeight: od ? 700 : 400 }}>{order.compliance_required_by}</span>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, lineHeight: 1.6, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 6, marginBottom: 12 }}>{order.description}</div>
                  {order.compliance_notes && (
                    <div style={{ background: 'var(--green-light)', borderLeft: '3px solid var(--green)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>Complied: {order.compliance_date}</div>
                      <div style={{ fontSize: 12 }}>{order.compliance_notes}</div>
                    </div>
                  )}
                  {order.status === 'open' && updateTarget !== `comply_${order.id}` && (
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => { setUpdateTarget(`comply_${order.id}`); setUpdateText('') }}>Record Compliance</button>
                  )}
                  {updateTarget === `comply_${order.id}` && (
                    <div>
                      <textarea className="form-input" value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Describe actions taken to comply..." style={{ minHeight: 80, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => handleComply(order.id)}>Mark Complied</button>
                        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setUpdateTarget(null)}>Cancel</button>
                      </div>
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
          <div className="modal" style={{ width: 580 }}>
            <div className="modal-title">Log DOL Order</div>
            <div className="modal-sub">NS OHS Act §56 — must be posted at the workplace</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Order Number *</label><input className="form-input" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} placeholder="e.g. 2025-NS-12345" /></div>
              <div className="form-group"><label className="form-label">Order Type</label><select className="form-input" value={form.order_type} onChange={e => setForm({ ...form, order_type: e.target.value })}>{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">OHS Officer Name *</label><input className="form-input" value={form.officer_name} onChange={e => setForm({ ...form, officer_name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Order Date</label><input type="date" className="form-input" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">Order Description *</label><textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does the order require?" style={{ minHeight: 90 }} /></div>
            <div className="form-group"><label className="form-label">Comply By *</label><input type="date" className="form-input" value={form.compliance_required_by} onChange={e => setForm({ ...form, compliance_required_by: e.target.value })} /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Log Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}