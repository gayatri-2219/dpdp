import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header }  from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'DPDP Shield — Enterprise Privacy Intelligence',
  description: 'Automatically detect sensitive data, evaluate compliance, and secure enterprise documents using AI. Powered by DPDP Act 2023.',
  keywords: 'DPDP, data privacy, compliance, PII detection, India data protection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          {/* Sidebar */}
          <Sidebar />

          {/* Main column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Header />
            <main style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px 32px',
              background: 'var(--bg)',
            }}>
              <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
