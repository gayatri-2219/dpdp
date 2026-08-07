'use client'
/**
 * EmptyState — Beautiful warm illustrated empty states
 * Used when API returns empty arrays.
 */
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 gap-5"
    >
      {/* Illustrated icon */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-3xl blur-xl opacity-30"
          style={{ background: 'var(--primary-light)', transform: 'scale(1.4)' }}
        />
        {/* Icon container */}
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, var(--primary-light), #fff)',
            border: '1px solid var(--primary-border)',
            boxShadow: '0 4px 16px rgba(230, 106, 44, 0.1)',
          }}
        >
          <Icon
            className="w-9 h-9"
            style={{ color: 'var(--primary)' }}
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Text */}
      <div className="text-center max-w-sm">
        <h3
          className="text-[15px] font-semibold mb-2"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          {title}
        </h3>
        <p
          className="text-[13.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      </div>

      {/* Action */}
      {action && (
        <Link
          href={action.href}
          className="btn btn-primary mt-1"
        >
          {action.label}
        </Link>
      )}
    </motion.div>
  )
}
