'use client'
/**
 * AI Copilot — DB-aware enterprise assistant.
 * Dynamic suggestions from /api/v1/chat/suggestions.
 * Chat via /api/v1/chat/ with conversation_history.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, RotateCcw, Bot, User, Sparkles, Loader2 } from 'lucide-react'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

interface Msg {
  id: string; role: 'user' | 'assistant'; content: string; ts: Date; error?: boolean
}

const FALLBACK_SUGGESTIONS = [
  'Which files contain Aadhaar numbers?',
  'What are our highest risk documents?',
  'Which DPDP Act sections are we violating?',
  'How do I reduce our compliance risk?',
  'What should I fix first to become compliant?',
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'block' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

export default function CopilotPage() {
  const [messages,     setMessages]     = useState<Msg[]>([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [suggestions,  setSuggestions]  = useState<string[]>(FALLBACK_SUGGESTIONS)
  const [loadingSugg,  setLoadingSugg]  = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Fetch DB-aware suggestions
  useEffect(() => {
    fetch(`${API}/chat/suggestions`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.suggestions?.length) setSuggestions(d.suggestions) })
      .catch(() => {})
      .finally(() => setLoadingSugg(false))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text.trim(), ts: new Date() }
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversation_history: history,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'AI service unavailable')
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: data.response || 'No response.', ts: new Date(),
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: e.message || 'Failed to connect to AI.',
        ts: new Date(), error: true,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [messages, loading])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>AI Privacy Officer</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>
            Ask questions about your company&apos;s data — powered by real scan results
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="btn btn-secondary btn-sm">
            <RotateCcw size={13} /> New conversation
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, minHeight: 0 }}>

        {/* ── Left: Suggestions ─────────────────────────────────── */}
        <div className="card" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-light)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} color="var(--primary)" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>Ask about your data</p>
          </div>

          {loadingSugg
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
            ))
            : suggestions.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '9px 12px', fontSize: 12.5, color: 'var(--fg-2)', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.14s', lineHeight: 1.45,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)'; e.currentTarget.style.background = 'var(--bg)' }}
              >
                {s}
              </button>
            ))
          }

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--fg-4)', lineHeight: 1.5 }}>
              Answers are grounded in your real scan data from PostgreSQL — not generic advice.
            </p>
          </div>
        </div>

        {/* ── Right: Chat ───────────────────────────────────────── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Welcome message */}
            {messages.length === 0 && !loading && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-light)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={17} color="var(--primary)" />
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '14px 18px', maxWidth: 520 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>
                    Hello! I&apos;m your AI Privacy Officer 👋
                  </p>
                  <p style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.65, marginBottom: 10 }}>
                    I have direct access to your company&apos;s document scan results. Ask me anything about your data:
                  </p>
                  <ul style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
                    <li>Which files contain Aadhaar or PAN numbers?</li>
                    <li>Why is a specific document HIGH risk?</li>
                    <li>Which DPDP Act sections are we violating?</li>
                    <li>What should I fix first to become compliant?</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Message history */}
            {messages.map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #EB6A2A, #F59E0B)' : 'var(--bg)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="var(--primary)" />}
                </div>
                <div style={{
                  maxWidth: '78%',
                  background: msg.role === 'user' ? 'var(--primary)' : msg.error ? 'var(--red-light)' : 'var(--bg)',
                  border: `1px solid ${msg.role === 'user' ? 'transparent' : msg.error ? 'var(--red-border)' : 'var(--border)'}`,
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '12px 16px',
                }}>
                  <p style={{
                    fontSize: 13.5,
                    color: msg.role === 'user' ? '#fff' : msg.error ? 'var(--red)' : 'var(--fg)',
                    lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </p>
                  <p style={{ fontSize: 10.5, color: msg.role === 'user' ? 'rgba(255,255,255,0.55)' : 'var(--fg-4)', marginTop: 5 }}>
                    {msg.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={14} color="var(--primary)" />
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '10px 16px' }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0, background: 'var(--card)' }}>
            <textarea
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey} disabled={loading} rows={1}
              placeholder="Ask about your company's data…  (Enter to send, Shift+Enter for new line)"
              style={{
                flex: 1, resize: 'none', border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)', padding: '9px 14px',
                fontSize: 13.5, fontFamily: 'inherit', color: 'var(--fg)',
                background: 'var(--bg)', outline: 'none', lineHeight: 1.5, maxHeight: 120,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 'var(--r-md)', flexShrink: 0,
                background: input.trim() && !loading ? 'var(--primary)' : 'var(--border)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}>
              {loading ? <Loader2 size={15} color="var(--fg-4)" className="spin" /> : <Send size={15} color={input.trim() ? '#fff' : 'var(--fg-4)'} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
