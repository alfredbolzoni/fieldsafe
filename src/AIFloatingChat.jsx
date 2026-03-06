import { useState, useRef, useEffect } from 'react'

const PAGE_CONTEXTS = {
  dashboard:   { label: 'Dashboard',             hint: 'Ask about your overall HSE compliance status, what actions to take first, or any NS OHS Act obligation.' },
  incidents:   { label: 'Incident Reports',       hint: 'Ask about incident reporting requirements, what to do after an injury, or NS OHS Act §62-63 obligations.' },
  inspections: { label: 'Site Inspections',       hint: 'Ask about inspection frequency requirements, checklist items, NS OHS Act §29, or JOHSC inspection duties.' },
  hazards:     { label: 'Hazard Register',        hint: 'Ask about hazard identification, risk assessment methods, control hierarchy, or NS OHS Act §9 employer duty.' },
  workrefusal: { label: 'Work Refusal',           hint: 'Ask about the right to refuse unsafe work, investigation steps, or NS OHS Act §43-45 procedures.' },
  johsc:       { label: 'JOHSC',                  hint: 'Ask about JOHSC composition requirements, powers, meeting frequency, or employer response obligations under §29-34.' },
  harassment:  { label: 'Harassment',            hint: 'Ask about the new harassment & violence prevention requirements effective September 1 2025, or NS OHS Act §13.' },
  whmis:       { label: 'WHMIS / SDS',            hint: 'Ask about WHMIS 2015 GHS requirements, SDS review periods, worker training obligations, or hazardous product labelling.' },
  emergency:   { label: 'Emergency Plans',        hint: 'Ask about required emergency procedures, drill frequency, assembly points, or NS OHS Act emergency preparedness obligations.' },
  swp:         { label: 'Safe Work Procedures',   hint: 'Ask about which tasks require written SWPs, what they must contain, or how to structure step-by-step procedures.' },
  dolorders:   { label: 'DOL Orders',             hint: 'Ask about compliance order obligations, stop work order procedures, posting requirements, or NS OHS Act §56.' },
  training:    { label: 'Training',               hint: 'Ask about mandatory training requirements, certification expiry obligations, or WHMIS/OHS training minimums.' },
  analytics:   { label: 'Analytics',              hint: 'Ask about WCB Nova Scotia benchmarks, leading vs lagging indicators, or how to improve your safety performance metrics.' },
  resources:   { label: 'NS OHS Resources',       hint: 'Ask anything about Nova Scotia occupational health and safety law.' },
}

const SYSTEM_PROMPT = `You are an expert Nova Scotia Occupational Health and Safety (OHS) compliance advisor embedded in FieldSafe, an HSE management platform. Provide accurate, practical guidance. Cite specific Act sections (e.g., §13, §29, §43-45). Be concise but thorough. Use bullet points and bold headers to structure responses. Never give legal advice — give compliance information. Key facts: OHS Policy required 5+ employees, OHS Program 20+, JOHSC 20+, records 5 years minimum, serious incidents reported within 24 hours, Violence & Harassment new requirements September 1 2025, right to refuse §43-45 worker paid during refusal, JOHSC employer response 21 days §34, NS OHS 1-800-952-2687 24/7.`

function renderInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

function MiniMessage({ msg }) {
  const isUser = msg.role === 'user'
  const lines = msg.content.split('\n')
  const rendered = []
  lines.forEach((line, i) => {
    if (!line.trim()) { rendered.push(<div key={i} style={{ height: 4 }} />); return }
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      rendered.push(<div key={i} style={{ fontWeight: 700, fontSize: 12, color: isUser ? 'white' : 'var(--primary)', marginTop: 8, marginBottom: 2 }}>{renderInline(line.replace(/^#+\s/, ''))}</div>)
    } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      rendered.push(
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--primary)', flexShrink: 0 }}>•</span>
          <span>{renderInline(line.replace(/^[-•*]\s/, ''))}</span>
        </div>
      )
    } else {
      rendered.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>)
    }
  })

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10, alignItems: 'flex-end', gap: 6 }}>
      {!isUser && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        background: isUser ? 'var(--primary)' : 'var(--surface)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '9px 12px',
        fontSize: 12,
        lineHeight: 1.6,
      }}>
        {rendered}
      </div>
    </div>
  )
}

export default function AIFloatingChat({ page = 'dashboard' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const ctx = PAGE_CONTEXTS[page] || PAGE_CONTEXTS.dashboard

  // Reset + show welcome when page changes (only if panel is open)
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hi! You're in **${ctx.label}**.\n\n${ctx.hint}\n\nWhat would you like to know?`
    }])
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  async function sendMessage(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const contextualSystem = `${SYSTEM_PROMPT}\n\nThe user is currently on the "${ctx.label}" page of FieldSafe. Tailor your answer to this context when relevant.`
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
          max_tokens: 800,
          system: contextualSystem,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Sorry, could not get a response. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your API key and try again.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* CHAT PANEL */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 76, right: 24, zIndex: 1000,
          width: 360, height: 500,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: 'var(--primary)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>FieldSafe AI</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{ctx.label} · NS OHS Act advisor</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', minHeight: 0 }}>
            {messages.map((msg, i) => <MiniMessage key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'aipulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.5 }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                className="form-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about NS OHS compliance..."
                disabled={loading}
                style={{ flex: 1, marginBottom: 0, fontSize: 12, padding: '8px 12px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ padding: '8px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>For informational purposes only · Not legal advice</div>
          </div>
        </div>
      )}

      {/* FAB BUTTON */}
      <button
        onClick={() => setOpen(o => !o)}
        title="FieldSafe AI Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1001,
          width: 48, height: 48,
          background: open ? 'var(--text)' : 'var(--primary)',
          color: 'white', border: 'none', borderRadius: '50%',
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,111,175,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
        )}
      </button>

      <style>{`@keyframes aipulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1} }`}</style>
    </>
  )
}
