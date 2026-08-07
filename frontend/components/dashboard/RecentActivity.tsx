import { FileText, ShieldAlert, BarChart3, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityItem {
  id: string
  action: 'UPLOAD' | 'ANALYZE' | 'REPORT' | 'DELETE'
  documentName: string
  timestamp: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

const getActionIcon = (action: ActivityItem['action']) => {
  switch (action) {
    case 'UPLOAD': return <FileText className="w-4 h-4 text-accent-secondary" />
    case 'ANALYZE': return <ShieldAlert className="w-4 h-4 text-accent-primary" />
    case 'REPORT': return <BarChart3 className="w-4 h-4 text-emerald-500" />
    case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />
  }
}

const getActionText = (action: ActivityItem['action']) => {
  switch (action) {
    case 'UPLOAD': return 'Uploaded document'
    case 'ANALYZE': return 'Analyzed for PII'
    case 'REPORT': return 'Generated compliance report'
    case 'DELETE': return 'Deleted document'
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return <div className="text-slate-400 text-sm p-4 text-center">No recent activity</div>
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-slate-800/30 transition-colors">
          <div className="p-2 rounded-full bg-slate-800 border border-slate-700 mt-1">
            {getActionIcon(activity.action)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-200">
              <span className="font-medium text-slate-300">{getActionText(activity.action)}</span>
              {' '}—{' '}
              <span className="text-slate-400">{activity.documentName}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
