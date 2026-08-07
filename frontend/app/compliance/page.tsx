'use client'
/**
 * Compliance Center — DPDP Act 2023 violation analysis.
 * All data from /api/v1/analytics/violations — zero hardcoded values.
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, CheckCircle2, XCircle, ChevronRight, FileText, BookOpen } from 'lucide-react'
import { CountUp, RiskBadge, SkeletonCard } from '@/components/ui'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

const DPDP_SECTIONS: Record<string, { title: string; desc: string; color: string }> = {
  '4':  { title: 'Section 4',  desc: 'Unlawful Purpose — data collected without defined lawful purpose',          color: '#F59E0B' },
  '6':  { title: 'Section 6',  desc: 'Consent — explicit, informed consent not obtained or recorded',            color: '#EF4444' },
  '8':  { title: 'Section 8',  desc: 'Fiduciary Duty — sensitive data unmasked or inadequately secured',         color: '#EB6A2A' },
  '9':  { title: 'Section 9',  desc: "Children's Data — age-sensitive PII without parental consent",             color: '#8B5CF6' },
  '16': { title: 'Section 16', desc: 'Cross-border Transfer — foreign PII without transfer notification',        color: '#3B82F6' },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  hr_record: 'HR Record', customer_kyc: 'Customer KYC', legal_contract: 'Legal Contract',
  invoice: 'Invoice', resume: 'Resume', medical: 'Medical', marketing: 'Marketing', general: 'General',
}

interface Violation {
  document_id: string; filename: string; risk_level: string; risk_score: number
  pii_count: number; document_type?: string; pii_types: Record<string, number>
  dpdp_sections: string[]; ai_summary?: string; retention?: string
}
interface Overview {
  total_documents: number; total_pii_found: number; compliance_score: number
  total_violations: number; dpdp_violations: Record<string, number>
  risk_counts: { critical: number; high: number; medium: number; low: number }
}

export default function CompliancePage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [overview,   setOverview]   = useState<Overview | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/analytics/violations`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/analytics/overview`).then(r => r.ok ? r.json() : null),
    ]).then(([vdata, odata]) => {
      if (vdata?.violations) setViolations(vdata.violations)
      if (odata) setOverview(odata)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const score = overview?.compliance_score ?? 0
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)'
  const scoreLabel = score >= 80 ? 'Excellent — Largely compliant' : score >= 60 ? 'Partial — Action required' : 'At Risk — Immediate attention needed'

  // Group sections from all violations
  const sectionMap: Record<string, { count: number; docs: string[] }> = {}
  violations.forEach(v => {
    v.dpdp_sections.forEach(s => {
      if (!sectionMap[s]) sectionMap[s] = { count: 0, docs: [] }
      sectionMap[s].count++
      sectionMap[s].docs.push(v.filename)
    })
  })

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--fg)' }}>Compliance Center</h1>
        <p style={{ fontSize: 13.5, color: 'var(--fg-3)', marginTop: 4 }}>
          DPDP Act 2023 — Real-time violation analysis based on your scanned documents
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Compliance Score',  value: score,                          suffix: '%',  icon: Shield,        color: scoreColor },
          { label: 'Documents Scanned', value: overview?.total_documents ?? 0, suffix: '',   icon: FileText,      color: 'var(--primary)' },
          { label: 'PII Records',       value: overview?.total_pii_found ?? 0, suffix: '',   icon: AlertTriangle, color: 'var(--amber)' },
          { label: 'Open Violations',   value: violations.length,              suffix: '',   icon: XCircle,       color: 'var(--red)' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '20px 22px' }}>
            {loading ? <SkeletonCard /> : (
              <>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <m.icon size={17} color={m.color} />
                </div>
                <p style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: m.color }}><CountUp end={m.value} />{m.suffix}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginTop: 2 }}>{m.label}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Score band */}
      <div className="card" style={{ padding: '20px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Overall DPDP Compliance</p>
            <p style={{ fontSize: 13, color: scoreColor, fontWeight: 600, marginTop: 2 }}>{scoreLabel}</p>
          </div>
          <span style={{ fontSize: 32, fontWeight: 900, color: scoreColor }}>{score}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'var(--bg)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1.2 }}
            style={{ height: 10, borderRadius: 5, background: scoreColor }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>At Risk</span>
          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>Partial</span>
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Compliant</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Violated Sections */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <BookOpen size={15} color="var(--primary)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>DPDP Act Sections Triggered</p>
          </div>
          {Object.keys(sectionMap).length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8 }}>
              <CheckCircle2 size={28} color="var(--green)" />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>No violations detected</p>
              <p style={{ fontSize: 12.5, color: 'var(--fg-4)' }}>All scanned documents pass compliance checks</p>
            </div>
          ) : Object.entries(sectionMap).map(([sec, info]) => {
            const s = DPDP_SECTIONS[sec]
            return (
              <div key={sec} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s?.color || '#EF4444'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <XCircle size={14} color={s?.color || '#EF4444'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{s?.title || `Section ${sec}`}</p>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s?.color || '#EF4444', flexShrink: 0 }}>{info.count} doc{info.count > 1 ? 's' : ''}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{s?.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recommendations */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Shield size={15} color="var(--primary)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Remediation Checklist</p>
          </div>
          {[
            { done: score >= 80, label: 'Mask sensitive PII (Aadhaar, PAN, bank accounts)', section: '§8' },
            { done: violations.filter(v => v.dpdp_sections.includes('6')).length === 0, label: 'Collect and record consent for all personal data', section: '§6' },
            { done: violations.filter(v => v.dpdp_sections.includes('9')).length === 0, label: "Apply children's data safeguards where needed", section: '§9' },
            { done: overview?.risk_counts.critical === 0, label: 'Resolve all CRITICAL risk documents immediately', section: 'Risk' },
            { done: false, label: 'Define and enforce data retention policies per document type', section: '§5' },
            { done: false, label: 'Set up grievance officer and data principal rights portal', section: '§11' },
            { done: false, label: 'Register cross-border transfer notifications if applicable', section: '§16' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: item.done ? 'var(--green-light)' : 'var(--red-light)', border: `1.5px solid ${item.done ? 'var(--green-border)' : 'var(--red-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {item.done ? <CheckCircle2 size={12} color="var(--green)" /> : <XCircle size={12} color="var(--red)" />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: item.done ? 'var(--fg-3)' : 'var(--fg)', lineHeight: 1.5, textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.label}
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0, fontWeight: 600 }}>{item.section}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Violations Table */}
      {violations.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
              Documents Requiring Attention ({violations.length})
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Document', 'Type', 'DPDP Sections', 'PII Count', 'Risk', ''].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.document_id} className="table-row">
                  <td className="td">
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.filename}
                    </p>
                  </td>
                  <td className="td">
                    <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>
                      {DOC_TYPE_LABELS[v.document_type || ''] || 'General'}
                    </span>
                  </td>
                  <td className="td">
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {v.dpdp_sections.map(s => (
                        <span key={s} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${DPDP_SECTIONS[s]?.color || '#EF4444'}18`, color: DPDP_SECTIONS[s]?.color || '#EF4444' }}>
                          §{s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="td" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{v.pii_count}</td>
                  <td className="td"><RiskBadge level={v.risk_level} /></td>
                  <td className="td">
                    <Link href={`/scan/${v.document_id}`} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      View <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
