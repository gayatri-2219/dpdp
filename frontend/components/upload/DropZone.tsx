'use client'

import { useState, useCallback } from 'react'
import { UploadCloud, File, CheckCircle2, XCircle, FileType, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

interface DropZoneProps {
  onUpload: (file: File) => Promise<void>
}

export function DropZone({ onUpload }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      await processFile(droppedFile)
    }
  }, [])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0])
    }
  }

  const processFile = async (selectedFile: File) => {
    // 50MB limit
    if (selectedFile.size > 50 * 1024 * 1024) {
      setStatus('error')
      return
    }
    setFile(selectedFile)
    setStatus('uploading')
    setProgress(0)

    try {
      // Simulate progress if exact isn't available easily here, but usually passed down.
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90))
      }, 200)

      await onUpload(selectedFile)
      
      clearInterval(interval)
      setProgress(100)
      setStatus('completed')
    } catch (err) {
      setStatus('error')
    }
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileType className="w-8 h-8 text-red-500" />
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />
    if (type.includes('spreadsheet') || type.includes('csv')) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
    return <FileText className="w-8 h-8 text-slate-400" />
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-300",
          isDragActive ? "border-accent-primary bg-accent-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30",
          status !== 'idle' && status !== 'error' ? "pointer-events-none" : "cursor-pointer"
        )}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        onClick={() => status === 'idle' || status === 'error' ? document.getElementById('file-upload')?.click() : undefined}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.docx,.csv,.xlsx,.txt,.png,.jpg,.jpeg"
        />

        {status === 'idle' || status === 'error' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-200 mb-2">Click or drag file to this area to upload</h3>
            <p className="text-sm text-slate-400 mb-6 text-center max-w-md">
              Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.
            </p>
            <div className="flex space-x-2 text-xs text-slate-500 font-medium">
              <span className="px-2 py-1 bg-slate-800 rounded">PDF</span>
              <span className="px-2 py-1 bg-slate-800 rounded">DOCX</span>
              <span className="px-2 py-1 bg-slate-800 rounded">CSV</span>
              <span className="px-2 py-1 bg-slate-800 rounded">XLSX</span>
              <span className="px-2 py-1 bg-slate-800 rounded">TXT</span>
              <span className="px-2 py-1 bg-slate-800 rounded">PNG</span>
            </div>
            {status === 'error' && (
              <div className="mt-4 text-red-500 flex items-center text-sm">
                <XCircle className="w-4 h-4 mr-1" />
                Upload failed. Please try again or check file size.
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-md">
            <div className="flex items-center space-x-4 mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              {file && getFileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{file?.name}</p>
                <p className="text-xs text-slate-400">{file ? formatFileSize(file.size) : ''}</p>
              </div>
              {status === 'completed' && <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-fade-in" />}
            </div>

            {status !== 'completed' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">
                    {status === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </span>
                  <span className="text-accent-primary">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {status === 'completed' && (
              <div className="text-center animate-slide-up">
                <p className="text-emerald-500 font-medium mb-4">Upload and processing complete!</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setStatus('idle'); setFile(null); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
                >
                  Upload another file
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
