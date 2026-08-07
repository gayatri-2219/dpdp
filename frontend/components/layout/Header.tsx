'use client'
/**
 * Header — Matches mockup: search center, notification icons, avatar.
 */
import { useState, useCallback, useEffect } from 'react'
import { Search, Bell, AlertCircle, ChevronDown, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Health { api: boolean; db: boolean }

function HealthPill({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return (
    <div className="skeleton" style={{ width: 52, height: 20, borderRadius: 6 }} />
  )
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6,
      background: ok ? 'var(--green-light)' : 'var(--red-light)',
      border: `1px solid ${ok ? 'var(--green-border)' : 'var(--red-border)'}`,
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: ok ? 'var(--green)' : 'var(--red)',
      }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: ok ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
        {label}
      </span>
    </div>
  )
}

export function Header() {
  const [search, setSearch] = useState('')
  const [health, setHealth] = useState<{ api: boolean | null; db: boolean | null }>({ api: null, db: null })

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1','') || 'http://localhost:8000'}/health`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        const ok = d?.status === 'healthy' || d?.status === 'ok'
        setHealth({ api: ok, db: ok })
      } else {
        setHealth({ api: false, db: false })
      }
    } catch {
      setHealth({ api: false, db: false })
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const t = setInterval(checkHealth, 30000)
    return () => clearInterval(t)
  }, [checkHealth])

  return (
    <header style={{
      height: 'var(--header-h)',
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 24px',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Search */}
      <div style={{
        flex: 1, maxWidth: 420,
        display: 'flex', alignItems: 'center', gap: 8,
        height: 34, padding: '0 12px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
      }}>
        <Search size={14} color="var(--fg-4)" style={{ flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search anything..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--fg)', fontFamily: 'inherit',
          }}
        />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          padding: '2px 6px', borderRadius: 4,
          background: 'var(--border)', fontSize: 10, fontWeight: 600, color: 'var(--fg-4)',
        }}>⌘K</div>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <HealthPill ok={health.api} label="API" />
        <HealthPill ok={health.db}  label="DB" />
      </div>

      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          width: 34, height: 34, borderRadius: 'var(--r-md)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-3)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>

        <button style={{
          width: 34, height: 34, borderRadius: 'var(--r-md)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-3)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <AlertCircle size={16} strokeWidth={1.75} />
        </button>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #EB6A2A, #F59E0B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(235,106,42,0.3)',
        }}>A</div>
      </div>
    </header>
  )
}
