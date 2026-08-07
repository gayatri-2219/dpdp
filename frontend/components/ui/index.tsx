'use client'
/**
 * Shared UI Kit — DPDP Shield v3.0
 * All components match the warm minimalist mockup.
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { FileText, FileSpreadsheet, Image, File, AlertCircle, UploadCloud, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

/* ═══ RISK BADGE ══════════════════════════════════════════ */
const RISK: Record<string, { bg: string; color: string; border: string; label: string }> = {
  LOW:      { bg: '#E8F5EC', color: '#28A745', border: '#A8D5B5', label: 'Low'      },
  MEDIUM:   { bg: '#FEF9EA', color: '#B45309', border: '#FCD96A', label: 'Medium'   },
  HIGH:     { bg: '#FEF0E6', color: '#C2410C', border: '#F8C9A8', label: 'High'     },
  CRITICAL: { bg: '#FEE8E8', color: '#DC2626', border: '#FBB4B4', label: 'Critical' },
  UNKNOWN:  { bg: '#F3EFE8', color: '#999999', border: '#ECE5DD', label: 'Unknown'  },
}

export function RiskBadge({ level, size = 'md' }: { level?: string | null; size?: 'sm' | 'md' }) {
  const key = (level?.toUpperCase() || 'UNKNOWN')
  const cfg = RISK[key] || RISK.UNKNOWN
  const pad = size === 'sm' ? '2px 7px' : '3px 9px'
  const fs  = size === 'sm' ? 11 : 12
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: fs, fontWeight: 600, lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

/* ═══ STATUS BADGE ════════════════════════════════════════ */
const STATUS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  COMPLETED:  { bg: '#E8F5EC', color: '#28A745', border: '#A8D5B5', label: 'Completed'  },
  PROCESSING: { bg: '#FEF9EA', color: '#B45309', border: '#FCD96A', label: 'Processing' },
  FAILED:     { bg: '#FEE8E8', color: '#DC2626', border: '#FBB4B4', label: 'Failed'     },
  PENDING:    { bg: '#F3EFE8', color: '#999999', border: '#ECE5DD', label: 'Pending'    },
  QUEUED:     { bg: '#EFF6FF', color: '#3B82F6', border: '#BFDBFE', label: 'Queued'     },
  SCANNED:    { bg: '#E8F5EC', color: '#28A745', border: '#A8D5B5', label: 'Scanned'    },
}

export function StatusBadge({ status }: { status?: string }) {
  const key = status?.toUpperCase() || 'PENDING'
  const cfg = STATUS[key] || STATUS.PENDING
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 600, lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

/* ═══ FILE ICON ═══════════════════════════════════════════ */
const ICON_MAP: Record<string, { icon: any; bg: string; color: string }> = {
  pdf:  { icon: FileText,        bg: '#FEE8E8', color: '#DC2626' },
  xlsx: { icon: FileSpreadsheet, bg: '#E8F5EC', color: '#28A745' },
  xls:  { icon: FileSpreadsheet, bg: '#E8F5EC', color: '#28A745' },
  csv:  { icon: FileSpreadsheet, bg: '#E8F5EC', color: '#28A745' },
  docx: { icon: FileText,        bg: '#EFF6FF', color: '#3B82F6' },
  doc:  { icon: FileText,        bg: '#EFF6FF', color: '#3B82F6' },
  txt:  { icon: FileText,        bg: '#F3EFE8', color: '#666666' },
  png:  { icon: Image,           bg: '#FAF5FF', color: '#7C3AED' },
  jpg:  { icon: Image,           bg: '#FAF5FF', color: '#7C3AED' },
  jpeg: { icon: Image,           bg: '#FAF5FF', color: '#7C3AED' },
}

export function FileIcon({ ext, size = 'md' }: { ext?: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = ICON_MAP[ext?.toLowerCase() || ''] || { icon: File, bg: '#F3EFE8', color: '#999' }
  const Icon = cfg.icon
  const sz = size === 'sm' ? 28 : size === 'md' ? 34 : 42
  const iconSz = size === 'sm' ? 14 : size === 'md' ? 17 : 21
  const r = size === 'sm' ? 6 : size === 'md' ? 8 : 10
  return (
    <div style={{
      width: sz, height: sz, borderRadius: r,
      background: cfg.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={iconSz} color={cfg.color} strokeWidth={1.75} />
    </div>
  )
}

export function getFileExt(name?: string) {
  if (!name) return ''
  return name.split('.').pop()?.toLowerCase() || ''
}

/* ═══ COUNT-UP ════════════════════════════════════════════ */
export function CountUp({ end, duration = 1200 }: { end: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (end === 0) { setVal(0); return }
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(ease * end))
      if (progress < 1) ref.current = setTimeout(tick, 16)
    }
    ref.current = setTimeout(tick, 16)
    return () => clearTimeout(ref.current)
  }, [end, duration])

  return <>{val.toLocaleString('en-IN')}</>
}

/* ═══ EMPTY STATE ════════════════════════════════════════ */
export function EmptyState({
  icon: Icon = UploadCloud,
  title,
  description,
  action,
}: {
  icon?: any; title: string; description?: string
  action?: { label: string; href?: string; onClick?: () => void }
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} color="var(--primary)" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>{title}</p>
        {description && <p style={{ fontSize: 13.5, color: 'var(--fg-3)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>{description}</p>}
      </div>
      {action && (
        action.href
          ? <Link href={action.href} className="btn btn-primary">{action.label}</Link>
          : <button onClick={action.onClick} className="btn btn-primary">{action.label}</button>
      )}
    </div>
  )
}

/* ═══ SKELETON COMPONENTS ════════════════════════════════ */
export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '60%', height: 13, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '35%', height: 11 }} />
      </div>
      <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 6 }} />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: '40%', height: 32, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '65%', height: 13 }} />
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: '50%', height: 16, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 10 }} />
    </div>
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 15}%`, height: 13 }} />
      ))}
    </div>
  )
}

/* ═══ HELPERS ════════════════════════════════════════════ */
export function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)} hr ago`
  if (diff < 2_592_000_000) return `${Math.floor(diff/86_400_000)} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes/1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes/1048576).toFixed(1)} MB`
  return `${(bytes/1073741824).toFixed(2)} GB`
}

/* ═══ TREND BADGE ═════════════════════════════════════════ */
export function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const pos = value >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11.5, fontWeight: 700,
      color: pos ? 'var(--green)' : 'var(--red)',
    }}>
      {pos ? '↑' : '↓'}{Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

/* ═══ MINI SPARKLINE ══════════════════════════════════════ */
export function Sparkline({ data, color = 'var(--primary)' }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 56, h = 24
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ═══ PAGE TITLE ══════════════════════════════════════════ */
export function PageTitle({
  title, subtitle, breadcrumb, action
}: {
  title: string; subtitle?: string
  breadcrumb?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        {breadcrumb && (
          <p style={{ fontSize: 12.5, color: 'var(--fg-4)', marginBottom: 4 }}>
            Dashboard <span style={{ color: 'var(--fg-5)' }}>/</span> {breadcrumb}
          </p>
        )}
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)', lineHeight: 1.1 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 5, lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
