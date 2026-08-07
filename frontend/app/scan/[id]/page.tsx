'use client'
/**
 * Document Intelligence — Per-document enterprise view.
 * 3-column: Info + Classification | PII Entities | Risk + Violations + Actions
 * All features work: Download PDF, Export CSV, Re-scan, Delete.
 */
import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Shield, Download, AlertTriangle, CheckCircle2,
  ChevronRight, RefreshCw, Trash2, FileText, Clock, Tag,
  XCircle, Info,
} from 'lucide-react'
import { RiskBadge, StatusBadge, FileIcon, getFileExt, timeAgo, formatFileSize, SkeletonText, SkeletonCard, CountUp } from '@/components/ui'
import { useRouter } from 'next/navigation'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

const DOC_TYPE_LABELS: Record<string, string> = {
  hr_record: 'HR Record', customer_kyc: 'Customer KYC', legal_contract: 'Legal Contract',
  invoice: 'Financial Invoice', resume: 'Resume / CV', medical: 'Medical Record',
  marketing: 'Marketing List', general: 'General Document',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  hr_record: '👥', customer_kyc: '🪪', legal_contract: '📋',
  invoice: '🧾', resume: '📄', medical: '🏥', marketing: '📢', general: '📁',
}

const PII_COLORS: Record<string, string> = {
  PERSON: '#3B82F6', EMAIL_ADDRESS: '#8B5CF6', MOBILE: '#EB6A2A',
  PHONE_NUMBER: '#EB6A2A', AADHAAR: '#EF4444', PAN: '#F59E0B',
  ADDRESS: '#10B981', DATE_OF_BIRTH: '#F97316', CREDIT_CARD: '#DC2626',
  BANK_ACCOUNT: '#DC2626', SALARY: '#8B5CF6',
}

const DPDP_SECTIONS: Record<string, { title: string; desc: string }> = {
  '4':  { title: 'Section 4 — Lawful Purpose',         desc: 'Data collected without a defined lawful purpose.' },
  '6':  { title: 'Section 6 — Consent',                desc: 'Explicit consent not obtained or recorded.' },
  '8':  { title: 'Section 8 — Data Fiduciary Duty',    desc: 'Sensitive data unmasked or inadequately secured.' },
  '9':  { title: 'Section 9 — Children\'s Data',       desc: 'Age-sensitive data detected without parental consent.' },
  '16': { title: 'Section 16 — Cross-border Transfer', desc: 'Foreign PII present without transfer notification.' },
}

interface Document {
  id: string; filename: string; original_filename?: string
  file_type: string; file_size?: number; status: string
  risk_level?: string; risk_score?: number; pii_count?: number
  created_at?: string; page_count?: number; document_type?: string
  ai_summary?: string; violations_json?: string; retention_policy?: string
  department?: string
}
interface PIIEntity {
  id: string; entity_type: string; entity_value: string; masked_value?: string
  confidence: number; detector_source: string; page_num?: number
}

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [doc,      setDoc]      = useState<Document | null>(null)
  const [pii,      setPii]      = useState<PIIEntity[]>([])
  const [loadD,    setLD]       = useState(true)
  const [loadP,    setLP]       = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [rescanning, setRescan] = useState(false)
  const [deleting,   setDel]    = useState(false)
  const [downloading, setDL]    = useState(false)

  const fetchDoc = useCallback(async () => {
    setLD(true)
    try {
      const r = await fetch(`${API}/documents/${id}`)
      if (!r.ok) throw new Error('Not found')
      setDoc(await r.json())
    } catch (e: any) { setError(e.message) }
    finally { setLD(false) }
  }, [id])

  const fetchPii = useCallback(async () => {
    setLP(true)
    try {
      const r = await fetch(`${API}/analyze/${id}/pii`)
      if (r.ok) setPii(await r.json())
    } catch {}
    finally { setLP(false) }
  }, [id])

  useEffect(() => { fetchDoc(); fetchPii() }, [fetchDoc, fetchPii])

  // Working: Download PDF report
  const downloadPDF = async () => {
    setDL(true)
    try {
      const res = await fetch(`${API}/export/${id}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DPDP_Report_${(doc?.original_filename || id).replace(/\.[^.]+$/, '')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.message) }
    finally { setDL(false) }
  }

  // Working: Export Excel
  const downloadExcel = async () => {
    try {
      const res = await fetch(`${API}/export/${id}/excel`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DPDP_Report_${(doc?.original_filename || id).replace(/\.[^.]+$/, '')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert(e.message) }
  }

  // Working: Re-scan
  const rescan = async () => {
    if (!confirm('Re-scan this document? Existing PII results will be replaced.')) return
    setRescan(true)
    try {
      const res = await fetch(`${API}/scan/${id}/rescan`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Re-scan failed') }
      await fetchDoc(); await fetchPii()
    } catch (e: any) { alert(e.message) }
    finally { setRescan(false) }
  }

  // Working: Delete
  const deleteDoc = async () => {
    if (!confirm('Permanently delete this document and all its scan data?')) return
    setDel(true)
    try {
      const res = await fetch(`${API}/documents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/inventory')
    } catch (e: any) { alert(e.message); setDel(false) }
  }

  const name       = doc?.original_filename || doc?.filename || '—'
  const score      = doc?.risk_score != null ? Math.round(100 - doc.risk_score) : null
  const violations = (() => { try { return JSON.parse(doc?.violations_json || '[]') as string[] } catch { return [] } })()
  const byType: Record<string, number> = {}
  pii.forEach(p => { byType[p.entity_type] = (byType[p.entity_type] || 0) + 1 })
  const topTypes = Object.entries(byType).sort(([, a], [, b]) => b - a)
  const docType  = doc?.document_type || 'general'

  if (error) return (
    <div className="page-enter" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Document not found</p>
      <Link href="/inventory" className="btn btn-primary btn-sm"><ArrowLeft size={14} /> Back</Link>
    </div>
  )

  return (
    <div className="page-enter">
      {/* Breadcrumb + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/inventory" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Documents</Link>
          <ChevronRight size={14} color="var(--fg-4)" />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loadD ? '…' : name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={rescan} disabled={rescanning} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} className={rescanning ? 'spin' : ''} />
            {rescanning ? 'Re-scanning…' : 'Re-scan'}
          </button>
          <button onClick={downloadExcel} className="btn btn-secondary btn-sm">
            <Download size={13} /> Excel
          </button>
          <button onClick={downloadPDF} disabled={downloading} className="btn btn-primary btn-sm">
            <Download size={13} /> {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <button onClick={deleteDoc} disabled={deleting} className="btn btn-sm"
            style={{ background: 'var(--red-light)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
            <Trash2 size={13} /> {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 16 }}>

        {/* ── Col 1: Document Info + Classification ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Doc card */}
          <div className="card" style={{ padding: 22 }}>
            {loadD ? <SkeletonCard /> : doc && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <FileIcon ext={getFileExt(name)} size="lg" />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
                {[
                  { label: 'Type',       value: doc.file_type?.toUpperCase() || '—' },
                  { label: 'Size',       value: formatFileSize(doc.file_size) },
                  { label: 'Pages',      value: String(doc.page_count || 1) },
                  { label: 'Scanned',    value: timeAgo(doc.created_at) },
                  { label: 'Department', value: doc.department || 'General' },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>{f.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{f.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Classification */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Tag size={14} color="var(--primary)" />
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>Classification</p>
            </div>
            {loadD ? <SkeletonCard /> : (
              <>
                <div style={{ padding: '12px 14px', background: 'var(--primary-light)', border: '1px solid var(--primary-border)', borderRadius: 10, marginBottom: 12 }}>
                  <p style={{ fontSize: 18, marginBottom: 4 }}>{DOC_TYPE_ICONS[docType] || '📁'}</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>{DOC_TYPE_LABELS[docType] || 'General Document'}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>Retention</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', maxWidth: 150, textAlign: 'right' }}>{doc?.retention_policy || 'As per policy'}</span>
                </div>
              </>
            )}
          </div>

          {/* PII Breakdown */}
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>PII Breakdown</p>
            {loadP ? <SkeletonText lines={4} /> : topTypes.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                <CheckCircle2 size={24} color="var(--green)" />
                <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>No PII Detected</p>
              </div>
            ) : topTypes.map(([type, count]) => (
              <div key={type} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 500 }}>{type.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{count}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)' }}>
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${(count / (topTypes[0][1] || 1)) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    style={{ height: 4, borderRadius: 2, background: PII_COLORS[type] || 'var(--primary)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 2: PII Entities ───────────────────────────────── */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
              Detected PII{!loadP && ` · ${pii.length} entities`}
            </p>
            {pii.length > 0 && (
              <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 20, background: 'var(--red-light)', color: 'var(--red)', fontWeight: 600, border: '1px solid var(--red-border)' }}>
                Requires attention
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadP ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <SkeletonText lines={2} />
                </div>
              ))
            ) : pii.length === 0 ? (
              <div style={{ padding: '48px 22px', textAlign: 'center' }}>
                <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>No PII Detected</p>
                <p style={{ fontSize: 13, color: 'var(--fg-4)', marginTop: 4 }}>Document appears to be safe</p>
              </div>
            ) : pii.map(e => (
              <div key={e.id} style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = '')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                      background: `${PII_COLORS[e.entity_type] || 'var(--primary)'}18`,
                      color: PII_COLORS[e.entity_type] || 'var(--primary)',
                    }}>
                      {e.entity_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{e.detector_source}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>
                    {Math.round(e.confidence * 100)}%
                    {e.page_num != null && ` · p.${e.page_num + 1}`}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--fg-4)', marginBottom: 3 }}>Original</p>
                    <code style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', background: 'var(--red-light)', padding: '2px 6px', borderRadius: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.entity_value}
                    </code>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--fg-4)', marginBottom: 3 }}>Masked</p>
                    <code style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'var(--green-light)', padding: '2px 6px', borderRadius: 4, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.masked_value || '****'}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 3: Risk + Violations + Actions ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Risk Score */}
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>Risk Assessment</p>
            {loadD ? <SkeletonCard /> : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <RiskBadge level={doc?.risk_level} />
                  <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: score && score >= 80 ? 'var(--green)' : score && score >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                    {score !== null ? `${score}%` : '—'}
                  </span>
                </div>
                {score !== null && (
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--bg)', marginBottom: 10 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }}
                      style={{ height: 8, borderRadius: 4, background: score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)' }} />
                  </div>
                )}
                {[
                  { label: 'PII Entities',  value: String(doc?.pii_count || 0) },
                  { label: 'Risk Score',    value: doc?.risk_score != null ? `${Math.round(doc.risk_score)}/100` : '—' },
                  { label: 'Pages Scanned', value: String(doc?.page_count || 1) },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>{f.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{f.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* DPDP Violations */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <XCircle size={14} color={violations.length > 0 ? 'var(--red)' : 'var(--green)'} />
              <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>DPDP Violations</p>
            </div>
            {violations.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--green-light)', borderRadius: 8, border: '1px solid var(--green-border)' }}>
                <CheckCircle2 size={15} color="var(--green)" />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>No violations detected</p>
              </div>
            ) : violations.map(sec => {
              const s = DPDP_SECTIONS[sec]
              return (
                <div key={sec} style={{ padding: '10px 12px', background: 'var(--red-light)', borderRadius: 8, border: '1px solid var(--red-border)', marginBottom: 8 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>{s?.title || `Section ${sec}`}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5 }}>{s?.desc || 'Compliance violation detected.'}</p>
                </div>
              )
            })}
          </div>

          {/* AI Summary */}
          {doc?.ai_summary && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Info size={14} color="var(--primary)" />
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>AI Analysis</p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.65 }}>{doc.ai_summary}</p>
            </div>
          )}

          {/* Actions */}
          <div className="card" style={{ padding: 22 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={downloadPDF} disabled={downloading} className="btn btn-primary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Download size={13} /> {downloading ? 'Generating…' : 'Download PDF Report'}
              </button>
              <button onClick={downloadExcel} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <Download size={13} /> Export to Excel
              </button>
              <Link href="/copilot" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
                <Shield size={13} /> Ask AI about this doc
              </Link>
              <button onClick={rescan} disabled={rescanning} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>
                <RefreshCw size={13} className={rescanning ? 'spin' : ''} />
                {rescanning ? 'Re-scanning…' : 'Re-scan Document'}
              </button>
              <button onClick={deleteDoc} disabled={deleting}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 'var(--r-sm)', border: '1px solid var(--red-border)', background: 'var(--red-light)', color: 'var(--red)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s' }}>
                <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
