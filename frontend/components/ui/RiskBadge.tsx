import { AlertTriangle, ShieldAlert, ShieldCheck, Shield } from 'lucide-react'
import { cn, getRiskColor, getRiskBgColor, getRiskGlow } from '@/lib/utils'

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  className?: string
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const Icon = level === 'CRITICAL' ? ShieldAlert :
               level === 'HIGH' ? AlertTriangle :
               level === 'MEDIUM' ? Shield :
               ShieldCheck

  return (
    <div className={cn(
      "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-white/5",
      getRiskBgColor(level),
      getRiskColor(level),
      getRiskGlow(level),
      className
    )}>
      <Icon className="w-3.5 h-3.5" />
      <span>{level}</span>
    </div>
  )
}
