'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface PIIEntity {
  id: string
  text: string
  type: string
  startIndex: number
  endIndex: number
  confidence: number
}

interface PIIHighlighterProps {
  text: string
  piiEntities: PIIEntity[]
}

const getEntityColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'PERSON': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'EMAIL': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'PHONE': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'AADHAAR': 
    case 'PAN': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'ADDRESS': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

export function PIIHighlighter({ text, piiEntities }: PIIHighlighterProps) {
  const [isMasked, setIsMasked] = useState(false)
  const [activeEntity, setActiveEntity] = useState<PIIEntity | null>(null)

  // Sort entities by start index to properly chunk the string
  const sortedEntities = [...piiEntities].sort((a, b) => a.startIndex - b.startIndex)
  
  const renderText = () => {
    if (!text) return null
    if (sortedEntities.length === 0) return <p className="whitespace-pre-wrap">{text}</p>

    const chunks = []
    let lastIndex = 0

    sortedEntities.forEach((entity, idx) => {
      // Add plain text before entity
      if (entity.startIndex > lastIndex) {
        chunks.push(<span key={`text-${idx}`}>{text.substring(lastIndex, entity.startIndex)}</span>)
      }

      // Add highlighted entity
      const entityText = text.substring(entity.startIndex, entity.endIndex)
      
      chunks.push(
        <span
          key={`entity-${entity.id}`}
          className={cn(
            "relative px-1 py-0.5 rounded border border-b-2 mx-0.5 cursor-pointer transition-colors",
            getEntityColor(entity.type)
          )}
          onMouseEnter={() => setActiveEntity(entity)}
          onMouseLeave={() => setActiveEntity(null)}
        >
          {isMasked ? '*'.repeat(entityText.length) : entityText}
          
          {/* Tooltip */}
          {activeEntity?.id === entity.id && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 rounded shadow-xl border border-slate-700 z-10 text-xs animate-fade-in">
              <div className="font-semibold text-slate-200 mb-1">{entity.type}</div>
              <div className="flex justify-between text-slate-400">
                <span>Confidence:</span>
                <span className={cn(
                  entity.confidence > 0.9 ? "text-emerald-500" :
                  entity.confidence > 0.7 ? "text-amber-500" : "text-red-500"
                )}>{(entity.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </span>
      )

      lastIndex = entity.endIndex
    })

    // Add remaining plain text
    if (lastIndex < text.length) {
      chunks.push(<span key="text-end">{text.substring(lastIndex)}</span>)
    }

    return <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">{chunks}</div>
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsMasked(!isMasked)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-medium text-slate-300 transition-colors"
        >
          {isMasked ? 'Show Original' : 'Mask PII'}
        </button>
      </div>
      <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800">
        {renderText()}
      </div>
    </div>
  )
}
