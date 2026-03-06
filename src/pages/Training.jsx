import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CERT_TYPES = ['WHMIS 2015', 'First Aid Level C', 'Fall Arrest', 'TDG', 'JHSC', 'Confined Space', 'Electrical Safety', 'Other']
const ROLES = ['Carpenter', 'Ironworker', 'Electrician', 'Labourer', 'Site Supervisor', 'Heavy Equipment Operator', 'HSE Officer', 'Other']

export default function Training() {
  const [workers, setWorkers] = useState([])
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [showCertForm, setShowCertForm] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [tab, setTab] = useState('all')
  const [workerForm, setWorkerForm] = useState({ first_name: '', last_name: '', role: 'Carpenter', email: '', phone: '' })
  const [certForm, setCertForm] = useState({ name: 'WHMIS 2015', status: 'Valid', completed_date: '', expiry_date: '', provider: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('workers').select('*').eq('user_id', user.id).order('last_name'),
      supabase.from('certifications').select('*').eq('user_id', user.id)
    ])
    setWorkers(w || [])
    setCerts(c || [])
    setLoading(false)
  }

  async function addWorker() {
    if (!workerForm.first_name || !workerForm.last_name) { alert('Enter full name'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('workers').insert([{ ...workerForm, user_id: user.id }])
    setWorkerForm({ first_name: '', last_name: '', role: 'Carpenter', email: '', phone: '' })
    setShowWorkerForm(false)
    fetchAll()
  }

  async function deleteWorker(id) {
    if (!window.confirm('Delete this worker and all their certifications?')) return
    await supabase.from('certifications').delete().eq('worker_id', id)
    await supabase.from('workers').delete().eq('id', id)
    fetchAll()
  }

  async function deleteCert(id) {
    if (!window.confirm('Delete this certification?')) return
    await supabase.from('certifications').delete().eq('id', id)
    fetchAll()
  }

  async function addCert() {
    if (!selectedWorker || !certForm.expiry_date) { alert('Select worker and expiry date'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('certifications').insert([{ ...certForm, worker_id: selectedWorker, user_id: user.id }])
    setCertForm({ name: 'WHMIS 2015', status: 'Valid', completed_date: '', expiry_date: '', provider: '' })
    setShowCertForm(false)
    fetchAll()
  }

  function getExpiryStatus(expiryDate) {
    if (!expiryDate) return 'unknown'
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring'
    return 'valid'
  }

  function daysUntil(expiryDate) {
    if (!expiryDate) return '—'
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    return `${days}d`
  }

  const expiring = certs.filter(c => getExpiryStatus(c.expiry_date) === 'expiring')
  const expired = certs.filter(c => getExpiryStatus(c.expiry_date) === 'expired')

  const filteredWorkers = tab === 'expiring'
    ? workers.filter(w => certs.filter(c => c.worker_id === w.id).some(c => getExpiryStatus(c.expiry_date) === 'expiring'))
    : tab === 'expired'
    ? workers.filter(w => certs.filter(c => c.worker_id === w.id).some(c => getExpiryStatus(c.expiry_date) === 'expired'))
    : workers

  const avatarColors = ['#f97316','#0ea5e9','#10b981','#8b5cf6','#ef4444','#f59e0b']

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Training Tracker</h1>
          <p className="page-sub">Workers · Certifications · Expiry monitoring</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowCertForm(true)}>+ Add Certification</button>
          <button className="btn btn-primary" onClick={() => setShowWorkerForm(true)}>+ Add Worker</button>
        </div>
      </div>

      <div className="kpi-grid">
        {[
          { icon: '👷', label: 'Total Workers', value: workers.length, color: 'var(--blue)' },
          { icon: '🎓', label: 'Certifications', value: certs.length, color: 'var(--green)' },
          { icon: '⚠️', label: 'Expiring Soon', value: expiring.length, color: 'var(--orange)' },
          { icon: '🔴', label: 'Expired', value: expired.length, color: 'var(--red)' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[
          { id: 'all', label: `All (${workers.length})` },
          { id: 'expiring', label: `⚠ Expiring (${expiring.length})` },
          { id: 'expired', label: `🔴 Expired (${expired.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {filteredWorkers.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <div className="empty-icon">👷</div>
            <div className="empty-title">No workers yet</div>
            <div className="empty-sub">Click "+ Add Worker" to get started</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredWorkers.map(worker => {
            const workerCerts = certs.filter(c => c.worker_id === worker.id)
            const color = avatarColors[worker.first_name.charCodeAt(0) % avatarColors.length]
            return (
              <div key={worker.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: workerCerts.length ? 14 : 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {worker.first_name[0]}{worker.last_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{worker.first_name} {worker.last_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{worker.role}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{workerCerts.length} cert{workerCerts.length !== 1 ? 's' : ''}</span>
                    <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }}
                      onClick={() => { setSelectedWorker(worker.id); setShowCertForm(true) }}>
                      + Cert
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11, color: 'var(--red)' }}
                      onClick={() => deleteWorker(worker.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                {workerCerts.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {workerCerts.map(cert => {
                      const s = getExpiryStatus(cert.expiry_date)
                      const style = {
                        valid: { bg: 'var(--green-light)', text: '#1a7f3c', border: 'rgba(52,199,89,0.2)' },
                        expiring: { bg: 'var(--orange-light)', text: '#b85c00', border: 'rgba(255,149,0,0.2)' },
                        expired: { bg: 'var(--red-light)', text: 'var(--red)', border: 'rgba(255,59,48,0.2)' },
                        unknown: { bg: 'var(--bg)', text: 'var(--text-2)', border: 'var(--border)' },
                      }[s]
                      return (
                        <div key={cert.id} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: style.text }}>{cert.name}</div>
                            <div style={{ fontSize: 10, color: style.text, opacity: 0.8, marginTop: 2 }}>
                              {cert.expiry_date} · {daysUntil(cert.expiry_date)}
                            </div>
                          </div>
                          <button onClick={() => deleteCert(cert.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: style.text, opacity: 0.5, fontSize: 11, padding: '0 2px', lineHeight: 1, marginTop: 1 }}
                            title="Delete certification">
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* WORKER MODAL */}
      {showWorkerForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowWorkerForm(false)}>
          <div className="modal">
            <div className="modal-title">Add Worker</div>
            <div className="modal-sub">Worker will appear in Training Tracker and Analytics</div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              {[['first_name','First Name'],['last_name','Last Name'],['email','Email'],['phone','Phone']].map(([f, l]) => (
                <div key={f} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={workerForm[f]} onChange={e => setWorkerForm({ ...workerForm, [f]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWorkerForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addWorker}>Add Worker</button>
            </div>
          </div>
        </div>
      )}

      {/* CERT MODAL */}
      {showCertForm && (
        <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) { setShowCertForm(false); setSelectedWorker(null) } }}>
          <div className="modal">
            <div className="modal-title">Add Certification</div>
            <div className="modal-sub">Assign a certification to a worker</div>
            <div className="form-group">
              <label className="form-label">Worker</label>
              <select className="form-input" value={selectedWorker || ''} onChange={e => setSelectedWorker(e.target.value)}>
                <option value=''>Select worker...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Certification</label>
              <select className="form-input" value={certForm.name} onChange={e => setCertForm({ ...certForm, name: e.target.value })}>
                {CERT_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Completion Date</label>
                <input type="date" className="form-input" value={certForm.completed_date} onChange={e => setCertForm({ ...certForm, completed_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-input" value={certForm.expiry_date} onChange={e => setCertForm({ ...certForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <input className="form-input" value={certForm.provider} onChange={e => setCertForm({ ...certForm, provider: e.target.value })} placeholder="e.g. CCOHS, Construction Safety NS" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowCertForm(false); setSelectedWorker(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={addCert}>Save Certification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}