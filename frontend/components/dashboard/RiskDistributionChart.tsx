'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface RiskDistributionChartProps {
  data: { level: string; value: number }[]
}

const COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444'
}

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>

  const total = data.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <div className="h-[350px] w-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Risk Distribution</h3>
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              nameKey="level"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.level as keyof typeof COLORS] || '#94a3b8'} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(99, 102, 241, 0.2)', borderRadius: '8px' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-[40px]">
          <div className="text-center">
            <span className="text-3xl font-bold text-slate-100">{total}</span>
            <p className="text-xs text-slate-400">Total</p>
          </div>
        </div>
      </div>
    </div>
  )
}
