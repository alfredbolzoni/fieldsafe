import { useState, useRef, useEffect } from 'react'

const QUICK_QUESTIONS = [
  "What are my obligations under NS OHS Act §13 for harassment prevention?",
  "When is a JOHSC required and what are its powers?",
  "What must I do within 24 hours of a serious workplace incident?",
  "What is the right to refuse unsafe work under §43?",
  "What records must I keep and for how long?",
  "What are the penalties for non-compliance with the NS OHS Act?",
  "When do I need a written OHS Program vs just a Policy?",
  "What are the new Violence & Harassment requirements from September 2025?",
]

const RESOURCES = [
  { title: 'NS OHS Act (Full Text)', url: 'https://nslegislature.ca/sites/default/files/legc/statutes/occupational%20health%20and%20safety.pdf', type: 'Legislation' },
  { title: 'Workplace Health & Safety Regulations', url: 'https://novascotia.ca/just/regulations/regs/ohsworkplace.htm', type: 'Regulation' },
  { title: 'General OHS Regulations', url: 'https://novascotia.ca/just/regulations/regs/ohsgensf.htm', type: 'Regulation' },
  { title: 'JOHSC Guide', url: 'https://novascotia.ca/lae/healthandsafety/pubs.asp', type: 'Guide' },
  { title: 'Right to Refuse Guide', url: 'https://novascotia.ca/lae/healthandsafety/rightresponsibilityohsact.asp', type: 'Guide' },
  { title: 'Construction Safety NS', url: 'https://ohs.guide.constructionsafetyns.ca', type: 'Industry' },
  { title: 'WCB Nova Scotia', url: 'https://www.wcb.ns.ca', type: 'WCB' },
  { title: 'CCOHS Free NS Training', url: 'https://www.ccohs.ca/products/courses/nova_scotia.html', type: 'Training' },
]

const TYPE_COLORS = {
  Legislation: { bg: 'var(--red-light)', color: 'var(--red)' },
  Regulation: { bg: 'var(--amber-light)', color: 'var(--amber)' },
  Guide: { bg: 'var(--primary-light)', color: 'var(--primary)' },
  Industry: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  WCB: { bg: 'var(--green-light)', color: 'var(--green)' },
  Training: { bg: 'var(--green-light)', color: 'var(--green)' },
}

// Render inline bold: **text** → <strong>
function renderInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong> : part
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const lines = msg.content.split('\n')

  const rendered = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Empty line
    if (line.trim() === '') {
      rendered.push(<div key={i} style={{ height: 6 }} />)
      i++
      continue
    }

    // Heading: ### or ## or # or line ending with :
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const text = line.replace(/^#+\s/, '')
      rendered.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 13, color: isUser ? 'white' : 'var(--primary)', marginTop: i > 0 ? 12 : 0, marginBottom: 4 }}>
          {renderInline(text)}
        </div>
      )
      i++
      continue
    }

    // Bold-only line (section header pattern like **JOHSC Requirements:**)
    if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
      const text = line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '')
      rendered.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 13, color: isUser ? 'white' : 'var(--primary)', marginTop: i > 0 ? 10 : 0, marginBottom: 3 }}>
          {text}
        </div>
      )
      i++
      continue
    }

    // Bold header ending with colon: **Something:**
    if (/^\*\*[^*]+:\*\*$/.test(line.trim())) {
      const text = line.trim().replace(/^\*\*/, '').replace(/\*\*$/, '')
      rendered.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 12, color: isUser ? 'rgba(255,255,255,0.9)' : 'var(--primary)', marginTop: i > 0 ? 10 : 0, marginBottom: 2 }}>
          {text}
        </div>
      )
      i++
      continue
    }

    // Bullet point: - or • 
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      const text = line.replace(/^[-•*]\s/, '')
      rendered.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--primary)', flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{renderInline(text)}</span>
        </div>
      )
      i++
      continue
    }

    // Normal paragraph
    rendered.push(
      <div key={i} style={{ marginBottom: 2 }}>
        {renderInline(line)}
      </div>
    )
    i++
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, alignItems: 'flex-start' }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: isUser ? '70%' : '85%',
        background: isUser ? 'var(--primary)' : 'var(--surface)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.65,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {rendered}
      </div>
    </div>
  )
}

export default function ResourcesAI() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your NS OHS Act compliance assistant.\n\nAsk me anything about Nova Scotia occupational health and safety law — your obligations, specific sections, compliance requirements, or how the Act applies to your workplace.\n\nWhat would you like to know?"
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert Nova Scotia Occupational Health and Safety (OHS) compliance advisor. Provide accurate, practical guidance. Cite specific Act sections (e.g., §13, §29, §43-45). Be concise but thorough. Use bullet points and bold headers to structure responses clearly. Never give legal advice — give compliance information. Key facts: OHS Policy required 5+ employees, OHS Program 20+, JOHSC 20+, records 5 years minimum, serious incidents reported within 24 hours, Violence & Harassment new requirements September 1 2025, right to refuse §43-45 worker paid during refusal, JOHSC employer response 21 days §34, NS OHS 1-800-952-2687 24/7.`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, could not get a response. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', paddingBottom: 0 }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Resources & AI Assistant</h1>
          <p className="page-sub">NS OHS Act compliance guidance · Legislation links · Powered by Claude AI</p>
        </div>
      </div>

      <div className="tabs" style={{ flexShrink: 0 }}>
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>AI Compliance Assistant</button>
        <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Legislation & Resources</button>
      </div>

      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0, overflow: 'hidden' }}>

          {/* LEFT SIDEBAR */}
          <div style={{ width: 232, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4, paddingTop: 2 }}>Suggested Questions</div>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)} disabled={loading}
                style={{ width: '100%', textAlign: 'left', fontSize: 11, padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.5, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                {q}
              </button>
            ))}
            <div style={{ marginTop: 8, padding: '12px', background: 'var(--primary-light)', borderRadius: 8, border: '1px solid rgba(26,111,175,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NS OHS Division</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>1-800-952-2687</div>
              <div style={{ fontSize: 10, color: 'var(--primary)', opacity: 0.7, marginTop: 2 }}>Available 24/7</div>
            </div>
          </div>

          {/* RIGHT — CHAT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 18px', minHeight: 0 }}>
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center', marginTop: 2 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.5 }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ flexShrink: 0, display: 'flex', gap: 8, marginTop: 10 }}>
              <input ref={inputRef} className="form-input" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about NS OHS Act compliance, obligations, specific sections..."
                disabled={loading} style={{ flex: 1, marginBottom: 0 }} />
              <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ flexShrink: 0, padding: '0 24px' }}>
                {loading ? '...' : 'Send'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
              For informational purposes only — not legal advice
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
            {RESOURCES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,111,175,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 15 15" fill="none"><path d="M3 2h9v11H3V2Z" stroke="var(--primary)" strokeWidth="1.2"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="var(--primary)" strokeWidth="1" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{r.title}</div>
                    <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: TYPE_COLORS[r.type]?.bg, color: TYPE_COLORS[r.type]?.color }}>{r.type}</span>
                  </div>
                  <span style={{ color: 'var(--primary)', fontSize: 16 }}>→</span>
                </div>
              </a>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Key Employer Obligations — Quick Reference</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { section: '§9', title: 'General Duty', desc: 'Take every reasonable precaution to protect health and safety of all persons at or near the workplace' },
                { section: '§13', title: 'Harassment Policy', desc: 'Written harassment & violence prevention policy required. New requirements September 1, 2025' },
                { section: '§17', title: 'OHS Policy', desc: 'Required for 5+ employees. Must be reviewed annually in consultation with JOHSC' },
                { section: '§28', title: 'OHS Program', desc: 'Required for 20+ employees. Must include training methods, SWPs, and committee procedures' },
                { section: '§29–34', title: 'JOHSC', desc: 'Required for 20+ employees. Employer must respond to formal recommendations within 21 days' },
                { section: '§43–45', title: 'Right to Refuse', desc: 'Workers may refuse dangerous work and are paid regular wages throughout the investigation' },
                { section: '§56', title: 'DOL Orders', desc: 'Orders from OHS Officers must be posted at workplace. Stop Work Orders take immediate effect' },
                { section: '§62–63', title: 'Incident Reporting', desc: 'Serious incidents reported to NS OHS within 24 hours. Scene must not be disturbed' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12 }}>
                  <div style={{ flexShrink: 0, width: 40, height: 40, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2, fontFamily: 'monospace' }}>{item.section}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.2)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Emergency Contacts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'NS OHS Division (24/7)', value: '1-800-952-2687' },
                { label: 'WCB Nova Scotia', value: '1-800-870-3331' },
                { label: 'Construction Safety NS', value: '1-800-971-6888' },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,80%,100% { transform: scale(0.6); opacity:0.4; } 40% { transform: scale(1); opacity:1; } }`}</style>
    </div>
  )
}