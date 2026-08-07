'use client'
/**
 * Documents — Matches mockup exactly.
 * Table view: filename, PII found, risk level, compliance, scan date, actions.
 * Risk filter pills + search + filters button.
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Eye, Trash2, Download, Loader2 } from 'lucide-react'
import { RiskBadge, StatusBadge, FileIcon, getFileExt, timeAgo, SkeletonRow, EmptyState, formatFileSize } from '@/components/ui'

const PER_PAGE = 10
const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

interface Doc {
  id: string; filename: string; original_filename?: string
  file_type: string; file_size?: number; status: string
  risk_level?: string; risk_score?: number; pii_count?: number; created_at?: string
}

const RISK_FILTERS = ['All', 'Low', 'Medium', 'High', 'Critical']
const RISK_COLORS: Record<string, { bg: string; color: string; activeBg: string }> = {
  All:      { bg: 'var(--bg)',        color: 'var(--fg-2)',  activeBg: 'var(--fg)'       },
  Low:      { bg: 'var(--green-light)', color: 'var(--green)', activeBg: 'var(--green)'   },
  Medium:   { bg: 'var(--amber-light)', color: 'var(--amber)', activeBg: 'var(--amber)'   },
  High:     { bg: 'var(--orange-light)',color: 'var(--orange)',activeBg: 'var(--orange)'  },
  Critical: { bg: 'var(--red-light)',   color: 'var(--red)',   activeBg: 'var(--red)'     },
}


export default function InventoryPage() {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoad]    = useState(true)
  const [page, setPage]       = useState(1)
  const [risk, setRisk]       = useState('All')
  const [search, setSearch]   = useState('')
  const [actionOpen, setAction] = useState<string | null>(null)
  const [dlState, setDLState] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoad(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PER_PAGE) })
      if (risk !== 'All') params.set('risk_level', risk.toUpperCase())
      const res = await fetch(`${API}/documents/?${params}`)
      if (res.ok) {
        const data = await res.json()
        let items = data.items || []
        if (search) {
          const q = search.toLowerCase()
          items = items.filter((d: Doc) => (d.original_filename || d.filename || '').toLowerCase().includes(q))
        }
        setDocs(items)
        setTotal(search ? items.length : (data.total || 0))
      }
    } catch {}
    finally { setLoad(false) }
  }, [page, risk, search])

  useEffect(() => { fetchDocs() }, [fetchDocs])
  useEffect(() => { setPage(1) }, [risk, search])

  const downloadPDF = async (docId: string, docName: string) => {
    setDLState(s => ({ ...s, [docId]: true }))
    try {
      const res = await fetch(`${API}/export/${docId}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DPDP_Report_${docName.replace(/\.[^.]+$/, '')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.message || 'Download failed')
    } finally {
      setDLState(s => ({ ...s, [docId]: false }))
    }
  }

  const deleteDoc = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return
    setDeleting(docId)
    try {
      const res = await fetch(`${API}/documents/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== docId))
        setTotal(prev => Math.max(0, prev - 1))
      } else {
        alert('Delete failed. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE)
  const name = (d: Doc) => d.original_filename || d.filename
  const complianceScore = (d: Doc) =>
    d.risk_score != null ? `${Math.round(100 - d.risk_score)}%` : '—'

  return (
    <div className="page-enter" onClick={() => setAction(null)}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)', marginBottom: 4 }}>
          Documents
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-3)' }}>
          Manage and view all your scanned documents
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 36, padding: '0 12px', flex: 1, maxWidth: 320,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-xs)',
        }}>
          <Search size={14} color="var(--fg-4)" style={{ flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)' }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <button className="btn btn-secondary btn-sm">
          <Filter size={13} /> Filters
        </button>
      </div>

      {/* Risk filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        {RISK_FILTERS.map(r => {
          const cfg = RISK_COLORS[r]
          const active = risk === r
          return (
            <button
              key={r}
              onClick={() => setRisk(r)}
              style={{
                padding: '4px 12px', borderRadius: 20,
                border: `1px solid ${active ? cfg.activeBg : 'var(--border)'}`,
                background: active ? cfg.activeBg : 'var(--card)',
                color: active ? '#fff' : cfg.color,
                fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {r !== 'All' && (
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: active ? 'rgba(255,255,255,0.7)' : cfg.color,
                  marginRight: 5,
                }} />
              )}
              {r}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Document', 'PII Found', 'Risk Level', 'Compliance', 'Scan Date', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
              ))
              : docs.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No documents found"
                        description={risk !== 'All' ? `No ${risk.toLowerCase()} risk documents.` : 'Upload your first document to get started.'}
                        action={{ label: 'Upload Document', href: '/scan-center' }}
                      />
                    </td>
                  </tr>
                )
                : docs.map(doc => (
                  <tr key={doc.id} className="table-row" style={{ cursor: 'pointer' }}>
                    {/* Document */}
                    <td className="td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileIcon ext={getFileExt(name(doc))} size="sm" />
                        <div style={{ minWidth: 0 }}>
                          <Link href={`/scan/${doc.id}`} style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--fg)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            display: 'block', maxWidth: 220, textDecoration: 'none',
                          }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg)')}
                          >
                            {name(doc)}
                          </Link>
                        </div>
                      </div>
                    </td>

                    {/* PII Found */}
                    <td className="td">
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: doc.pii_count ? 'var(--primary)' : 'var(--fg-4)' }}>
                        {doc.pii_count ?? '—'}
                      </span>
                    </td>

                    {/* Risk Level */}
                    <td className="td"><RiskBadge level={doc.risk_level} /></td>

                    {/* Compliance */}
                    <td className="td">
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                        {complianceScore(doc)}
                      </span>
                    </td>

                    {/* Scan Date */}
                    <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>
                      {timeAgo(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="td">
                      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setAction(actionOpen === doc.id ? null : doc.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px 6px', borderRadius: 6,
                            color: 'var(--fg-3)', display: 'flex',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          {deleting === doc.id
                            ? <Loader2 size={16} className="spin" />
                            : <MoreHorizontal size={16} />}
                        </button>
                        {actionOpen === doc.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%', zIndex: 50,
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: 10, boxShadow: 'var(--shadow-lg)',
                            minWidth: 160, padding: 4,
                          }}>
                            {/* View Report */}
                            <Link href={`/scan/${doc.id}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 7,
                                fontSize: 12.5, fontWeight: 500, color: 'var(--fg)',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}
                            >
                              <Eye size={13} /> View Report
                            </Link>
                            {/* Download PDF */}
                            <button
                              onClick={() => { setAction(null); downloadPDF(doc.id, name(doc)) }}
                              disabled={dlState[doc.id]}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                fontSize: 12.5, fontWeight: 500, color: 'var(--fg)',
                                background: 'none', textAlign: 'left',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              {dlState[doc.id]
                                ? <Loader2 size={13} className="spin" />
                                : <Download size={13} />}
                              {dlState[doc.id] ? 'Downloading…' : 'Download PDF'}
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => { setAction(null); deleteDoc(doc.id, name(doc)) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                fontSize: 12.5, fontWeight: 500, color: 'var(--red)',
                                background: 'none', textAlign: 'left',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-light)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 34 }}>
                {p}
              </button>
            )
          })}

          {totalPages > 5 && <span style={{ color: 'var(--fg-4)', fontSize: 13 }}>…</span>}
          {totalPages > 5 && (
            <button onClick={() => setPage(totalPages)}
              className={`btn btn-sm ${page === totalPages ? 'btn-primary' : 'btn-secondary'}`}
              style={{ minWidth: 34 }}>
              {totalPages}
            </button>
          )}

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary btn-sm"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
