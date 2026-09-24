import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, type TaskPriority, type TaskStatus } from '@tms/shared'
import { ArrowDown, ArrowRight, ArrowUp, Circle, CircleCheck, CircleDashed } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STATUS_ICON = { todo: Circle, in_progress: CircleDashed, done: CircleCheck } as const
const PRIORITY_ICON = { low: ArrowDown, medium: ArrowRight, high: ArrowUp } as const

export function StatusBadge({ status }: { status: TaskStatus }) {
  const Icon = STATUS_ICON[status]
  return (
    <Badge variant={status === 'done' ? 'secondary' : 'outline'} className="gap-1">
      <Icon aria-hidden className="size-3" />
      {TASK_STATUS_LABEL[status]}
    </Badge>
  )
}

export function PriorityLabel({ priority }: { priority: TaskPriority }) {
  const Icon = PRIORITY_ICON[priority]
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Icon aria-hidden className={priority === 'high' ? 'size-3.5 text-overdue' : 'size-3.5 text-muted-foreground'} />
      {TASK_PRIORITY_LABEL[priority]}
    </span>
  )
}
