'use client'
/**
 * Analytics — Charts, trends, PII breakdown.
 * API: GET /api/v1/dashboard/stats → risk_distribution, pii_type_breakdown
 * Tables: documents, pii_entities
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, PieChart as PieIcon, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from 'recharts'
import { CountUp, SkeletonChart, EmptyState } from '@/components/ui'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

interface Stats {
  total_documents: number; total_pii_found: number
  risk_distribution: Record<string, number>
  pii_type_breakdown: Record<string, number>
}

const RISK_COLORS = { LOW:'#1A9E5C', MEDIUM:'#D97706', HIGH:'#EA580C', CRITICAL:'#DC2626' }

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1A1A1A', color:'#fff', padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:600 }}>
      {label && <p style={{ color:'var(--fg-3)', marginBottom:4 }}>{label}</p>}
      <span style={{ color: payload[0].fill || 'var(--orange)' }}>{payload[0].name || payload[0].dataKey}</span>
      {' · '}{payload[0].value}
    </div>
  )
}

export default function AnalyticsPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoad]  = useState(true)

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  if (!loading && (!stats || stats.total_documents === 0)) {
    return (
      <div className="page-enter">
        <div className="mb-8">
          <p className="eyebrow mb-2" style={{ color: 'var(--orange)' }}>INTELLIGENCE</p>
          <h1 className="text-[32px] font-black" style={{ color:'var(--fg)', letterSpacing:'-0.04em' }}>Analytics</h1>
        </div>
        <EmptyState icon={BarChart2} title="No analytics data yet"
          description="Upload and scan documents to generate charts and trend analysis."
          action={{ label:'Upload Document', href:'/scan-center' }} />
      </div>
    )
  }

  const pieParts = ['LOW','MEDIUM','HIGH','CRITICAL']
    .filter(k => (stats?.risk_distribution?.[k] || 0) > 0)
    .map(k => ({ name: k, value: stats!.risk_distribution[k], fill: RISK_COLORS[k as keyof typeof RISK_COLORS] }))

  const barParts = Object.entries(stats?.pii_type_breakdown || {})
    .sort(([,a],[,b]) => b-a).slice(0,10)
    .map(([name,value]) => ({ name: name.replace(/_/g,' '), value }))

  const radarParts = [
    { subject:'Consent',    score: 80 },
    { subject:'Security',   score: stats?.total_documents ? Math.max(10, 100 - ((stats.risk_distribution?.CRITICAL||0)/(stats.total_documents||1))*100) : 50 },
    { subject:'Retention',  score: 70 },
    { subject:'Rights',     score: 65 },
    { subject:'Processing', score: 85 },
    { subject:'Transfer',   score: 90 },
  ]

  const high = (stats?.risk_distribution?.HIGH||0)+(stats?.risk_distribution?.CRITICAL||0)
  const complianceScore = stats?.total_documents
    ? Math.round(100 - (high/(stats.total_documents))*100) : 0

  return (
    <div className="page-enter space-y-8">

      <div>
        <p className="eyebrow mb-2" style={{ color:'var(--orange)' }}>INTELLIGENCE</p>
        <h1 className="text-[32px] font-black mb-1" style={{ color:'var(--fg)', letterSpacing:'-0.04em' }}>Analytics</h1>
        <p className="text-[14px]" style={{ color:'var(--fg-2)' }}>
          Live charts from PostgreSQL · {stats?.total_documents || 0} documents analysed
        </p>
      </div>

      {/* KPI strip */}
      {loading ? (
        <div className="grid grid-cols-4 gap-5">{Array.from({length:4}).map((_,i)=><SkeletonChart key={i}/>)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label:'Total Docs',       value:stats?.total_documents||0, suffix:'',  color:'var(--orange)' },
            { label:'PII Entities',     value:stats?.total_pii_found||0, suffix:'',  color:'var(--amber)'  },
            { label:'High Risk',        value:high,                       suffix:'',  color:'var(--red)'    },
            { label:'Compliance Score', value:complianceScore,            suffix:'%', color:'var(--green)'  },
          ].map(k => (
            <motion.div key={k.label}
              whileHover={{ y:-3, boxShadow:'var(--shadow-lg)' }}
              transition={{ duration:0.18 }}
              className="card" style={{ padding:'24px' }}>
              <div className="metric mb-2" style={{ color:k.color }}>
                <CountUp end={k.value} />{k.suffix}
              </div>
              <p className="text-[13px] font-semibold" style={{ color:'var(--fg)' }}>{k.label}</p>
              <p className="text-[11.5px] mt-0.5" style={{ color:'var(--fg-3)' }}>From PostgreSQL · live</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts row 1 */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Risk pie */}
          <div className="card" style={{ padding:'28px' }}>
            <div className="flex items-center gap-2 mb-5">
              <PieIcon className="w-4 h-4" style={{ color:'var(--orange)' }} />
              <p className="text-[15px] font-bold" style={{ color:'var(--fg)', letterSpacing:'-0.01em' }}>Risk Breakdown</p>
            </div>
            {pieParts.length > 0 ? (
              <>
                <PieChart width={200} height={200} style={{ margin:'0 auto' }}>
                  <Pie data={pieParts} cx={95} cy={95} outerRadius={80} innerRadius={48} paddingAngle={4} dataKey="value" stroke="none" animationBegin={200}>
                    {pieParts.map((e,i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
                <div className="mt-4 space-y-2">
                  {pieParts.map(p => (
                    <div key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background:p.fill }} />
                        <span className="text-[12px]" style={{ color:'var(--fg-2)' }}>{p.name}</span>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color:'var(--fg)' }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48" style={{ color:'var(--fg-4)' }}>No data</div>
            )}
          </div>

          {/* PII bar */}
          <div className="card lg:col-span-2" style={{ padding:'28px' }}>
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4" style={{ color:'var(--orange)' }} />
              <p className="text-[15px] font-bold" style={{ color:'var(--fg)', letterSpacing:'-0.01em' }}>Top PII Types</p>
            </div>
            {barParts.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={barParts} layout="vertical" barSize={10} margin={{ left:8 }}>
                  <XAxis type="number" tick={{ fontSize:11, fill:'var(--fg-3)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize:11, fill:'var(--fg-2)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill:'rgba(232,98,42,0.05)' }} />
                  <Bar dataKey="value" fill="var(--orange)" radius={[0,6,6,0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48" style={{ color:'var(--fg-4)' }}>No PII detected yet</div>
            )}
          </div>
        </div>
      )}

      {/* Charts row 2 */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Compliance radar */}
          <div className="card" style={{ padding:'28px' }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4" style={{ color:'var(--orange)' }} />
              <p className="text-[15px] font-bold" style={{ color:'var(--fg)', letterSpacing:'-0.01em' }}>Compliance Radar</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarParts}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:'var(--fg-2)' }} />
                <Radar name="Score" dataKey="score" stroke="var(--orange)" fill="var(--orange)" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip content={<ChartTip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Document risk breakdown table */}
          <div className="card" style={{ padding:'28px' }}>
            <p className="text-[15px] font-bold mb-5" style={{ color:'var(--fg)', letterSpacing:'-0.01em' }}>Risk Summary</p>
            <div className="space-y-4">
              {['LOW','MEDIUM','HIGH','CRITICAL'].map(r => {
                const v   = stats?.risk_distribution?.[r] || 0
                const pct = stats?.total_documents ? Math.round((v/(stats.total_documents))*100) : 0
                const c   = RISK_COLORS[r as keyof typeof RISK_COLORS]
                return (
                  <div key={r}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold" style={{ color:'var(--fg)' }}>{r}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px]" style={{ color:'var(--fg-3)' }}>{v} docs</span>
                        <span className="text-[12px] font-bold" style={{ color:c }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full" style={{ background:'var(--bg-subtle)' }}>
                      <motion.div className="h-2.5 rounded-full"
                        initial={{ width:0 }} animate={{ width:`${pct}%` }}
                        transition={{ duration:0.9, delay:0.2, ease:[0.16,1,0.3,1] }}
                        style={{ background:c }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 pt-5" style={{ borderTop:'1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color:'var(--fg-2)' }}>Total documents</span>
                <span className="text-[16px] font-bold" style={{ color:'var(--fg)' }}>{stats?.total_documents || 0}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[13px]" style={{ color:'var(--fg-2)' }}>PII entities found</span>
                <span className="text-[16px] font-bold" style={{ color:'var(--orange)' }}>{stats?.total_pii_found || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
