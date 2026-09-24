import { CloudOff, RefreshCw } from 'lucide-react'
import { usePendingTaskChanges } from '@/features/tasks/queries'
import { useOnlineStatus } from '@/hooks/use-online-status'

/** Header indicator: offline state and how many changes are waiting to sync. */
export function SyncStatus() {
  const online = useOnlineStatus()
  const pending = usePendingTaskChanges()

  if (online && pending === 0) return null

  return (
    <p role="status" className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs">
      {online ? <RefreshCw aria-hidden className="size-3.5 animate-spin" /> : <CloudOff aria-hidden className="size-3.5" />}
      {online
        ? `Syncing ${pending} ${pending === 1 ? 'change' : 'changes'}`
        : pending > 0
          ? `Offline. ${pending} ${pending === 1 ? 'change' : 'changes'} will sync when you reconnect`
          : 'Offline. Showing saved data'}
    </p>
  )
}
