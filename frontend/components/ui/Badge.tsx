'use client'
/**
 * Badge components — RiskBadge and StatusBadge
 * Warm palette, slightly larger than before.
 */

interface RiskBadgeProps {
  level?: string | null
  size?: 'sm' | 'md'
}

const RISK_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; dot: string }> = {
  LOW:      { label: 'Low',      bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
  MEDIUM:   { label: 'Medium',  bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
  HIGH:     { label: 'High',    bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', dot: '#F97316' },
  CRITICAL: { label: 'Critical', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', dot: '#EF4444' },
}

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const key = (level || 'UNKNOWN').toUpperCase()
  const cfg = RISK_CONFIG[key]

  if (!cfg) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full font-medium"
        style={{
          fontSize: size === 'sm' ? '10px' : '11.5px',
          padding: size === 'sm' ? '2px 7px' : '3px 9px',
          background: '#F3F4F6',
          color: '#6B7280',
          border: '1px solid #E5E7EB',
        }}
      >
        —
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold"
      style={{
        fontSize: size === 'sm' ? '10px' : '11.5px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  )
}

/* ── Status Badge ─────────────────────────────────────────────────────────── */
interface StatusBadgeProps {
  status?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  completed:  { label: 'Completed',  bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  scanned:    { label: 'Scanned',    bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  scanning:   { label: 'Scanning',   bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  processing: { label: 'Processing', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  pending:    { label: 'Pending',    bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  failed:     { label: 'Failed',     bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  error:      { label: 'Error',      bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = (status || '').toLowerCase()
  const cfg = STATUS_CONFIG[key]

  if (!cfg) {
    return (
      <span
        className="inline-flex items-center rounded-full font-medium"
        style={{
          fontSize: '10.5px',
          padding: '2px 8px',
          background: '#F3F4F6',
          color: '#9CA3AF',
          border: '1px solid #E5E7EB',
        }}
      >
        {status || 'Unknown'}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center rounded-full font-semibold capitalize"
      style={{
        fontSize: '10.5px',
        padding: '2px 8px',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  )
}
