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

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        background: isUser ? 'var(--primary)' : 'var(--surface)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.65,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {msg.content.split('\n').map((line, i) => {
          if (line.startsWith('**') && line.endsWith('**')) {
            return <div key={i} style={{ fontWeight: 700, marginTop: i > 0 ? 10 : 0, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return <div key={i} style={{ paddingLeft: 14, position: 'relative', marginBottom: 2 }}>
              <span style={{ position: 'absolute', left: 0 }}>•</span>{line.replace(/^[-•] /, '')}
            </div>
          }
          if (line === '') return <div key={i} style={{ height: 6 }} />
          return <div key={i}>{line}</div>
        })}
      </div>
    </div>
  )
}

export default function ResourcesAI() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your NS OHS Act compliance assistant. I can answer questions about Nova Scotia occupational health and safety law, help you understand your obligations under the Act, and provide guidance on compliance requirements.\n\nWhat would you like to know?"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
          system: `You are an expert Nova Scotia Occupational Health and Safety (OHS) compliance advisor with deep knowledge of:
- The Nova Scotia Occupational Health and Safety Act (1996, c.7 and all amendments including 2024)
- Workplace Health and Safety Regulations
- General OHS Regulations
- Construction industry OHS requirements
- JOHSC (Joint Occupational Health and Safety Committee) requirements
- WCB Nova Scotia workers compensation
- WHMIS 2015 (GHS-aligned)
- NS Department of Labour, Skills and Immigration enforcement

You provide accurate, practical, and specific guidance. When citing the Act, reference specific sections (e.g., 13, 29, 43-45). Be concise but thorough. Format responses clearly with bullet points where helpful. Never give legal advice, give compliance information.

Key facts:
- OHS Policy required for 5+ employees
- OHS Program required for 20+ employees
- JOHSC required for 20+ employees
- Records kept minimum 5 years
- Serious incidents must be reported to NS OHS within 24 hours
- New Violence and Harassment requirements effective September 1, 2025
- Right to refuse unsafe work: 43-45 (worker paid regular wages during refusal)
- JOHSC employer response deadline: 21 days (34)
- NS OHS phone: 1-800-952-2687 (24/7)`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, I could not get a response. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your network and try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <div className="page-wrap" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flexShrink: 0, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Quick Questions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} disabled={loading}
                  style={{ fontSize: 11, padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', color: 'var(--primary)', fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.target.style.background = 'var(--primary-light)'; e.target.style.borderColor = 'var(--primary)' }}
                  onMouseLeave={e => { e.target.style.background = 'var(--surface)'; e.target.style.borderColor = 'var(--border)' }}>
                  {q.length > 50 ? q.slice(0, 50) + '…' : q}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 16px', minHeight: 0 }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C5.5 13 7.5 13 9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.6 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ flexShrink: 0, display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              ref={inputRef}
              className="form-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about NS OHS Act compliance, your obligations, specific sections..."
              disabled={loading}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ flexShrink: 0, padding: '0 20px' }}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
            AI responses are for informational purposes only and do not constitute legal advice. Always verify with NS Department of Labour: 1-800-952-2687
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 24 }}>
            {RESOURCES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-light)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 15 15" fill="none"><path d="M3 2h9v11H3V2Z" stroke="var(--primary)" strokeWidth="1.2"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="var(--primary)" strokeWidth="1" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 10 }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        background: r.type === 'Legislation' ? 'var(--red-light)' : r.type === 'Regulation' ? 'var(--amber-light)' : r.type === 'Training' ? 'var(--green-light)' : 'var(--primary-light)',
                        color: r.type === 'Legislation' ? 'var(--red)' : r.type === 'Regulation' ? 'var(--amber)' : r.type === 'Training' ? 'var(--green)' : 'var(--primary)'
                      }}>{r.type}</span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: 14 }}>→</div>
                </div>
              </a>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>NS OHS Act — Key Employer Obligations Quick Reference</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { section: '§9', title: 'General Duty', desc: 'Take every reasonable precaution to protect health and safety of persons at or near the workplace' },
                { section: '§13', title: 'Harassment Policy', desc: 'Written harassment & violence prevention policy required. Updated requirements September 1, 2025' },
                { section: '§17', title: 'OHS Policy', desc: 'Required for 5+ regularly employed employees. Must be reviewed annually in consultation with JOHSC' },
                { section: '§28', title: 'OHS Program', desc: 'Required for 20+ regularly employed employees. Must include training, SWPs, and committee procedures' },
                { section: '§29–34', title: 'JOHSC', desc: 'Required for 20+ employees. Employer must respond to recommendations within 21 days' },
                { section: '§43–45', title: 'Right to Refuse', desc: 'Workers may refuse dangerous work. Employee paid regular wages during refusal investigation' },
                { section: '§56', title: 'OHS Orders', desc: 'Orders from OHS Officers must be posted at workplace with notice of compliance. Stop Work Orders: immediate effect' },
                { section: '§62–63', title: 'Incident Reporting', desc: 'Serious incidents must be reported to NS OHS within 24 hours. Scene must not be disturbed without authorization' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10 }}>
                  <div style={{ flexShrink: 0, width: 40, height: 40, background: 'var(--primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2, fontFamily: 'JetBrains Mono, monospace' }}>{item.section}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.2)', borderRadius: 10, padding: '16px 20px', marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>Emergency Contacts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'NS OHS Division (24/7)', value: '1-800-952-2687' },
                { label: 'WCB Nova Scotia', value: '1-800-870-3331' },
                { label: 'Construction Safety NS', value: '1-800-971-6888' },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}>{c.value}</div>
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