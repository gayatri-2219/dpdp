import Link from 'next/link'
import { FileText, FileType, FileSpreadsheet, Image as ImageIcon, Calendar, HardDrive, Eye, Trash2, FileOutput } from 'lucide-react'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { formatFileSize, formatDate } from '@/lib/utils'

export interface DocumentCardProps {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  piiCount: number
  onDelete?: (id: string) => void
}

export function DocumentCard({ id, name, type, size, uploadedAt, riskLevel, piiCount, onDelete }: DocumentCardProps) {
  const getFileIcon = (t: string) => {
    if (t.includes('pdf')) return <FileType className="w-6 h-6 text-red-500" />
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return <ImageIcon className="w-6 h-6 text-blue-500" />
    if (t.includes('spreadsheet') || t.includes('csv') || t.includes('xlsx')) return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
    return <FileText className="w-6 h-6 text-slate-400" />
  }

  return (
    <div className="glass-card rounded-xl p-5 hover:-translate-y-1 transition-transform duration-300 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 bg-slate-800 rounded-lg">
          {getFileIcon(type)}
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      <div className="flex-1">
        <h4 className="font-semibold text-slate-200 line-clamp-1 mb-1" title={name}>{name}</h4>
        
        <div className="flex flex-col space-y-2 mt-4 text-xs text-slate-400">
          <div className="flex items-center">
            <HardDrive className="w-3.5 h-3.5 mr-2 text-slate-500" />
            {formatFileSize(size)}
          </div>
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-500" />
            {formatDate(uploadedAt)}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
        <div className="px-2.5 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300 flex items-center">
          <span className="w-2 h-2 rounded-full bg-accent-primary mr-1.5"></span>
          {piiCount} PII found
        </div>

        <div className="flex items-center space-x-1">
          <Link href={`/documents/${id}`}>
            <button className="p-2 text-slate-400 hover:text-accent-primary hover:bg-slate-800 rounded transition-colors" title="View Details">
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-slate-800 rounded transition-colors" title="Generate Report">
            <FileOutput className="w-4 h-4" />
          </button>
          {onDelete && (
            <button 
              onClick={() => onDelete(id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-800 rounded transition-colors" 
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
