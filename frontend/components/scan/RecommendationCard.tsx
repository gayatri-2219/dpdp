'use client'
import { Recommendation } from '@/lib/types'

interface Props { rec: Recommendation; index: number }

export function RecommendationCard({ rec, index }: Props) {
  const priorityColors = {
    HIGH: 'border-red-500/40 bg-red-500/5',
    MEDIUM: 'border-amber-500/40 bg-amber-500/5',
    LOW: 'border-emerald-500/40 bg-emerald-500/5',
  }
  const priorityBadgeColors = {
    HIGH: 'bg-red-500/20 text-red-400 border border-red-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    LOW: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  }
  
  return (
    <div className={`rounded-xl border p-5 ${priorityColors[rec.priority]} transition-all hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm font-mono">#{index + 1}</span>
          <h4 className="text-slate-100 font-semibold">{rec.issue}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityBadgeColors[rec.priority]}`}>
            {rec.priority}
          </span>
          {rec.dpdp_section && (
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              {rec.dpdp_section}
            </span>
          )}
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-3"><span className="text-slate-300 font-medium">Impact:</span> {rec.impact}</p>
      <p className="text-slate-300 text-sm mb-3">{rec.recommendation}</p>
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <span>⏱</span>
        <span>{rec.timeline}</span>
      </div>
    </div>
  )
}
