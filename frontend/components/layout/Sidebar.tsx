'use client'
/**
 * Sidebar — Matches the mockup exactly.
 * White, 220px, DPDP Shield logo + nav items + workspace/user at bottom.
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, FileText, UploadCloud, BarChart2, Sparkles,
  ClipboardList, Settings, ChevronLeft, Menu, Shield,
  HardDrive, User, Database
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { href: '/',           label: 'Overview',    icon: LayoutGrid    },
  { href: '/inventory',  label: 'Documents',   icon: FileText      },
  { href: '/scan-center',label: 'Upload & Scan',icon: UploadCloud  },
  { href: '/reports',    label: 'Reports',     icon: BarChart2     },
  { href: '/copilot',    label: 'AI Advisor',  icon: Sparkles      },
  { href: '/audit',      label: 'Audit Logs',  icon: ClipboardList },
  { href: '/settings',   label: 'Settings',    icon: Settings      },
]

function NavItem({ item, collapsed }: { item: typeof NAV[0]; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = item.href === '/'
    ? pathname === '/'
    : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link href={item.href}
      className={`nav-item ${isActive ? 'active' : ''}`}
      title={collapsed ? item.label : undefined}
      style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '9px' : '8px 10px' }}>
      <Icon size={16} strokeWidth={isActive ? 2.25 : 1.75} style={{ flexShrink: 0 }} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [storage] = useState(73)

  const w = collapsed ? 'var(--sidebar-w-mini)' : 'var(--sidebar-w)'

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        flexShrink: 0,
        height: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Logo row */}
      <div style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0 12px' : '0 14px 0 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 9 }}
          >
            {/* Orange shield logo */}
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #EB6A2A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(235,106,42,0.35)',
              flexShrink: 0,
            }}>
              <Shield size={15} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              DPDP Shield
            </span>
          </motion.div>
        )}
        {collapsed && (
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #EB6A2A, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(235,106,42,0.35)',
          }}>
            <Shield size={15} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'var(--fg-4)', display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <ChevronLeft size={15} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ position: 'absolute', top: 16, right: -12, background: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: 2, cursor: 'pointer', boxShadow: 'var(--shadow-sm)', zIndex: 30, display: 'flex' }}
          >
            <Menu size={13} color="var(--fg-3)" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => (
          <NavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom section */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* Workspace card */}
          <div style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workspace</p>
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', marginBottom: 1 }}>DPDP Shield</p>
            <p style={{ fontSize: 11, color: 'var(--fg-4)' }}>Enterprise Plan</p>
          </div>

          {/* Storage */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <p style={{ fontSize: 11.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <HardDrive size={12} /> Storage Used
              </p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-2)' }}>{storage}%</p>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)' }}>
              <div style={{ width: `${storage}%`, height: 4, borderRadius: 2, background: 'var(--primary)' }} />
            </div>
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #EB6A2A, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>A</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin</p>
              <p style={{ fontSize: 11, color: 'var(--fg-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>admin@acme.com</p>
            </div>
          </div>
        </motion.div>
      )}

      {collapsed && (
        <div style={{ padding: '10px 0 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #EB6A2A, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>A</div>
        </div>
      )}
    </motion.aside>
  )
}
