import { useState, useRef, useEffect } from 'react'

const QUICK_QUESTIONS = [
  "What are my obligations under NS OHS Act §13 for harassment prevention?",
  "When is a JOHSC required and what are its powers?",
  "What must I do within 24 hours of a serious workplace incident?",
  "What is the right to refuse unsafe work under §43?",
  "What records must I keep and for how long?",
  "When do I need a written OHS Program vs just a Policy?",
  "What are the new Violence & Harassment requirements from September 2025?",
  "What are the penalties for non-compliance with the NS OHS Act?",
]

const RESOURCES = [
  { title: 'NS OHS Act (Full Text)', url: 'https://nslegislature.ca/sites/default/files/legc/statutes/occupational%20health%20and%20safety.pdf', type: 'Legislation' },
  { title: 'Workplace Health & Safety Regulations', url: 'https://novascotia.ca/just/regulations/regs/ohsworkplace.htm', type: 'Regulation' },
  { title: 'General OHS Regulations', url: 'https://novascotia.ca/just/regulations/regs/ohsgensf.htm', type: 'Regulation' },
  { title: 'Right to Refuse Guide', url: 'https://novascotia.ca/lae/healthandsafety/rightresponsibilityohsact.asp', type: 'Guide' },
  { title: 'NS OHS Publications', url: 'https://novascotia.ca/lae/healthandsafety/pubs.asp', type: 'Guide' },
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

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/><path d="M4 6.2V10.5C5.5 13 7.5 13 9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        background: isUser ? 'var(--primary)' : 'var(--surface)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '11px 15px', fontSize: 13, lineHeight: 1.65,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {msg.content.split('\n').map((line, i) => {
          if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700, marginTop: i > 0 ? 8 : 0, marginBottom: 2 }}>{line.replace(/\*\*/g, '')}</div>
          if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 14, position: 'relative', marginBottom: 2 }}><span style={{ position: 'absolute', left: 0 }}>•</span>{line.replace(/^[-•] /, '')}</div>
          if (line === '') return <div key={i} style={{ height: 5 }} />
          return <div key={i}>{line}</div>
        })}
      </div>
    </div>
  )
}

export default function ResourcesAI() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm your NS OHS Act compliance assistant. Ask me anything about Nova Scotia occupational health and safety law — your obligations, specific sections, compliance requirements, or how the Act applies to your workplace.\n\nWhat would you like to know?"
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert Nova Scotia Occupational Health and Safety (OHS) compliance advisor with deep knowledge of the NS OHS Act (1996 c.7 and all amendments including 2024), Workplace Health and Safety Regulations, General OHS Regulations, JOHSC requirements, WCB Nova Scotia, and WHMIS 2015.

Provide accurate, practical, specific guidance. Cite specific Act sections (e.g., §13, §29, §43-45). Be concise but thorough. Use bullet points where helpful. Never give legal advice — give compliance information.

Key facts:
- OHS Policy required: 5+ employees
- OHS Program required: 20+ employees
- JOHSC required: 20+ employees
- Records kept: minimum 5 years
- Serious incidents reported to NS OHS within 24 hours
- Violence & Harassment: new requirements September 1, 2025
- Right to refuse: §43-45 (worker paid regular wages during refusal)
- JOHSC employer response: 21 days (§34)
- NS OHS phone: 1-800-952-2687 (24/7)`,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, could not get a response. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
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
          <div style={{ flexShrink: 0, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Quick Questions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} disabled={loading}
                  style={{ fontSize: 11, padding: '5px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
                  {q.length > 52 ? q.slice(0, 52) + '…' : q}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 14px', minHeight: 0 }}>
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', opacity: 0.5, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ flexShrink: 0, display: 'flex', gap: 8, marginTop: 10 }}>
            <input ref={inputRef} className="form-input" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about NS OHS Act compliance, obligations, specific sections..." disabled={loading}
              style={{ flex: 1, marginBottom: 0 }} />
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ flexShrink: 0, padding: '0 20px' }}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
            For informational purposes only — not legal advice. NS OHS Division: 1-800-952-2687
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
            {RESOURCES.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 2h9v11H3V2Z" stroke="var(--primary)" strokeWidth="1.2"/><path d="M5 5h5M5 7.5h5M5 10h3" stroke="var(--primary)" strokeWidth="1" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{r.title}</div>
                    <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: TYPE_COLORS[r.type]?.bg, color: TYPE_COLORS[r.type]?.color }}>{r.type}</span>
                  </div>
                  <span style={{ color: 'var(--primary)', fontSize: 14 }}>→</span>
                </div>
              </a>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Key Employer Obligations — Quick Reference</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
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
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', display: 'flex', gap: 10 }}>
                  <div style={{ flexShrink: 0, width: 38, height: 38, background: 'var(--primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.2, fontFamily: 'monospace' }}>{item.section}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--primary-light)', border: '1px solid rgba(26,111,175,0.2)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Emergency Contacts</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'NS OHS Division (24/7)', value: '1-800-952-2687' },
                { label: 'WCB Nova Scotia', value: '1-800-870-3331' },
                { label: 'Construction Safety NS', value: '1-800-971-6888' },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}