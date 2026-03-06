import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Incidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Near-Miss',
    description: '',
    location: '',
    reported_by: '',
    severity: 'Low'
  })

  useEffect(() => {
    fetchIncidents()
  }, [])

  async function fetchIncidents() {
    setLoading(true)
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
    setIncidents(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.description || !form.location || !form.reported_by) {
      alert('Please fill all fields')
      return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('incidents').insert([{ ...form, user_id: user.id }])
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Near-Miss',
      description: '',
      location: '',
      reported_by: '',
      severity: 'Low'
    })
    setShowForm(false)
    setSubmitting(false)
    fetchIncidents()
  }

  async function handleClose(id) {
    await supabase.from('incidents').update({ status: 'closed' }).eq('id', id)
    fetchIncidents()
  }

  const sevColor = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' }

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Incident Reports</h2>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Log and track all incidents, near-misses and hazards</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: '#f59e0b', border: 'none', borderRadius: 8,
            padding: '10px 18px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', color: '#1a1f2e'
          }}
        >
          + Log Incident
        </button>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            width: 520, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Log Incident</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 20 }}>All fields required</p>

            {/* DATE + TYPE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Type</label>
                <select value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }}
                >
                  <option>Near-Miss</option>
                  <option>Minor Injury</option>
                  <option>Time-Loss Injury</option>
                  <option>Property Damage</option>
                  <option>Hazard Observation</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Description</label>
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What happened? Be specific..."
                style={{
                  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
                  padding: '9px 12px', fontSize: 13, minHeight: 80,
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'system-ui'
                }}
              />
            </div>

            {/* LOCATION + REPORTED BY */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Location</label>
                <input value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Scaffold Level 2"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Reported By</label>
                <input value={form.reported_by}
                  onChange={e => setForm({ ...form, reported_by: e.target.value })}
                  placeholder="Full name"
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* SEVERITY */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>Severity</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Low', 'Medium', 'High'].map(s => (
                  <button key={s}
                    onClick={() => setForm({ ...form, severity: s })}
                    style={{
                      padding: '8px 20px', borderRadius: 8, fontSize: 13,
                      fontWeight: 700, cursor: 'pointer', border: '2px solid',
                      borderColor: form.severity === s ? sevColor[s] : '#e5e7eb',
                      background: form.severity === s ? sevColor[s] : '#fff',
                      color: form.severity === s ? '#fff' : '#6b7280'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* BUTTONS */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#6b7280' }}
              >
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1a1f2e' }}
              >
                {submitting ? 'Saving...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENTS LIST */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No incidents logged</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Click "+ Log Incident" to record your first entry</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Date', 'Type', 'Description', 'Location', 'Reported By', 'Severity', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace' }}>{inc.date}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12 }}>
                    <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{inc.type}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.description}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{inc.location}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13 }}>{inc.reported_by}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: sevColor[inc.severity] + '20', color: sevColor[inc.severity], padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{inc.severity}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: inc.status === 'open' ? '#fef2f2' : '#f0fdf4', color: inc.status === 'open' ? '#ef4444' : '#10b981', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {inc.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {inc.status === 'open' && (
                      <button onClick={() => handleClose(inc.id)}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}
                      >
                        Close
                      </button>
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