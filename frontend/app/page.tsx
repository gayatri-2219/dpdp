'use client'
/**
 * Privacy Command Center — The enterprise Overview.
 * Hero metrics → compliance gauge → risk heatmap → violations →
 * document type breakdown → recent activity.
 * All data from /api/v1/analytics/overview (PostgreSQL).
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, AlertTriangle, FileText, Zap, ChevronRight,
  TrendingUp, CheckCircle2, XCircle, Clock, UploadCloud,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  CountUp, RiskBadge, StatusBadge, FileIcon, getFileExt,
  timeAgo, SkeletonCard, TrendBadge,
} from '@/components/ui'

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')

interface Analytics {
  total_documents: number
  total_pii_found: number
  compliance_score: number
  total_violations: number
  risk_distribution: Record<string, number>
  document_types: Record<string, number>
  pii_breakdown: Record<string, number>
  dpdp_violations: Record<string, number>
  risk_counts: { critical: number; high: number; medium: number; low: number }
  recent_activity: Array<{
    id: string; filename: string; original_filename?: string
    status: string; risk_level?: string; pii_count?: number
    document_type?: string; created_at?: string
  }>
}

const RISK_COLORS = { CRITICAL: '#EF4444', HIGH: '#EB6A2A', MEDIUM: '#F59E0B', LOW: '#28A745', UNKNOWN: '#94A3B8' }
const DOC_TYPE_LABELS: Record<string, string> = {
  hr_record: 'HR Records', customer_kyc: 'Customer KYC', legal_contract: 'Legal Contracts',
  invoice: 'Invoices', resume: 'Resumes', medical: 'Medical', marketing: 'Marketing', general: 'General',
}
const DOC_TYPE_COLORS = ['#EB6A2A','#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#6B7280']

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A1A1A', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
      {label && <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{label}</p>}
      <p style={{ color: payload[0].fill || '#EB6A2A' }}>{payload[0].name}: {payload[0].value}</p>
    </div>
  )
}

// ── Compliance ring ────────────────────────────────────────────────────────────
function ComplianceRing({ score, loading }: { score: number; loading: boolean }) {
  const circ = 2 * Math.PI * 52
  const dash  = (score / 100) * circ
  const color = score >= 80 ? '#28A745' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Partial' : 'At Risk'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
      <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="52" fill="none" stroke="var(--border)" strokeWidth="12" />
          {!loading && (
            <motion.circle cx="70" cy="70" r="52" fill="none"
              stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${circ}`}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - dash }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: '70px 70px', transform: 'rotate(-90deg)' }}
            />
          )}
          <text x="70" y="64" textAnchor="middle" fontSize="26" fontWeight="900" fill="var(--fg)" fontFamily="Inter">
            {loading ? '—' : `${score}%`}
          </text>
          <text x="70" y="82" textAnchor="middle" fontSize="11" fill={color} fontFamily="Inter" fontWeight="600">
            {loading ? '' : label}
          </text>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>DPDP Compliance Score</p>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.6, marginBottom: 12 }}>
          Based on risk levels and PII exposure across all scanned documents.
        </p>
        <Link href="/compliance" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          View full compliance report <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics/overview`)
      if (res.ok) setData(await res.json())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const pieData  = Object.entries(data?.risk_distribution || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }))

  const typeData = Object.entries(data?.document_types || {}).slice(0, 6)
    .map(([k, v]) => ({ name: DOC_TYPE_LABELS[k] || k, value: v }))

  const violData = Object.entries(data?.dpdp_violations || {}).slice(0, 6)
    .map(([k, v]) => ({ name: k, value: v }))

  const score = data?.compliance_score ?? 0
  const rc    = data?.risk_counts ?? { critical: 0, high: 0, medium: 0, low: 0 }

  return (
    <div className="page-enter">

      {/* ── Top KPI Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Documents Scanned', value: data?.total_documents ?? 0,  icon: FileText,    color: 'var(--primary)', sub: 'Total indexed'           },
          { label: 'PII Records Found', value: data?.total_pii_found ?? 0,  icon: AlertTriangle,color:'var(--amber)',   sub: 'Across all documents'   },
          { label: 'Compliance Score',  value: score,                        icon: Shield,      color: 'var(--green)',  sub: score >= 80 ? 'Excellent' : 'Needs action', suffix: '%' },
          { label: 'Open Violations',   value: data?.total_violations ?? 0, icon: XCircle,     color: 'var(--red)',    sub: 'High/Critical risk docs' },
        ].map((m, i) => (
          <motion.div key={m.label} whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
            transition={{ duration: 0.14 }} className="card" style={{ padding: '20px 22px' }}>
            {loading ? <SkeletonCard /> : (
              <>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <m.icon size={17} color={m.color} strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', color: m.color, marginBottom: 3 }}>
                  <CountUp end={m.value} />{m.suffix || ''}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{m.label}</p>
                <p style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{m.sub}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Risk Alert Banner (if critical docs) ────────────────────────── */}
      {!loading && rc.critical > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: 'var(--red-light)', border: '1px solid var(--red-border)',
            borderRadius: 'var(--r-md)', marginBottom: 20,
          }}>
          <AlertTriangle size={16} color="var(--red)" />
          <p style={{ fontSize: 13.5, color: 'var(--red)', fontWeight: 600 }}>
            {rc.critical} document{rc.critical !== 1 ? 's are' : ' is'} CRITICAL risk and require immediate attention.
          </p>
          <Link href="/inventory?risk=Critical" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: 'var(--red)', textDecoration: 'none' }}>
            View now →
          </Link>
        </motion.div>
      )}

      {/* ── Row 2: Compliance Ring + Risk Distribution ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        <div className="card" style={{ padding: '24px 28px' }}>
          <ComplianceRing score={score} loading={loading} />
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              {[
                { label: 'Critical', value: rc.critical, color: '#EF4444' },
                { label: 'High',     value: rc.high,     color: '#EB6A2A' },
                { label: 'Medium',   value: rc.medium,   color: '#F59E0B' },
                { label: 'Low',      value: rc.low,      color: '#28A745' },
              ].map(r => (
                <div key={r.label} style={{ textAlign: 'center', padding: '10px 4px', borderRadius: 8, background: 'var(--bg)' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: r.color, marginBottom: 2 }}>{r.value}</p>
                  <p style={{ fontSize: 11, color: 'var(--fg-4)' }}>{r.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 20 }}>Risk Distribution</p>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PieChart width={145} height={145}>
                <Pie data={pieData} cx={68} cy={68} innerRadius={40} outerRadius={66}
                  paddingAngle={3} dataKey="value" stroke="none" animationBegin={200}>
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={RISK_COLORS[e.name as keyof typeof RISK_COLORS] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {pieData.map(e => {
                  const total = pieData.reduce((a, b) => a + b.value, 0) || 1
                  const pct   = Math.round((e.value / total) * 100)
                  const color = RISK_COLORS[e.name as keyof typeof RISK_COLORS] || '#94A3B8'
                  return (
                    <div key={e.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                          <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>{e.name}</span>
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{e.value} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg)' }}>
                        <motion.div style={{ height: 4, borderRadius: 2, background: color }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 12 }}>
              <UploadCloud size={28} color="var(--fg-4)" />
              <p style={{ fontSize: 13, color: 'var(--fg-4)', textAlign: 'center' }}>No documents scanned yet</p>
              <Link href="/scan-center" className="btn btn-primary btn-sm">Upload your first document</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Document Types + DPDP Violations ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Document Type Breakdown */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 20 }}>Document Types</p>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--fg-4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10.5, fill: 'var(--fg-4)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--bg)' }} />
                <Bar dataKey="value" name="Documents" radius={[4, 4, 0, 0]}>
                  {typeData.map((_, i) => <Cell key={i} fill={DOC_TYPE_COLORS[i % DOC_TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}>
              <p style={{ fontSize: 13, color: 'var(--fg-4)' }}>No classified documents yet</p>
            </div>
          )}
        </div>

        {/* DPDP Violations */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>DPDP Act Violations</p>
            <Link href="/compliance" style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Details <ChevronRight size={13} />
            </Link>
          </div>
          {violData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {violData.map((v, i) => (
                <div key={v.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--fg-2)', fontWeight: 500 }}>{v.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>{v.value} instances</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bg)' }}>
                    <motion.div style={{ height: 5, borderRadius: 3, background: i === 0 ? 'var(--red)' : i === 1 ? 'var(--primary)' : 'var(--amber)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(v.value / (violData[0]?.value || 1)) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
              <CheckCircle2 size={28} color="var(--green)" />
              <p style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 600 }}>No violations detected</p>
              <p style={{ fontSize: 12, color: 'var(--fg-4)' }}>Scan documents to check compliance</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>Recent Scans</p>
          <Link href="/inventory" style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
            View all <ChevronRight size={13} />
          </Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Document', 'Type', 'PII Found', 'Risk', 'Scanned'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="td">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    <div className="skeleton" style={{ width: 180, height: 13 }} />
                  </div>
                </td></tr>
              ))
              : (data?.recent_activity || []).length === 0
                ? (
                  <tr><td colSpan={5} style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--fg-4)', fontSize: 13.5 }}>
                    No documents yet.{' '}
                    <Link href="/scan-center" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Upload your first document →</Link>
                  </td></tr>
                )
                : (data!.recent_activity).map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileIcon ext={getFileExt(item.original_filename || item.filename)} size="sm" />
                        <Link href={`/scan/${item.id}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg)')}
                        >
                          {item.original_filename || item.filename}
                        </Link>
                      </div>
                    </td>
                    <td className="td">
                      <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>
                        {DOC_TYPE_LABELS[item.document_type || ''] || 'General'}
                      </span>
                    </td>
                    <td className="td" style={{ fontSize: 13.5, fontWeight: 700, color: item.pii_count ? 'var(--primary)' : 'var(--fg-4)' }}>
                      {item.pii_count ?? '—'}
                    </td>
                    <td className="td"><RiskBadge level={item.risk_level} /></td>
                    <td className="td" style={{ fontSize: 12.5, color: 'var(--fg-4)', whiteSpace: 'nowrap' }}>
                      {timeAgo(item.created_at)}
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
