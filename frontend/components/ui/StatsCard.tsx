'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: number
  color: 'primary' | 'success' | 'warning' | 'danger'
  subtitle?: string
}

export function StatsCard({ title, value, icon: Icon, trend, color, subtitle }: StatsCardProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1000 // 1s
    const steps = 30
    const increment = value / steps
    const stepTime = duration / steps

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  const colorStyles = {
    primary: 'text-accent-primary bg-accent-primary/10',
    success: 'text-emerald-500 bg-emerald-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    danger: 'text-red-500 bg-red-500/10',
  }

  return (
    <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="text-3xl font-bold text-slate-100 mt-2">{count.toLocaleString()}</h3>
        </div>
        <div className={cn("p-3 rounded-xl", colorStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {(trend !== undefined || subtitle) && (
        <div className="mt-4 flex items-center text-sm">
          {trend !== undefined && (
            <div className={cn(
              "flex items-center font-medium mr-2",
              trend >= 0 ? "text-emerald-500" : "text-red-500"
            )}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
