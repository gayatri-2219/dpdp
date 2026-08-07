'use client'
/**
 * Upload & Scan — Matches mockup: drag-drop + processing pipeline + recent scans table
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud, CheckCircle2, AlertCircle, X, FileText,
  Loader2, ChevronRight, HelpCircle, Eye
} from 'lucide-react'
import { RiskBadge, StatusBadge, FileIcon, getFileExt, timeAgo, formatFileSize } from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface Doc { id: string; original_filename?: string; filename: string; file_type: string; status: string; pii_count?: number; risk_level?: string; created_at?: string; file_size?: number }

const PIPELINE = [
  { id: 'upload',     label: 'Upload',          icon: UploadCloud },
  { id: 'extract',    label: 'Extract Text',     icon: FileText    },
  { id: 'pii',        label: 'PII Detection',    icon: AlertCircle },
  { id: 'mask',       label: 'Mask Data',        icon: CheckCircle2},
  { id: 'risk',       label: 'Risk Assessment',  icon: AlertCircle },
  { id: 'compliance', label: 'Compliance Check', icon: CheckCircle2},
  { id: 'report',     label: 'Report Generation',icon: FileText    },
]

const ALLOWED = ['pdf','docx','xlsx','csv','txt','png','jpg','jpeg']

export default function ScanCenterPage() {
  const [files, setFiles]       = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [stage, setStage]       = useState(-1)          // -1 = idle, 0-6 = pipeline, 7 = done, 8 = error
  const [result, setResult]     = useState<any>(null)
  const [error, setError]       = useState<string | null>(null)
  const [recent, setRecent]     = useState<Doc[]>([])
  const [loadingRecent, setLR]  = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${API}/documents/?size=10&page=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecent(d.items || []) })
      .catch(() => {})
      .finally(() => setLR(false))
  }, [])

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid = Array.from(incoming).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      return ALLOWED.includes(ext)
    })
    setFiles(prev => [...prev, ...valid].slice(0, 5))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const upload = async () => {
    if (!files.length || stage >= 0) return
    setError(null)
    setStage(0)

    try {
      const form = new FormData()
      form.append('file', files[0])

      // Animate through stages
      for (let i = 1; i < PIPELINE.length; i++) {
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
        setStage(i)
      }

      const res = await fetch(`${API}/scan/`, { method: 'POST', body: form })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.detail || 'Scan failed')
      }
      const data = await res.json()
      setResult(data)
      setStage(7)
      setFiles([])
      // Refresh recent
      fetch(`${API}/documents/?size=10&page=1`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setRecent(d.items || []) })
    } catch (e: any) {
      setStage(8)
      setError(e.message || 'Scan failed')
    }
  }

  const reset = () => { setStage(-1); setResult(null); setError(null); setFiles([]) }
  const name = (d: Doc) => d.original_filename || d.filename

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Upload & Scan</h1>
          <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>
            Upload documents to scan for PII and assess compliance
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)', gap: 5 }}>
          <HelpCircle size={14} /> How it works?
        </button>
      </div>

      {/* Upload area */}
      <div className="card" style={{ marginBottom: 24, padding: 32 }}>
        {stage === -1 && (
          <div
            onDragEnter={e => { e.preventDefault(); setDragging(true) }}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border-strong)'}`,
              borderRadius: 14,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--primary-light)' : 'var(--bg)',
              transition: 'all 0.2s',
              minHeight: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}
          >
            <input ref={inputRef} type="file" multiple accept={ALLOWED.map(e => `.${e}`).join(',')}
              style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
            <motion.div animate={{ y: dragging ? -6 : 0 }} transition={{ duration: 0.2 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              }}>
                <UploadCloud size={28} color="var(--primary)" strokeWidth={1.75} />
              </div>
            </motion.div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 5 }}>
                Drag and drop files here
              </p>
              <p style={{ fontSize: 13.5, color: 'var(--fg-3)' }}>
                or{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>click to browse</span>
              </p>
              <p style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 8 }}>
                Supports PDF, DOCX, XLSX, CSV, TXT, PNG, JPG (Max 50MB)
              </p>
            </div>
          </div>
        )}

        {/* Selected files */}
        {files.length > 0 && stage === -1 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <FileIcon ext={getFileExt(f.name)} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{formatFileSize(f.size)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-4)', display: 'flex' }}>
                  <X size={15} />
                </button>
              </div>
            ))}
            <button onClick={upload} className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <UploadCloud size={15} /> Start Scan
            </button>
          </div>
        )}

        {/* Pipeline progress */}
        {stage >= 0 && stage <= 7 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {stage === 7 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--green-light)', border: '2px solid var(--green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
                }}>
                  <CheckCircle2 size={26} color="var(--green)" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>Scan Complete!</p>
                <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20 }}>
                  {result?.summary?.total_pii_found || 0} PII entities detected · Risk:{' '}
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{result?.summary?.risk_level || 'N/A'}</span>
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {result?.scan_id && (
                    <Link href={`/scan/${result.scan_id}`} className="btn btn-primary btn-sm">
                      <Eye size={13} /> View Report
                    </Link>
                  )}
                  <button onClick={reset} className="btn btn-secondary btn-sm">Scan Another</button>
                </div>
              </motion.div>
            ) : (
              <div>
                <Loader2 size={28} color="var(--primary)" className="spin" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>
                  {PIPELINE[stage]?.label}
                </p>
                <p style={{ fontSize: 12.5, color: 'var(--fg-4)', marginBottom: 24 }}>Processing document…</p>
              </div>
            )}
          </div>
        )}

        {stage === 8 && error && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--red-light)', border: '2px solid var(--red-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <AlertCircle size={24} color="var(--red)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 6 }}>Scan Failed</p>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>{error}</p>
            <button onClick={reset} className="btn btn-primary btn-sm">Try Again</button>
          </div>
        )}
      </div>

      {/* Processing Pipeline steps */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 20 }}>Processing Pipeline</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {PIPELINE.map((step, i) => {
            const done    = stage > i || stage === 7
            const active  = stage === i
            const pending = stage < i || stage === -1
            const Icon = step.icon
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    animate={{ scale: active ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.6, repeat: active ? Infinity : 0 }}
                    style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: done ? 'var(--primary)' : active ? 'var(--primary-light)' : 'var(--bg)',
                      border: `2px solid ${done || active ? 'var(--primary)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={18} color="#fff" />
                      : <Icon size={18} color={active ? 'var(--primary)' : 'var(--fg-4)'} strokeWidth={1.75} />
                    }
                  </motion.div>
                  <p style={{ fontSize: 10.5, fontWeight: 600, color: done ? 'var(--primary)' : active ? 'var(--primary)' : 'var(--fg-4)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {step.label}
                  </p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? 'var(--primary)' : 'var(--border)', borderRadius: 1, margin: '0 4px', marginBottom: 24 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Scans table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>Recent Scans</p>
          <Link href="/inventory" style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            View all <ChevronRight size={13} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['File Name', 'Status', 'PII Found', 'Risk Level', 'Scan Time', 'Actions'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingRecent
              ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="td">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                      <div className="skeleton" style={{ width: 160, height: 13 }} />
                    </div>
                  </td>
                </tr>
              ))
              : recent.length === 0
                ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13.5 }}>No scans yet. Upload a document above.</td></tr>
                : recent.map(doc => (
                  <tr key={doc.id} className="table-row">
                    <td className="td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileIcon ext={getFileExt(name(doc))} size="sm" />
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {name(doc)}
                        </p>
                      </div>
                    </td>
                    <td className="td"><StatusBadge status={doc.status} /></td>
                    <td className="td" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{doc.pii_count ?? '—'}</td>
                    <td className="td"><RiskBadge level={doc.risk_level} /></td>
                    <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>{timeAgo(doc.created_at)}</td>
                    <td className="td">
                      <Link href={`/scan/${doc.id}`} style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600 }}>View</Link>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
