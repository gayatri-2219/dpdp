'use client'
/**
 * Reports — Generate and download professional compliance reports.
 * Every button works: PDF (via /export/{id}/pdf), CSV (via audit table export).
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Download, FileText, Search, Filter, CheckCircle2, Loader2 } from 'lucide-react'
import { RiskBadge, FileIcon, getFileExt, timeAgo, formatFileSize, SkeletonRow, EmptyState } from '@/components/ui'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

interface Doc {
  id: string; filename: string; original_filename?: string
  file_type: string; file_size?: number; risk_level?: string
  risk_score?: number; pii_count?: number; created_at?: string
  document_type?: string; status: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  hr_record: 'HR Record', customer_kyc: 'Customer KYC', legal_contract: 'Legal Contract',
  invoice: 'Invoice', resume: 'Resume', medical: 'Medical', marketing: 'Marketing', general: 'General',
}

export default function ReportsPage() {
  const [docs,       setDocs]       = useState<Doc[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')
  const [dlStates,   setDLStates]   = useState<Record<string, 'idle' | 'loading' | 'done'>>({})

  useEffect(() => {
    fetch(`${API}/documents/?size=100&page=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.items) setDocs(d.items) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = docs.filter(d => {
    const name = (d.original_filename || d.filename).toLowerCase()
    const q    = search.toLowerCase()
    const matchQ = !q || name.includes(q)
    const matchF = filter === 'all' || (d.risk_level || '').toLowerCase() === filter
    return matchQ && matchF && d.status === 'COMPLETED'
  })

  const downloadPDF = async (docId: string, docName: string) => {
    setDLStates(s => ({ ...s, [docId + '_pdf']: 'loading' }))
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
      setDLStates(s => ({ ...s, [docId + '_pdf']: 'done' }))
      setTimeout(() => setDLStates(s => ({ ...s, [docId + '_pdf']: 'idle' })), 2000)
    } catch (e: any) {
      alert(e.message)
      setDLStates(s => ({ ...s, [docId + '_pdf']: 'idle' }))
    }
  }

  const downloadExcel = async (docId: string, docName: string) => {
    setDLStates(s => ({ ...s, [docId + '_xl']: 'loading' }))
    try {
      const res = await fetch(`${API}/export/${docId}/excel`)
      if (!res.ok) throw new Error('Excel export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DPDP_Report_${docName.replace(/\.[^.]+$/, '')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setDLStates(s => ({ ...s, [docId + '_xl']: 'done' }))
      setTimeout(() => setDLStates(s => ({ ...s, [docId + '_xl']: 'idle' })), 2000)
    } catch (e: any) {
      alert(e.message)
      setDLStates(s => ({ ...s, [docId + '_xl']: 'idle' }))
    }
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Reports</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>
            Download professional PDF and Excel compliance reports for every scanned document
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 14px', borderRadius: 'var(--r-sm)', background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={13} color="var(--green)" />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--green)' }}>Real-time PDF Generation</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', flex: 1, maxWidth: 360, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <Search size={13} color="var(--fg-4)" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)' }} />
        </div>
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              height: 36, padding: '0 14px', borderRadius: 'var(--r-sm)', fontSize: 12.5, fontWeight: 600,
              background: filter === f ? 'var(--primary)' : 'var(--card)',
              color: filter === f ? '#fff' : 'var(--fg-3)',
              border: filter === f ? 'none' : '1px solid var(--border)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 'var(--r-md)', marginBottom: 20 }}>
        <FileText size={14} color="var(--primary)" />
        <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--primary)' }}>PDF reports</strong> include executive summary, risk assessment, full PII inventory, DPDP violations, and AI recommendations.{' '}
          <strong style={{ color: 'var(--primary)' }}>Excel exports</strong> include PII entities, breakdown, and summary — ready for auditors.
        </p>
      </div>

      {/* Document table */}
      {!loading && filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No completed scans" description="Scan documents first to generate compliance reports." action={{ label: 'Upload documents', href: '/scan-center' }} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Document', 'Type', 'PII Found', 'Risk', 'Scanned', 'Reports'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><SkeletonRow /></td></tr>
                ))
                : filtered.map(doc => {
                  const name    = doc.original_filename || doc.filename
                  const pdfKey  = doc.id + '_pdf'
                  const xlKey   = doc.id + '_xl'
                  const pdfSt   = dlStates[pdfKey] || 'idle'
                  const xlSt    = dlStates[xlKey]  || 'idle'
                  return (
                    <tr key={doc.id} className="table-row">
                      <td className="td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileIcon ext={getFileExt(name)} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/scan/${doc.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {name}
                            </Link>
                            <p style={{ fontSize: 11, color: 'var(--fg-4)' }}>{formatFileSize(doc.file_size)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-3)', fontWeight: 500 }}>
                        {DOC_TYPE_LABELS[doc.document_type || ''] || 'General'}
                      </td>
                      <td className="td" style={{ fontSize: 13, fontWeight: 700, color: doc.pii_count ? 'var(--primary)' : 'var(--fg-4)' }}>
                        {doc.pii_count ?? '—'}
                      </td>
                      <td className="td"><RiskBadge level={doc.risk_level} size="sm" /></td>
                      <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>{timeAgo(doc.created_at)}</td>
                      <td className="td">
                        <div style={{ display: 'flex', gap: 7 }}>
                          {/* PDF Download */}
                          <button onClick={() => downloadPDF(doc.id, name)} disabled={pdfSt === 'loading'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                              borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600,
                              background: pdfSt === 'done' ? 'var(--green-light)' : 'var(--primary-light)',
                              color: pdfSt === 'done' ? 'var(--green)' : 'var(--primary)',
                              border: `1px solid ${pdfSt === 'done' ? 'var(--green-border)' : 'var(--primary-border)'}`,
                              cursor: pdfSt === 'loading' ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s',
                            }}>
                            {pdfSt === 'loading' ? <Loader2 size={11} className="spin" /> : pdfSt === 'done' ? <CheckCircle2 size={11} /> : <Download size={11} />}
                            {pdfSt === 'done' ? 'Done!' : 'PDF'}
                          </button>
                          {/* Excel Download */}
                          <button onClick={() => downloadExcel(doc.id, name)} disabled={xlSt === 'loading'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                              borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600,
                              background: xlSt === 'done' ? 'var(--green-light)' : 'var(--bg)',
                              color: xlSt === 'done' ? 'var(--green)' : 'var(--fg-3)',
                              border: `1px solid ${xlSt === 'done' ? 'var(--green-border)' : 'var(--border)'}`,
                              cursor: xlSt === 'loading' ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s',
                            }}>
                            {xlSt === 'loading' ? <Loader2 size={11} className="spin" /> : xlSt === 'done' ? <CheckCircle2 size={11} /> : <Download size={11} />}
                            {xlSt === 'done' ? 'Done!' : 'Excel'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
