import { useState, useRef, useEffect } from 'react'
import { supabase } from './lib/supabase'

// ── TOOL DEFINITIONS FOR CLAUDE ────────────────────────────────────────────
const TOOLS = [
  {
    name: 'navigate_to_page',
    description: 'Navigate the user to a specific page in the FieldSafe app.',
    input_schema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          enum: ['dashboard', 'incidents', 'inspections', 'hazards', 'workrefusal', 'johsc', 'harassment', 'whmis', 'emergency', 'swp', 'dolorders', 'training', 'analytics', 'resources'],
          description: 'The page ID to navigate to'
        }
      },
      required: ['page']
    }
  },
  {
    name: 'create_incident',
    description: 'Creates a new incident record in the system. Only call this when you have collected ALL required fields from the user.',
    input_schema: {
      type: 'object',
      properties: {
        date:        { type: 'string', description: 'Date of incident YYYY-MM-DD' },
        type:        { type: 'string', enum: ['Near-Miss', 'Minor Injury', 'Time-Loss Injury', 'Hazard Observation', 'Property Damage'], description: 'Incident type' },
        location:    { type: 'string', description: 'Where it happened' },
        description: { type: 'string', description: 'What happened — detailed description' },
        reported_by: { type: 'string', description: 'Full name of the person reporting' },
        severity:    { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], description: 'Severity level' },
      },
      required: ['date', 'type', 'location', 'description', 'reported_by', 'severity']
    }
  },
  {
    name: 'create_hazard',
    description: 'Registers a new hazard in the hazard register. Only call when you have all required fields.',
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Short hazard title' },
        category:    { type: 'string', enum: ['Physical', 'Chemical', 'Biological', 'Ergonomic', 'Psychological', 'Environmental', 'Electrical', 'Fire', 'Working at Heights', 'Mobile Equipment'], description: 'Hazard category' },
        location:    { type: 'string', description: 'Where the hazard exists' },
        description: { type: 'string', description: 'Detailed description of the hazard' },
        likelihood:  { type: 'string', enum: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'], description: 'Likelihood of occurrence' },
        risk_level:  { type: 'string', enum: ['low', 'medium', 'high', 'Critical'], description: 'Overall risk level based on likelihood and severity' },
        controls:    { type: 'string', description: 'Control measures in place or planned' },
        responsible: { type: 'string', description: 'Person responsible for managing this hazard' },
        review_date: { type: 'string', description: 'Review date YYYY-MM-DD' },
      },
      required: ['title', 'category', 'location', 'likelihood', 'risk_level', 'controls', 'responsible']
    }
  },
  {
    name: 'log_work_refusal',
    description: 'Logs a work refusal under NS OHS Act §43. Only call when you have all required fields.',
    input_schema: {
      type: 'object',
      properties: {
        refusal_date:  { type: 'string', description: 'Date YYYY-MM-DD' },
        employee_name: { type: 'string', description: 'Full name of the employee who refused' },
        work_refused:  { type: 'string', description: 'Description of the specific task refused' },
        reason:        { type: 'string', description: 'Reason the employee believes the work is dangerous' },
        supervisor:    { type: 'string', description: 'Name of supervisor present' },
      },
      required: ['refusal_date', 'employee_name', 'work_refused', 'reason', 'supervisor']
    }
  },
  {
    name: 'report_harassment',
    description: 'Reports a harassment or violence incident under NS OHS Act §13. Only call when you have all required fields.',
    input_schema: {
      type: 'object',
      properties: {
        report_date:   { type: 'string', description: 'Report date YYYY-MM-DD' },
        reporter_name: { type: 'string', description: 'Name of person reporting' },
        reporter_type: { type: 'string', enum: ['Employee', 'Supervisor', 'Manager', 'Contractor', 'Third Party'] },
        incident_date: { type: 'string', description: 'When the incident occurred YYYY-MM-DD' },
        incident_type: { type: 'string', enum: ['Verbal Harassment', 'Physical Harassment', 'Sexual Harassment', 'Workplace Violence', 'Bullying', 'Discrimination', 'Intimidation', 'Other'] },
        description:   { type: 'string', description: 'Detailed description of what happened' },
        location:      { type: 'string', description: 'Where it occurred' },
        respondent:    { type: 'string', description: 'Person the complaint is about' },
        witnesses:     { type: 'string', description: 'Names of witnesses (optional)' },
      },
      required: ['report_date', 'reporter_name', 'incident_date', 'incident_type', 'description', 'location', 'respondent']
    }
  },
  {
    name: 'register_whmis_product',
    description: 'Registers a new hazardous product in the WHMIS register. Only call when you have all required fields.',
    input_schema: {
      type: 'object',
      properties: {
        product_name:  { type: 'string' },
        manufacturer:  { type: 'string' },
        location:      { type: 'string', description: 'Storage location' },
        hazard_class:  { type: 'string', enum: ['Flammable Liquid', 'Flammable Gas', 'Flammable Solid', 'Oxidizing Liquid', 'Oxidizing Gas', 'Toxic', 'Corrosive', 'Compressed Gas', 'Explosive', 'Biohazardous', 'Carcinogen', 'Irritant / Sensitizer', 'Environmental Hazard', 'Other'] },
        ppe_required:  { type: 'string', description: 'PPE required (optional)' },
        sds_date:      { type: 'string', description: 'SDS date YYYY-MM-DD (optional)' },
      },
      required: ['product_name', 'manufacturer', 'location', 'hazard_class']
    }
  },
]

const PAGE_LABELS = {
  dashboard: 'Dashboard', incidents: 'Incident Reports', inspections: 'Site Inspections',
  hazards: 'Hazard Register', workrefusal: 'Work Refusals', johsc: 'JOHSC',
  harassment: 'Harassment', whmis: 'WHMIS / SDS', emergency: 'Emergency Plans',
  swp: 'Safe Work Procedures', dolorders: 'DOL Orders', training: 'Training',
  analytics: 'Analytics', resources: 'NS OHS Resources',
}

const PAGE_HINTS = {
  dashboard:   'Ask about your compliance status, or say "log an incident", "register a hazard", etc.',
  incidents:   'Ask about incident reporting, or say "log a new incident" and I\'ll guide you through it.',
  inspections: 'Ask about inspection requirements under NS OHS Act §29.',
  hazards:     'Ask about hazard controls, or say "register a hazard" and I\'ll help you document it.',
  workrefusal: 'Ask about §43-45, or say "log a work refusal" to document one.',
  johsc:       'Ask about JOHSC composition, powers, or meeting requirements under §29-34.',
  harassment:  'Ask about §13 requirements, or say "report an incident" to file a new report.',
  whmis:       'Ask about WHMIS 2015 requirements, or say "register a product" to add one.',
  emergency:   'Ask about emergency preparedness requirements under the NS OHS Act.',
  swp:         'Ask about which tasks need SWPs, or say "create a procedure" for guidance.',
  dolorders:   'Ask about NS OHS Officer orders and compliance obligations under §56.',
  training:    'Ask about mandatory training requirements or certification obligations.',
  analytics:   'Ask about WCB benchmarks or how to interpret your safety performance.',
  resources:   'Ask anything about Nova Scotia occupational health and safety law.',
}

const SYSTEM_PROMPT = `You are FieldSafe AI — an intelligent assistant embedded in FieldSafe, an HSE management platform for Nova Scotia workplaces. Today's date is ${new Date().toISOString().slice(0, 10)}.

You have two capabilities:

**1. NS OHS Act Advisor**: Answer compliance questions accurately. Cite specific §sections. Be concise. Always note "for informational purposes only, not legal advice."

**2. App Agent**: You can perform actions directly in the app using tools:
- Log incidents, register hazards, log work refusals, report harassment, register WHMIS products
- Navigate to different pages

**When a user wants to create/log something:**
- Ask clarifying questions naturally — max 2 questions at a time, don't overwhelm
- Once you have ALL required fields, immediately call the appropriate tool (don't ask "shall I proceed?")
- After tool execution, give a brief confirmation of what was created
- Use today's date as default for date fields unless specified otherwise

**Key NS OHS facts**: OHS Policy required 5+ employees, OHS Program 20+, JOHSC 20+, records 5 years minimum, serious incidents reported within 24 hours, Violence & Harassment new requirements September 1 2025, right to refuse §43-45 worker paid throughout, JOHSC employer response 21 days §34, NS OHS 24/7: 1-800-952-2687.

Be direct and concise. No unnecessary preamble.`

// ── TOOL EXECUTOR ───────────────────────────────────────────────────────────
async function executeTool(name, input, setPage, aiNavigatedRef) {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (name === 'navigate_to_page') {
      aiNavigatedRef.current = true
      setPage(input.page)
      return `Navigated to ${PAGE_LABELS[input.page] || input.page}.`
    }

    if (name === 'create_incident') {
      const { classifyIncident } = getClassifier()
      const classification = classifyIncident(input.type, input.severity)
      const { data, error } = await supabase.from('incidents').insert([{
        ...input, user_id: user.id, status: 'open',
        ns_ohs_class: classification.class,
        notification_required: classification.notificationRequired,
        notification_deadline: classification.deadline,
      }]).select().single()
      if (error) return `Error creating incident: ${error.message}`
      return `Incident created successfully. ID: ${data.id}. Classification: ${classification.class}. ${classification.notificationRequired ? 'NS OHS notification required: ' + classification.deadline : 'No NS OHS notification required.'}`
    }

    if (name === 'create_hazard') {
      const { data, error } = await supabase.from('hazards').insert([{
        ...input, user_id: user.id, status: 'active',
      }]).select().single()
      if (error) return `Error creating hazard: ${error.message}`
      return `Hazard registered successfully. ID: ${data.id}.`
    }

    if (name === 'log_work_refusal') {
      const { data, error } = await supabase.from('work_refusals').insert([{
        ...input, user_id: user.id, status: 'open',
      }]).select().single()
      if (error) return `Error logging work refusal: ${error.message}`
      return `Work refusal logged successfully. ID: ${data.id}. Status: open — supervisor investigation required.`
    }

    if (name === 'report_harassment') {
      const { data, error } = await supabase.from('harassment_incidents').insert([{
        ...input, user_id: user.id, status: 'open',
      }]).select().single()
      if (error) return `Error reporting incident: ${error.message}`
      return `Harassment incident reported successfully. ID: ${data.id}. Status: open — investigation required under NS OHS Act §13.`
    }

    if (name === 'register_whmis_product') {
      const { data, error } = await supabase.from('whmis_products').insert([{
        ...input, user_id: user.id, status: 'active',
      }]).select().single()
      if (error) return `Error registering product: ${error.message}`
      return `WHMIS product registered successfully. ID: ${data.id}.`
    }

    return `Unknown tool: ${name}`
  } catch (e) {
    return `Tool execution error: ${e.message}`
  }
}

function getClassifier() {
  function classifyIncident(type, severity) {
    if (type === 'Time-Loss Injury' && severity === 'Critical') return { class: 'Critical Injury', notificationRequired: true, deadline: '24 hours — NS OHS §63' }
    if (type === 'Time-Loss Injury') return { class: 'Time-Loss Injury', notificationRequired: true, deadline: '3 days — NS OHS §63' }
    if (type === 'Minor Injury' && (severity === 'High' || severity === 'Critical')) return { class: 'Medical Aid Injury', notificationRequired: true, deadline: 'Internal record — NS OHS §62' }
    if (type === 'Minor Injury') return { class: 'First Aid Injury', notificationRequired: false, deadline: 'Internal record only' }
    if (type === 'Near-Miss') return { class: 'Near-Miss', notificationRequired: false, deadline: 'Internal record only' }
    if (type === 'Property Damage') return { class: 'Property Damage', notificationRequired: severity === 'High' || severity === 'Critical', deadline: 'Internal record — review required' }
    return { class: 'General Incident', notificationRequired: false, deadline: 'Internal record only' }
  }
  return { classifyIncident }
}

// ── MESSAGE RENDERING ────────────────────────────────────────────────────────
const TOOL_META = {
  create_incident:      { icon: '⚠', label: 'Logging incident' },
  create_hazard:        { icon: '🔶', label: 'Registering hazard' },
  log_work_refusal:     { icon: '🚫', label: 'Logging work refusal' },
  report_harassment:    { icon: '🛡', label: 'Reporting harassment incident' },
  register_whmis_product: { icon: '🧪', label: 'Registering WHMIS product' },
  navigate_to_page:     { icon: '→', label: 'Navigating' },
}

function renderInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)
}

function MiniMessage({ msg }) {
  const isUser = msg.role === 'user'

  if (msg.role === 'tool') {
    const meta = TOOL_META[msg.toolName] || { icon: '⚙', label: msg.toolName }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{
          background: msg.status === 'error' ? 'var(--red-light)' : msg.status === 'done' ? 'var(--green-light)' : 'var(--primary-light)',
          border: `1px solid ${msg.status === 'error' ? 'rgba(180,30,30,0.2)' : msg.status === 'done' ? 'rgba(20,120,60,0.2)' : 'rgba(26,111,175,0.2)'}`,
          borderRadius: 8, padding: '7px 12px',
          fontSize: 11, fontWeight: 600,
          color: msg.status === 'error' ? 'var(--red)' : msg.status === 'done' ? 'var(--green)' : 'var(--primary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {msg.status === 'loading' && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>}
          {msg.status === 'done' && '✓'}
          {msg.status === 'error' && '✗'}
          {meta.icon} {meta.label}{msg.status === 'loading' ? '...' : ''}
        </div>
      </div>
    )
  }

  const lines = msg.content.split('\n')
  const rendered = []
  lines.forEach((line, i) => {
    if (!line.trim()) { rendered.push(<div key={i} style={{ height: 4 }} />); return }
    if (/^#+\s/.test(line)) {
      rendered.push(<div key={i} style={{ fontWeight: 700, fontSize: 12, color: isUser ? 'white' : 'var(--primary)', marginTop: 6, marginBottom: 2 }}>{renderInline(line.replace(/^#+\s/, ''))}</div>)
    } else if (/^[-•*]\s/.test(line)) {
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
        maxWidth: '82%',
        background: isUser ? 'var(--primary)' : 'var(--surface)',
        color: isUser ? 'white' : 'var(--text)',
        border: isUser ? 'none' : '1px solid var(--border)',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        padding: '9px 12px', fontSize: 12, lineHeight: 1.6,
      }}>
        {rendered}
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AIFloatingChat({ page = 'dashboard', setPage }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const conversationRef = useRef([])   // raw API messages
  const aiNavigated = useRef(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const pageLabel = PAGE_LABELS[page] || page
  const pageHint  = PAGE_HINTS[page] || 'Ask me anything about NS OHS compliance.'

  // Reset conversation when user navigates (unless AI did it)
  useEffect(() => {
    if (aiNavigated.current) { aiNavigated.current = false; return }
    const welcome = { role: 'assistant', content: `**${PAGE_LABELS[page] || page}**\n\n${pageHint}` }
    setMessages([welcome])
    conversationRef.current = []
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  async function callClaude(apiMessages) {
    const contextualSystem = `${SYSTEM_PROMPT}\n\nThe user is currently on the "${pageLabel}" page.`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: contextualSystem,
        tools: TOOLS,
        messages: apiMessages,
      })
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  }

  async function runLoop(apiMessages) {
    const response = await callClaude(apiMessages)
    const content = response.content || []
    const textBlocks = content.filter(b => b.type === 'text')
    const toolBlocks = content.filter(b => b.type === 'tool_use')

    // Show any text from this turn
    if (textBlocks.length > 0) {
      const text = textBlocks.map(b => b.text).join('\n')
      setMessages(prev => [...prev, { role: 'assistant', content: text }])
    }

    if (response.stop_reason === 'tool_use' && toolBlocks.length > 0) {
      // Add assistant message to API history
      const updatedMsgs = [...apiMessages, { role: 'assistant', content }]

      // Execute each tool
      const toolResults = []
      for (const toolBlock of toolBlocks) {
        // Show loading card
        const cardId = toolBlock.id
        setMessages(prev => [...prev, { role: 'tool', toolName: toolBlock.name, id: cardId, status: 'loading' }])

        const result = await executeTool(toolBlock.name, toolBlock.input, setPage, aiNavigated)
        const isError = result.startsWith('Error') || result.startsWith('Unknown') || result.startsWith('Tool execution')

        // Update card to done/error
        setMessages(prev => prev.map(m => m.id === cardId ? { ...m, status: isError ? 'error' : 'done' } : m))

        toolResults.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: result })
      }

      // Continue the loop with tool results
      const nextMsgs = [...updatedMsgs, { role: 'user', content: toolResults }]
      conversationRef.current = nextMsgs
      await runLoop(nextMsgs)
    } else {
      // End of turn — store final state
      conversationRef.current = [...apiMessages, { role: 'assistant', content: textBlocks.map(b => b.text).join('\n') }]
    }
  }

  async function sendMessage(text) {
    const userMsg = (text || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    const apiMessages = [...conversationRef.current, { role: 'user', content: userMsg }]

    try {
      await runLoop(apiMessages)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error. Please try again.` }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const QUICK = [
    'Log a new incident',
    'Register a hazard',
    'Log a work refusal',
    'Report a harassment incident',
    'Add a WHMIS product',
  ]

  return (
    <>
      {/* CHAT PANEL */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 76, right: 24, zIndex: 1000,
          width: 370, height: 520,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: 'var(--primary)', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>FieldSafe AI</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{pageLabel} · Advisor + Agent</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 6px', minHeight: 0 }}>
            {messages.map((msg, i) => <MiniMessage key={i} msg={msg} />)}

            {/* Quick actions (only when few messages) */}
            {messages.length <= 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    style={{ textAlign: 'left', fontSize: 11, padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)', fontWeight: 500, transition: 'all 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}>
                    {q} →
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'aipulse 1.4s ease-in-out infinite', animationDelay: `${j * 0.2}s`, opacity: 0.5 }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                className="form-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask or say 'log an incident'..."
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
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
              Can create records · For informational purposes only
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        title="FieldSafe AI — click to open"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1001,
          width: 48, height: 48,
          background: open ? '#374151' : 'var(--primary)',
          color: 'white', border: 'none', borderRadius: '50%',
          cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,111,175,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
      >
        {open
          ? <svg width="16" height="16" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : <svg width="18" height="18" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L14 4.5L7.5 8L1 4.5L7.5 1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M4 6.2V10.5C4 10.5 5.5 13 7.5 13C9.5 13 11 10.5 11 10.5V6.2" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
        }
      </button>

      <style>{`
        @keyframes aipulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}
