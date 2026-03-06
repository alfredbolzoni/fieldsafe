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

  async function addCert() {
    if (!selectedWorker || !certForm.expiry_date) { alert('Select worker and expiry date'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('certifications').insert([{ ...certForm, worker_id: selectedWorker, user_id: user.id }])
    setCertForm({ name: 'WHMIS 2015', status: 'Valid', completed_date: '', expiry_date: '', provider: '' })
    setShowCertForm(false)
    fetchAll()
  }

  function getCertsForWorker(workerId) {
    return certs.filter(c => c.worker_id === workerId)
  }

  function getExpiryStatus(expiryDate) {
    if (!expiryDate) return 'unknown'
    const exp = new Date(expiryDate)
    const today = new Date()
    const days = Math.floor((exp - today) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring'
    return 'valid'
  }

  function getExpiryColor(status) {
    if (status === 'expired') return { bg: '#fef2f2', text: '#ef4444' }
    if (status === 'expiring') return { bg: '#fffbeb', text: '#f59e0b' }
    return { bg: '#f0fdf4', text: '#10b981' }
  }

  function daysUntil(expiryDate) {
    if (!expiryDate) return '—'
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    return `${days}d`
  }

  const expiringCerts = certs.filter(c => getExpiryStatus(c.expiry_date) === 'expiring')
  const expiredCerts = certs.filter(c => getExpiryStatus(c.expiry_date) === 'expired')

  const filteredWorkers = tab === 'expiring'
    ? workers.filter(w => getCertsForWorker(w.id).some(c => getExpiryStatus(c.expiry_date) === 'expiring'))
    : tab === 'expired'
    ? workers.filter(w => getCertsForWorker(w.id).some(c => getExpiryStatus(c.expiry_date) === 'expired'))
    : workers

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Training Tracker</h2>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Workers · Certifications · Expiry monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCertForm(true)}
            style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#374151' }}>
            + Add Certification
          </button>
          <button onClick={() => setShowWorkerForm(true)}
            style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
            + Add Worker
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Workers', value: workers.length, color: '#3b82f6', icon: '👷' },
          { label: 'Total Certifications', value: certs.length, color: '#10b981', icon: '🎓' },
          { label: 'Expiring (30 days)', value: expiringCerts.length, color: '#f59e0b', icon: '⚠️' },
          { label: 'Expired', value: expiredCerts.length, color: '#ef4444', icon: '🔴' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 16 }}>
        {[
          { id: 'all', label: `All Workers (${workers.length})` },
          { id: 'expiring', label: `⚠ Expiring (${expiringCerts.length})` },
          { id: 'expired', label: `🔴 Expired (${expiredCerts.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* WORKERS LIST */}
      {filteredWorkers.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👷</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No workers yet</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Click "+ Add Worker" to get started</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredWorkers.map(worker => {
            const workerCerts = getCertsForWorker(worker.id)
            const initials = worker.first_name[0] + worker.last_name[0]
            const colors = ['#f97316','#0ea5e9','#10b981','#8b5cf6','#ef4444','#f59e0b']
            const color = colors[worker.first_name.charCodeAt(0) % colors.length]

            return (
              <div key={worker.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: workerCerts.length > 0 ? 16 : 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{worker.first_name} {worker.last_name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{worker.role}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{workerCerts.length} cert{workerCerts.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => { setSelectedWorker(worker.id); setShowCertForm(true) }}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
                      + Cert
                    </button>
                  </div>
                </div>

                {workerCerts.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {workerCerts.map(cert => {
                      const status = getExpiryStatus(cert.expiry_date)
                      const { bg, text } = getExpiryColor(status)
                      return (
                        <div key={cert.id} style={{ background: bg, border: `1px solid ${text}30`, borderRadius: 8, padding: '6px 12px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{cert.name}</div>
                          <div style={{ fontSize: 10, color: text, marginTop: 2 }}>
                            Exp: {cert.expiry_date} · {daysUntil(cert.expiry_date)}
                          </div>
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

      {/* ADD WORKER MODAL */}
      {showWorkerForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Add Worker</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>Worker will appear in Training Tracker</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[['first_name', 'First Name', 'text'], ['last_name', 'Last Name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel']].map(([field, label, type]) => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={workerForm[field]}
                    onChange={e => setWorkerForm({ ...workerForm, [field]: e.target.value })}
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Role</label>
              <select value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWorkerForm(false)}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}>
                Cancel
              </button>
              <button onClick={addWorker}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
                Add Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CERT MODAL */}
      {showCertForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460, boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Add Certification</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>Assign a certification to a worker</p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Worker</label>
              <select value={selectedWorker || ''} onChange={e => setSelectedWorker(e.target.value)}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                <option value=''>Select worker...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Certification</label>
              <select value={certForm.name} onChange={e => setCertForm({ ...certForm, name: e.target.value })}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                {CERT_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Completion Date</label>
                <input type='date' value={certForm.completed_date}
                  onChange={e => setCertForm({ ...certForm, completed_date: e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Expiry Date</label>
                <input type='date' value={certForm.expiry_date}
                  onChange={e => setCertForm({ ...certForm, expiry_date: e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Provider</label>
              <input value={certForm.provider}
                onChange={e => setCertForm({ ...certForm, provider: e.target.value })}
                placeholder='e.g. CCOHS, Construction Safety NS'
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCertForm(false); setSelectedWorker(null) }}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}>
                Cancel
              </button>
              <button onClick={addCert}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}>
                Save Certification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}