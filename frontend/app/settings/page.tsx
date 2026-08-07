'use client'
/**
 * Settings — System health + workspace config. Matches mockup.
 */
import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, RefreshCw, Server, Database, Cpu, Shield, Zap, HardDrive } from 'lucide-react'

interface HealthComponent { database?: string; redis?: string }
interface Health { status?: string; version?: string; components?: HealthComponent }

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoad]  = useState(true)
  const [saved, setSaved]   = useState<string | null>(null)

  const check = async () => {
    setLoad(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1','') || 'http://localhost:8000'}/health`)
      if (res.ok) setHealth(await res.json())
      else setHealth(null)
    } catch { setHealth(null) }
    finally { setLoad(false) }
  }
  useEffect(() => { check() }, [])

  const save = (s: string) => { setSaved(s); setTimeout(() => setSaved(null), 2000) }
  const apiOk = health?.status === 'healthy' || health?.status === 'ok'
  const dbOk  = health?.components?.database === 'healthy'
  const redisOk = health?.components?.redis === 'healthy'

  const systems = [
    { label: 'FastAPI Backend', icon: Server,   up: apiOk,   detail: (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1','') || 'http://localhost:8000')       },
    { label: 'PostgreSQL',      icon: Database, up: dbOk,    detail: 'Docker · port 5433'   },
    { label: 'Redis Cache',     icon: Zap,      up: redisOk, detail: 'Docker · port 6379'   },
    { label: 'AI Engine',       icon: Cpu,      up: true,    detail: 'Google Gemini Pro'     },
    { label: 'PII Scanner',     icon: Shield,   up: apiOk,   detail: 'Presidio + spaCy'     },
    { label: 'Storage',         icon: HardDrive,up: apiOk,   detail: 'Local · /uploads'     },
  ]


  return (
    <div className="page-enter" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Settings</h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>Configure your workspace and view system health</p>
      </div>

      {/* System Health */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>System Health</p>
          <button onClick={check} className="btn btn-secondary btn-sm">
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {systems.map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 10, border: `1px solid ${s.up ? 'var(--green-border)' : 'var(--red-border)'}`,
              background: s.up ? 'var(--green-light)' : 'var(--red-light)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: s.up ? 'rgba(40,167,69,0.12)' : 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={17} color={s.up ? 'var(--green)' : 'var(--red)'} strokeWidth={1.75} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{s.label}</p>
                <p style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{s.detail}</p>
              </div>
              {loading
                ? <div className="skeleton" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                : s.up
                  ? <CheckCircle2 size={18} color="var(--green)" />
                  : <XCircle size={18} color="var(--red)" />
              }
            </div>
          ))}
        </div>
        {health && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {[
              { label: 'API Status', value: health.status || '—' },
              { label: 'Version',    value: health.version || '1.0.0' },
              { label: 'Environment', value: 'Development' },
            ].map(f => (
              <div key={f.label} style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 3 }}>{f.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workspace */}
      {[
        {
          title: 'Workspace', fields: [
            { label: 'Organization Name', value: 'My Organization', type: 'text' },
            { label: 'Workspace ID',      value: 'ws_dpdp_001',    type: 'text', readonly: true },
            { label: 'Admin Email',       value: 'admin@company.io',type: 'email' },
          ], key: 'workspace',
        },
        {
          title: 'API Configuration', fields: [
            { label: 'Backend URL',    value: (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1','') || 'http://localhost:8000'), type: 'url'      },
            { label: 'Gemini API Key', value: '••••••••••••••••',      type: 'password' },
          ], key: 'api',
        },
      ].map(section => (
        <div key={section.key} className="card" style={{ padding: '24px 28px', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 20 }}>{section.title}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {section.fields.map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 6 }}>
                  {f.label}
                </label>
                <input type={f.type} defaultValue={f.value}
                  readOnly={(f as any).readonly}
                  className="input"
                  style={{ background: (f as any).readonly ? 'var(--bg)' : 'var(--card)', color: (f as any).readonly ? 'var(--fg-4)' : 'var(--fg)' }}
                />
              </div>
            ))}
          </div>
          <button onClick={() => save(section.key)} className="btn btn-primary" style={{ marginTop: 20 }}>
            {saved === section.key ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      ))}

      {/* About */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 16 }}>About DPDP Shield</p>
        {[
          ['Version',           '2.0.0'],
          ['Compliance Target', 'DPDP Act 2023'],
          ['PII Detectors',     'Regex + Presidio + spaCy'],
          ['Database',          'PostgreSQL 15 · Docker'],
          ['Backend',           'FastAPI + Python 3.11'],
          ['Frontend',          'Next.js 15 + TypeScript'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13.5, color: 'var(--fg-3)' }}>{k}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
