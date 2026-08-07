'use client'
/**
 * FileIcon — colored icon for file types
 * FileIcon utility and timeAgo/formatFileSize helpers
 */

interface FileIconProps {
  ext?: string
  size?: 'sm' | 'md' | 'lg'
}

const EXT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pdf:  { label: 'PDF',  bg: '#FEF2F2', color: '#DC2626' },
  docx: { label: 'DOC', bg: '#EFF6FF', color: '#2563EB' },
  doc:  { label: 'DOC', bg: '#EFF6FF', color: '#2563EB' },
  xlsx: { label: 'XLS', bg: '#F0FDF4', color: '#16A34A' },
  xls:  { label: 'XLS', bg: '#F0FDF4', color: '#16A34A' },
  csv:  { label: 'CSV', bg: '#ECFDF5', color: '#059669' },
  txt:  { label: 'TXT', bg: '#F5F5F4', color: '#78716C' },
  png:  { label: 'PNG', bg: '#FAF5FF', color: '#9333EA' },
  jpg:  { label: 'JPG', bg: '#FAF5FF', color: '#9333EA' },
  jpeg: { label: 'JPG', bg: '#FAF5FF', color: '#9333EA' },
}

const SIZES = {
  sm: { box: 28, font: '8px', radius: '6px' },
  md: { box: 36, font: '9px', radius: '8px' },
  lg: { box: 44, font: '11px', radius: '10px' },
}

export function FileIcon({ ext, size = 'md' }: FileIconProps) {
  const key = (ext || '').toLowerCase()
  const cfg = EXT_CONFIG[key] || { label: (ext || '?').toUpperCase().slice(0, 3), bg: '#F3F4F6', color: '#9CA3AF' }
  const s = SIZES[size]

  return (
    <div
      className="flex items-center justify-center shrink-0 font-bold"
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        background: cfg.bg,
        color: cfg.color,
        fontSize: s.font,
        letterSpacing: '0.02em',
        border: `1px solid ${cfg.bg === '#F3F4F6' ? '#E5E7EB' : cfg.color + '30'}`,
      }}
    >
      {cfg.label}
    </div>
  )
}

/* ── Utilities ────────────────────────────────────────────────────────────── */

export function getFileExt(filename?: string): string {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = Math.floor((now - then) / 1000)
    if (diff < 60)   return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return '—'
  }
}
