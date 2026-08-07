import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getRiskColor(level: string): string {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'text-emerald-500'
    case 'MEDIUM': return 'text-amber-500'
    case 'HIGH': return 'text-orange-500'
    case 'CRITICAL': return 'text-red-500'
    default: return 'text-slate-400'
  }
}

export function getRiskBgColor(level: string): string {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'bg-emerald-500/10'
    case 'MEDIUM': return 'bg-amber-500/10'
    case 'HIGH': return 'bg-orange-500/10'
    case 'CRITICAL': return 'bg-red-500/10'
    default: return 'bg-slate-500/10'
  }
}

export function getRiskGlow(level: string): string {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'shadow-[0_0_10px_rgba(16,185,129,0.3)]'
    case 'MEDIUM': return 'shadow-[0_0_10px_rgba(245,158,11,0.3)]'
    case 'HIGH': return 'shadow-[0_0_10px_rgba(249,115,22,0.3)]'
    case 'CRITICAL': return 'shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse-glow'
    default: return ''
  }
}

export function truncateText(text: string, length: number): string {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
