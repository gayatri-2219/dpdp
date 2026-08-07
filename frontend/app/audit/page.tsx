'use client'
/**
 * Audit Logs — Enterprise table matching mockup.
 * Sticky header, search, sortable, expandable rows, CSV export.
 */
import { Fragment, useState, useEffect, useMemo } from 'react'
import { Search, Download, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import {
  RiskBadge, StatusBadge, FileIcon, getFileExt,
  timeAgo, formatFileSize, SkeletonRow, EmptyState,
} from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface Entry {
  id: string; filename: string; original_filename?: string
  file_type: string; status: string; risk_level?: string
  pii_count?: number; created_at?: string; file_size?: number; risk_score?: number
}

const COLS = [
  { label: 'Document', key: 'filename'   },
  { label: 'Type',     key: 'file_type'  },
  { label: 'Risk',     key: 'risk_level' },
  { label: 'PII',      key: 'pii_count'  },
  { label: 'Status',   key: 'status'     },
  { label: 'Scanned',  key: 'created_at' },
  { label: 'Details',  key: ''           },
]

export default function AuditPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoad]    = useState(true)
  const [search, setSearch]   = useState('')
  const [expanded, setExp]    = useState<string | null>(null)
  const [sort, setSort]       = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'created_at', dir: 'desc' })

  useEffect(() => {
    fetch(`${API}/documents/?size=100&page=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEntries(d.items || []) })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const getName = (e: Entry) => e.original_filename || e.filename

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries
      .filter(e => !q
        || getName(e).toLowerCase().includes(q)
        || (e.risk_level || '').toLowerCase().includes(q)
        || (e.status || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const av = String(((a as unknown) as Record<string, unknown>)[sort.key] ?? '')
        const bv = String(((b as unknown) as Record<string, unknown>)[sort.key] ?? '')
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [entries, search, sort])

  const toggleSort = (key: string) =>
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' })

  const exportCSV = async () => {
    try {
      const res = await fetch(`${API}/analytics/export/audit-csv`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `dpdp_audit_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: build CSV from local data
      const header = ['ID', 'Filename', 'Type', 'Status', 'Risk', 'PII', 'Size', 'Date']
      const rows = filtered.map(e => [
        e.id, getName(e), e.file_type, e.status,
        e.risk_level ?? '', e.pii_count ?? 0,
        formatFileSize(e.file_size), e.created_at ?? '',
      ])
      const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    }
  }

  const sortIcon = (key: string) => {
    if (!key) return null
    if (sort.key !== key) return <span style={{ opacity: 0.4, marginLeft: 3, fontSize: 10 }}>↕</span>
    return <span style={{ color: 'var(--primary)', marginLeft: 3, fontSize: 10 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Audit Logs</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>
            {filtered.length} events &middot; {entries.length} total scanned documents
          </p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 38, padding: '0 12px', maxWidth: 400,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-xs)',
        marginBottom: 20,
      }}>
        <Search size={14} color="var(--fg-4)" style={{ flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename, status, risk..."
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)' }}
        />
      </div>

      {/* Empty state */}
      {!loading && entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit events yet"
          description="Every document scan creates an audit entry. Upload your first document to begin."
          action={{ label: 'Upload Document', href: '/scan-center' }}
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* Sticky header */}
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.label}
                      className="th"
                      onClick={() => col.key && toggleSort(col.key)}
                      style={{ cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}
                    >
                      {col.label}
                      {sortIcon(col.key)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7}><SkeletonRow /></td>
                    </tr>
                  ))
                  : filtered.map(entry => (
                    <Fragment key={entry.id}>
                      {/* Main row */}
                      <tr
                        className="table-row"
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
                        onClick={() => setExp(prev => prev === entry.id ? null : entry.id)}
                      >
                        <td className="td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileIcon ext={getFileExt(getName(entry))} size="sm" />
                            <div style={{ minWidth: 0 }}>
                              <p style={{
                                fontSize: 13, fontWeight: 600, color: 'var(--fg)',
                                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {getName(entry)}
                              </p>
                              <p style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
                                {entry.id.slice(0, 8)}&hellip;
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="td" style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {entry.file_type || '—'}
                        </td>
                        <td className="td"><RiskBadge level={entry.risk_level} size="sm" /></td>
                        <td className="td" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>
                          {entry.pii_count ?? '—'}
                        </td>
                        <td className="td"><StatusBadge status={entry.status} /></td>
                        <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>
                          {timeAgo(entry.created_at)}
                        </td>
                        <td className="td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Link
                              href={`/scan/${entry.id}`}
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}
                            >
                              View
                            </Link>
                            {expanded === entry.id
                              ? <ChevronUp size={13} color="var(--fg-4)" />
                              : <ChevronDown size={13} color="var(--fg-4)" />
                            }
                          </div>
                        </td>
                      </tr>

                      {/* Expandable detail row — CSS max-height transition, no AnimatePresence in tbody */}
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 0,
                            overflow: 'hidden',
                            maxHeight: expanded === entry.id ? 160 : 0,
                            transition: 'max-height 0.22s ease',
                            borderBottom: expanded === entry.id ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 16,
                            padding: expanded === entry.id ? '16px 24px' : '0 24px',
                            background: 'var(--bg)',
                            transition: 'padding 0.22s ease',
                          }}>
                            {[
                              { label: 'Full ID',        value: entry.id },
                              { label: 'File Size',      value: formatFileSize(entry.file_size) },
                              { label: 'Risk Score',     value: entry.risk_score != null ? `${Math.round(entry.risk_score)}/100` : '—' },
                              { label: 'Scan Timestamp', value: entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : '—' },
                            ].map(f => (
                              <div key={f.label}>
                                <p style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 4 }}>{f.label}</p>
                                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', wordBreak: 'break-all' }}>{f.value}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
