import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function JOHSC() {
  const [meetings, setMeetings] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [showRecForm, setShowRecForm] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [expandedMeeting, setExpandedMeeting] = useState(null)
  const [tab, setTab] = useState('meetings')
  const [submitting, setSubmitting] = useState(false)

  const emptyMeeting = {
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: 'Regular', location: '', chair: '',
    attendees: '', agenda: '', discussion: ''
  }
  const emptyRec = {
    description: '', priority: 'Medium', assigned_to: '',
    due_date: '', employer_response: '', response_date: ''
  }

  const [meetingForm, setMeetingForm] = useState(emptyMeeting)
  const [recForm, setRecForm] = useState(emptyRec)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: m }, { data: r }] = await Promise.all([
      supabase.from('johsc_meetings').select('*').eq('user_id', user.id).order('meeting_date', { ascending: false }),
      supabase.from('johsc_recommendations').select('*').eq('user_id', user.id).order('due_date')
    ])
    setMeetings(m || [])
    setRecommendations(r || [])
    setLoading(false)
  }

  async function handleSaveMeeting() {
    if (!meetingForm.location || !meetingForm.chair || !meetingForm.attendees) {
      alert('Fill all required fields'); return
    }
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('johsc_meetings').insert([{ ...meetingForm, user_id: user.id }])
    setMeetingForm(emptyMeeting)
    setShowMeetingForm(false)
    setSubmitting(false)
    fetchAll()
  }

  async function handleSaveRec() {
    if (!recForm.description || !recForm.assigned_to || !recForm.due_date) {
      alert('Fill all required fields'); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('johsc_recommendations').insert([{
      ...recForm, meeting_id: selectedMeeting, user_id: user.id
    }])
    setRecForm(emptyRec)
    setShowRecForm(false)
    setSelectedMeeting(null)
    fetchAll()
  }

  async function handleRespond(id, response) {
    await supabase.from('johsc_recommendations').update({
      employer_response: response,
      response_date: new Date().toISOString().split('T')[0],
      status: 'responded'
    }).eq('id', id)
    fetchAll()
  }

  async function handleCloseRec(id) {
    await supabase.from('johsc_recommendations').update({ status: 'closed' }).eq('id', id)
    fetchAll()
  }

  function getRecsForMeeting(meetingId) {
    return recommendations.filter(r => r.meeting_id === meetingId)
  }

  function isOverdue(date, status) {
    return status !== 'closed' && date && new Date(date) < new Date()
  }

  function daysSince(date) {
    return Math.floor((new Date() - new Date(date)) / 86400000)
  }

  function daysUntilResponse(meetingDate) {
    const deadline = new Date(meetingDate)
    deadline.setDate(deadline.getDate() + 21)
    const days = Math.floor((deadline - new Date()) / 86400000)
    return days
  }

  const pendingRecs = recommendations.filter(r => r.status === 'pending')
  const overdueRecs = recommendations.filter(r => isOverdue(r.due_date, r.status))
  const unreplied = recommendations.filter(r => r.status === 'pending' && r.meeting_id && daysUntilResponse(meetings.find(m => m.id === r.meeting_id)?.meeting_date || '') < 0)

  const priorityPill = { Low: 'pill-green', Medium: 'pill-blue', High: 'pill-orange', Critical: 'pill-red' }

  if (loading) return <div className="page-wrap"><div className="empty-state"><div className="empty-sub">Loading...</div></div></div>

  return (
    <div className="page-wrap">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">JOHSC — Joint OHS Committee</h1>
          <p className="page-sub">Meeting minutes · Formal recommendations · Employer responses · NS OHS Act §29–34</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => { setShowRecForm(true) }}>+ Recommendation</button>
          <button className="btn btn-primary" onClick={() => { setMeetingForm(emptyMeeting); setShowMeetingForm(true) }}>+ Log Meeting</button>
        </div>
      </div>

      {/* LEGAL NOTICE */}
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div className="alert-title">NS OHS Act §34 — Employer Response Obligation</div>
          <div className="alert-body">The employer must respond in writing to every JOHSC recommendation within <b>21 days</b>. Failure to respond is a violation of the Occupational Health and Safety Act.</div>
        </div>
      </div>

      {/* ALERTS */}
      {(overdueRecs.length > 0 || unreplied.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {unreplied.length > 0 && (
            <div style={{ background: 'var(--red-light)', border: '1px solid rgba(197,48,48,0.2)', borderLeft: '3px solid var(--red)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 2 }}>
                ⚠ {unreplied.length} Recommendation{unreplied.length > 1 ? 's' : ''} Past 21-Day Response Deadline
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                NS OHS Act §34 violation — employer response is legally required. Respond immediately.
              </div>
            </div>
          )}
          {overdueRecs.length > 0 && (
            <div style={{ background: 'var(--orange-light)', border: '1px solid rgba(192,86,33,0.2)', borderLeft: '3px solid var(--orange)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>
                {overdueRecs.length} Recommendation Action{overdueRecs.length > 1 ? 's' : ''} Overdue
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Past action due date — update status or close.</div>
            </div>
          )}
        </div>
      )}

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Meetings Logged', value: meetings.length, color: 'var(--primary)', delta: `Last: ${meetings[0]?.meeting_date || '—'}` },
          { label: 'Open Recommendations', value: pendingRecs.length, color: pendingRecs.length > 0 ? 'var(--amber)' : 'var(--green)', delta: `${recommendations.filter(r=>r.status==='closed').length} closed` },
          { label: 'Awaiting Response', value: unreplied.length, color: unreplied.length > 0 ? 'var(--red)' : 'var(--green)', delta: unreplied.length > 0 ? '21-day deadline passed' : 'All responses current' },
          { label: 'Overdue Actions', value: overdueRecs.length, color: overdueRecs.length > 0 ? 'var(--red)' : 'var(--green)', delta: 'Action due date passed' },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
            <div className="kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs">
        {[
          { id: 'meetings', label: `Meeting Minutes (${meetings.length})` },
          { id: 'recommendations', label: `All Recommendations (${recommendations.length})` },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* MEETINGS TAB */}
      {tab === 'meetings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.length === 0 ? (
            <div className="table-wrap">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No meetings logged</div>
                <div className="empty-sub">Log your first JOHSC meeting to start tracking compliance with NS OHS Act §29</div>
              </div>
            </div>
          ) : meetings.map(meeting => {
            const recs = getRecsForMeeting(meeting.id)
            const openRecs = recs.filter(r => r.status !== 'closed')
            const daysLeft = daysUntilResponse(meeting.meeting_date)
            const isExpanded = expandedMeeting === meeting.id

            return (
              <div key={meeting.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {/* MEETING HEADER */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: isExpanded ? 'var(--surface-2)' : 'var(--surface)' }}
                  onClick={() => setExpandedMeeting(isExpanded ? null : meeting.id)}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 4 }}>{isExpanded ? '▼' : '▶'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>{meeting.meeting_date}</span>
                      <span className={`pill ${meeting.meeting_type === 'Emergency' ? 'pill-red' : meeting.meeting_type === 'Special' ? 'pill-amber' : 'pill-blue'}`}>{meeting.meeting_type}</span>
                      {openRecs.length > 0 && <span className="pill pill-amber">{openRecs.length} open rec{openRecs.length > 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      Chair: <b>{meeting.chair}</b> · {meeting.location} · {meeting.attendees.split(',').length} attendees
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {daysLeft > 0 ? (
                      <div style={{ fontSize: 11, color: daysLeft <= 7 ? 'var(--orange)' : 'var(--text-3)' }}>
                        {daysLeft}d until response deadline
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: openRecs.length > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: openRecs.length > 0 ? 700 : 400 }}>
                        {openRecs.length > 0 ? `⚠ Response deadline passed` : 'All recommendations closed'}
                      </div>
                    )}
                    <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 10, marginTop: 6 }}
                      onClick={e => { e.stopPropagation(); setSelectedMeeting(meeting.id); setShowRecForm(true) }}>
                      + Add Recommendation
                    </button>
                  </div>
                </div>

                {/* EXPANDED */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                    {/* MEETING DETAILS */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Attendees</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {meeting.attendees.split(',').map((a, i) => (
                            <span key={i} className="pill pill-gray" style={{ fontSize: 11 }}>{a.trim()}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Agenda</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{meeting.agenda || '—'}</div>
                      </div>
                    </div>
                    {meeting.discussion && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Discussion Notes</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 6 }}>{meeting.discussion}</div>
                      </div>
                    )}

                    {/* RECOMMENDATIONS */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
                      Formal Recommendations ({recs.length})
                    </div>
                    {recs.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                        No recommendations from this meeting —{' '}
                        <button onClick={() => { setSelectedMeeting(meeting.id); setShowRecForm(true) }}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                          add one
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recs.map(rec => (
                          <RecommendationCard key={rec.id} rec={rec} onRespond={handleRespond} onClose={handleCloseRec} priorityPill={priorityPill} isOverdue={isOverdue} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* RECOMMENDATIONS TAB */}
      {tab === 'recommendations' && (
        <div className="table-wrap">
          {recommendations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <div className="empty-title">No recommendations yet</div>
              <div className="empty-sub">Recommendations are added to JOHSC meetings</div>
            </div>
          ) : (
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Employer Response</th>
                  <th>Response Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map(rec => (
                  <tr key={rec.id}>
                    <td style={{ maxWidth: 200, fontSize: 12 }}>{rec.description}</td>
                    <td><span className={`pill ${priorityPill[rec.priority] || 'pill-gray'}`}>{rec.priority}</span></td>
                    <td style={{ fontSize: 12 }}>{rec.assigned_to}</td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isOverdue(rec.due_date, rec.status) ? 'var(--red)' : 'var(--text-2)', fontWeight: isOverdue(rec.due_date, rec.status) ? 700 : 400 }}>
                        {rec.due_date}
                        {isOverdue(rec.due_date, rec.status) && <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--red)' }}>OVERDUE</span>}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 160 }}>{rec.employer_response || <span style={{ color: 'var(--text-3)' }}>Pending</span>}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{rec.response_date || '—'}</td>
                    <td>
                      <span className={`pill ${rec.status === 'closed' ? 'pill-green' : rec.status === 'responded' ? 'pill-blue' : 'pill-amber'}`}>
                        {rec.status === 'closed' ? 'Closed' : rec.status === 'responded' ? 'Responded' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {rec.status !== 'closed' && (
                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }}
                          onClick={() => handleCloseRec(rec.id)}>Close</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* LOG MEETING MODAL */}
      {showMeetingForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMeetingForm(false)}>
          <div className="modal" style={{ width: 580 }}>
            <div className="modal-title">Log JOHSC Meeting</div>
            <div className="modal-sub">Record meeting minutes — NS OHS Act §29 requires regular committee meetings</div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Meeting Date *</label>
                <input type="date" className="form-input" value={meetingForm.meeting_date} onChange={e => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Type</label>
                <select className="form-input" value={meetingForm.meeting_type} onChange={e => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}>
                  <option>Regular</option>
                  <option>Special</option>
                  <option>Emergency</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" value={meetingForm.location} onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })} placeholder="e.g. Site Office, Boardroom" />
              </div>
              <div className="form-group">
                <label className="form-label">Chair *</label>
                <input className="form-input" value={meetingForm.chair} onChange={e => setMeetingForm({ ...meetingForm, chair: e.target.value })} placeholder="Meeting chair name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Attendees * <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(comma separated)</span></label>
              <input className="form-input" value={meetingForm.attendees} onChange={e => setMeetingForm({ ...meetingForm, attendees: e.target.value })} placeholder="John Smith, Jane Doe, Bob Johnson..." />
            </div>

            <div className="form-group">
              <label className="form-label">Agenda Items</label>
              <textarea className="form-input" value={meetingForm.agenda} onChange={e => setMeetingForm({ ...meetingForm, agenda: e.target.value })} placeholder="1. Review previous minutes&#10;2. Incident review&#10;3. Hazard register update..." style={{ minHeight: 80 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Discussion Notes</label>
              <textarea className="form-input" value={meetingForm.discussion} onChange={e => setMeetingForm({ ...meetingForm, discussion: e.target.value })} placeholder="Summary of discussion, decisions made, action items..." style={{ minHeight: 80 }} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMeetingForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveMeeting} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Meeting Minutes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD RECOMMENDATION MODAL */}
      {showRecForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRecForm(false)}>
          <div className="modal">
            <div className="modal-title">Add Formal Recommendation</div>
            <div className="modal-sub">NS OHS Act §34 — employer must respond in writing within 21 days</div>

            {!selectedMeeting && (
              <div className="form-group">
                <label className="form-label">Linked Meeting</label>
                <select className="form-input" value={selectedMeeting || ''} onChange={e => setSelectedMeeting(e.target.value)}>
                  <option value=''>Select meeting...</option>
                  {meetings.map(m => (
                    <option key={m.id} value={m.id}>{m.meeting_date} — {m.meeting_type} (Chair: {m.chair})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Recommendation *</label>
              <textarea className="form-input" value={recForm.description} onChange={e => setRecForm({ ...recForm, description: e.target.value })} placeholder="Describe the formal recommendation made by the JOHSC..." style={{ minHeight: 80 }} />
            </div>

            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Assigned To *</label>
                <input className="form-input" value={recForm.assigned_to} onChange={e => setRecForm({ ...recForm, assigned_to: e.target.value })} placeholder="Responsible person" />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input type="date" className="form-input" value={recForm.due_date} onChange={e => setRecForm({ ...recForm, due_date: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Low', 'Medium', 'High', 'Critical'].map(p => {
                  const colors = { Low: 'var(--green)', Medium: 'var(--primary)', High: 'var(--orange)', Critical: 'var(--red)' }
                  const active = recForm.priority === p
                  return (
                    <button key={p} onClick={() => setRecForm({ ...recForm, priority: p })}
                      style={{ padding: '5px 14px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? colors[p] : 'var(--border-strong)'}`, background: active ? colors[p] : 'transparent', color: active ? '#fff' : 'var(--text-2)', transition: 'all 0.12s' }}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowRecForm(false); setSelectedMeeting(null) }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRec}>Save Recommendation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec, onRespond, onClose, priorityPill, isOverdue }) {
  const [responding, setResponding] = useState(false)
  const [responseText, setResponseText] = useState('')

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${rec.status === 'closed' ? 'var(--green)' : rec.status === 'responded' ? 'var(--primary)' : isOverdue(rec.due_date, rec.status) ? 'var(--red)' : 'var(--amber)'}`,
      borderRadius: 6, padding: '12px 14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{rec.description}</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
            Assigned to <b>{rec.assigned_to}</b> · Due {rec.due_date}
            {isOverdue(rec.due_date, rec.status) && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · OVERDUE</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
          <span className={`pill ${priorityPill[rec.priority] || 'pill-gray'}`}>{rec.priority}</span>
          <span className={`pill ${rec.status === 'closed' ? 'pill-green' : rec.status === 'responded' ? 'pill-blue' : 'pill-amber'}`}>
            {rec.status === 'closed' ? 'Closed' : rec.status === 'responded' ? 'Responded' : 'Pending Response'}
          </span>
        </div>
      </div>

      {rec.employer_response && (
        <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.15)', borderRadius: 5, padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Employer Response · {rec.response_date}</div>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>{rec.employer_response}</div>
        </div>
      )}

      {!rec.employer_response && !responding && rec.status !== 'closed' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => setResponding(true)}>
            Add Employer Response
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 10 }} onClick={() => onClose(rec.id)}>
            Close
          </button>
        </div>
      )}

      {responding && (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="form-input"
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Enter employer's written response to this recommendation..."
            style={{ minHeight: 70, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => { onRespond(rec.id, responseText); setResponding(false) }}>
              Save Response
            </button>
            <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setResponding(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}