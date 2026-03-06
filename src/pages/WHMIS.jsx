import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ExportPDFButton from '../ExportPDFButton'

const HAZARD_CLASSES = [
  'Flammable Liquid', 'Flammable Gas', 'Flammable Solid',
  'Oxidizing Liquid', 'Oxidizing Gas', 'Toxic', 'Corrosive',
  'Compressed Gas', 'Explosive', 'Biohazardous', 'Carcinogen',
  'Irritant / Sensitizer', 'Environmental Hazard', 'Other'
]

export default function WHMIS() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')

  const emptyForm = {
    product_name: '', manufacturer: '', location: '', hazard_class: 'Flammable Liquid',
    sds_date: '', sds_url: '', quantity: '', ppe_required: '',
    first_aid: '', storage_requirements: '', disposal_method: ''
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('whmis_products').select('*').eq('user_id', user.id).order('product_name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.product_name || !form.manufacturer || !form.location) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (editProduct) {
      await supabase.from('whmis_products').update({ ...form }).eq('id', editProduct.id)
    } else {
      await supabase.from('whmis_products').insert([{ ...form, user_id: user.id }])
    }
    setForm(emptyForm); setShowForm(false); setEditProduct(null); setSubmitting(false); fetchAll()
  }

  async function handleArchive(id) {
    await supabase.from('whmis_products').update({ status: 'archived' }).eq('id', id)
    fetchAll()
  }

  function isSdsExpired(date) {
    if (!date) return false
    return Math.floor((new Date() - new Date(date)) / (86400000 * 365)) >= 3
  }

  const active = products.filter(p => p.status === 'active')
  const expiredSDS = active.filter(p => isSdsExpired(p.sds_date)).length
  const filtered = active
    .filter(p => filterClass === 'all' || p.hazard_class === filterClass)
    .filter(p => !search || p.product_name.toLowerCase().includes(search.toLowerCase()) || p.manufacturer.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">WHMIS / SDS Register</h1>
          <p className="page-sub">Workplace Hazardous Materials · Safety Data Sheets · WHMIS 2015 GHS-aligned</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditProduct(null); setShowForm(true) }}>+ Add Product</button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">WHMIS 2015 — GHS Aligned</div>
          <div className="alert-body">All hazardous products must have a current Safety Data Sheet (SDS) on site. SDS must be reviewed every 3 years. Workers must be trained on all hazardous materials before starting work.</div>
        </div>
      </div>

      {expiredSDS > 0 && (
        <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>⚠ {expiredSDS} SDS Expired — Update Required</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Products', value: active.length, color: 'var(--primary)', delta: 'In WHMIS register' },
          { label: 'Hazard Classes', value: [...new Set(active.map(p => p.hazard_class))].length, color: 'var(--amber)', delta: 'Unique hazard types' },
          { label: 'SDS Expired', value: expiredSDS, color: expiredSDS > 0 ? 'var(--red)' : 'var(--green)', delta: 'Over 3 years old' },
          { label: 'Archived', value: products.filter(p => p.status === 'archived').length, color: 'var(--text-3)', delta: 'Historical' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ flex: 1, marginBottom: 0 }} />
        <select className="form-input" value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: 200, marginBottom: 0 }}>
          <option value="all">All Hazard Classes</option>
          {HAZARD_CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧪</div>
            <div className="empty-title">No products registered</div>
            <div className="empty-sub">Add all hazardous products used at your workplace</div>
          </div>
        ) : (
          <table className="fs-table">
            <thead>
              <tr>
                <th>Product</th><th>Manufacturer</th><th>Location</th><th>Hazard Class</th><th>PPE Required</th><th>SDS Date</th><th>SDS Link</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><div style={{ fontSize: 12, fontWeight: 600 }}>{p.product_name}</div></td>
                  <td style={{ fontSize: 12 }}>{p.manufacturer}</td>
                  <td style={{ fontSize: 12 }}>{p.location}</td>
                  <td><span className="pill pill-blue" style={{ fontSize: 10 }}>{p.hazard_class}</span></td>
                  <td style={{ fontSize: 11 }}>{p.ppe_required || '—'}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: isSdsExpired(p.sds_date) ? 'var(--red)' : 'var(--text-2)', fontWeight: isSdsExpired(p.sds_date) ? 700 : 400 }}>{p.sds_date || <span style={{ color: 'var(--red)' }}>Missing</span>}{isSdsExpired(p.sds_date) && ' ⚠'}</span></td>
                  <td>{p.sds_url ? <a href={p.sds_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--primary)' }}>View →</a> : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => { setForm({ ...p }); setEditProduct(p); setShowForm(true) }}>Edit</button>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => handleArchive(p.id)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ width: 620 }}>
            <div className="modal-title">{editProduct ? 'Edit Product' : 'Register Hazardous Product'}</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="e.g. Hydrochloric Acid 30%" /></div>
              <div className="form-group"><label className="form-label">Manufacturer *</label><input className="form-input" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Storage Location *</label><input className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Chemical Storage Room B" /></div>
              <div className="form-group"><label className="form-label">Hazard Class</label><select className="form-input" value={form.hazard_class} onChange={e => setForm({ ...form, hazard_class: e.target.value })}>{HAZARD_CLASSES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Quantity on Site</label><input className="form-input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 4L, 2 drums" /></div>
              <div className="form-group"><label className="form-label">SDS Date</label><input type="date" className="form-input" value={form.sds_date} onChange={e => setForm({ ...form, sds_date: e.target.value })} /></div>
            </div>
            <div className="form-group"><label className="form-label">SDS URL</label><input className="form-input" value={form.sds_url} onChange={e => setForm({ ...form, sds_url: e.target.value })} placeholder="https://..." /></div>
            <div className="form-group"><label className="form-label">PPE Required</label><input className="form-input" value={form.ppe_required} onChange={e => setForm({ ...form, ppe_required: e.target.value })} placeholder="e.g. Nitrile gloves, safety glasses" /></div>
            <div className="form-group"><label className="form-label">First Aid Measures</label><textarea className="form-input" value={form.first_aid} onChange={e => setForm({ ...form, first_aid: e.target.value })} style={{ minHeight: 60 }} /></div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group"><label className="form-label">Storage Requirements</label><input className="form-input" value={form.storage_requirements} onChange={e => setForm({ ...form, storage_requirements: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Disposal Method</label><input className="form-input" value={form.disposal_method} onChange={e => setForm({ ...form, disposal_method: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditProduct(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editProduct ? 'Update' : 'Register Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}