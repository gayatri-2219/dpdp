'use client'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  documentId: string
  filename?: string
}

export function ExportButtons({ documentId, filename = 'report' }: Props) {
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null)
  
  const download = async (type: 'pdf' | 'excel') => {
    setDownloading(type)
    const url = type === 'pdf' 
      ? api.exportPDF(documentId) 
      : api.exportExcel(documentId)
    
    try {
      // Trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${type === 'pdf' ? 'report.pdf' : 'pii.xlsx'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setTimeout(() => setDownloading(null), 1000)
    }
  }
  
  return (
    <div className="flex gap-3">
      <button
        onClick={() => download('pdf')}
        disabled={downloading !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all font-medium text-sm disabled:opacity-50"
      >
        {downloading === 'pdf' ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <FileText className="w-4 h-4" />
        )}
        Export PDF
      </button>
      
      <button
        onClick={() => download('excel')}
        disabled={downloading !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all font-medium text-sm disabled:opacity-50"
      >
        {downloading === 'excel' ? (
          <span className="animate-spin">⏳</span>
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Export Excel
      </button>
    </div>
  )
}
