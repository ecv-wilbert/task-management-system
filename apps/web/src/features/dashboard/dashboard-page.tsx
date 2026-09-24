import { computeTaskStats, TASK_PRIORITIES, TASK_PRIORITY_LABEL, type Task } from '@tms/shared'
import { AlertTriangle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/auth-context'
import { useTasks } from '@/features/tasks/queries'
import { PriorityLabel, StatusBadge } from '@/features/tasks/task-badges'
import { TaskFormDialog } from '@/features/tasks/task-form-dialog'
import { formatDue, isOverdue, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { completionsByDay } from './completions'

const completedConfig = { completed: { label: 'Completed', color: 'var(--chart-1)' } } satisfies ChartConfig
const priorityConfig = { count: { label: 'Open tasks', color: 'var(--chart-1)' } } satisfies ChartConfig

export function DashboardPage() {
  const { user } = useAuth()
  const { data: tasks = [], isPending } = useTasks()
  const [formOpen, setFormOpen] = useState(false)
  const today = todayISO()

  const stats = useMemo(() => computeTaskStats(tasks, today), [tasks, today])
  const completions = useMemo(() => completionsByDay(tasks, 14), [tasks])
  const openByPriority = useMemo(
    () =>
      TASK_PRIORITIES.map((p) => ({
        priority: TASK_PRIORITY_LABEL[p],
        count: tasks.filter((t) => t.priority === p && t.status !== 'done').length,
      })).reverse(),
    [tasks],
  )
  const upNext = useMemo(() => pickUpNext(tasks), [tasks])

  const name = (user?.user_metadata.full_name as string | undefined)?.split(' ')[0]
  const open = stats.byStatus.todo + stats.byStatus.in_progress

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{name ? `Hi, ${name}` : 'Dashboard'}</h1>
          <p className="text-muted-foreground text-sm">
            {open === 0 ? 'Nothing open. Enjoy it.' : `${open} open ${open === 1 ? 'task' : 'tasks'} on your list.`}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus aria-hidden /> New task
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile label="Open" value={open} detail={`${stats.byStatus.in_progress} in progress`} />
        <StatTile label="Due in 7 days" value={stats.dueSoon} />
        <StatTile
          label="Overdue"
          value={stats.overdue}
          tone={stats.overdue > 0 ? 'critical' : undefined}
          detail={stats.overdue > 0 ? 'Past their due date' : 'All on schedule'}
        />
        <StatTile label="Completed" value={stats.byStatus.done} detail={`${stats.completionRate}% of all tasks`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Completed in the last 14 days</CardTitle>
            <CardDescription>Tasks marked done per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={completedConfig} className="aspect-auto h-56 w-full">
              <BarChart data={completions} margin={{ left: -20, right: 4 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent />} />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open tasks by priority</CardTitle>
            <CardDescription>Everything not yet done</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={priorityConfig} className="aspect-auto h-56 w-full">
              <BarChart data={openByPriority} layout="vertical" margin={{ left: 0, right: 16 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="priority" type="category" tickLine={false} axisLine={false} width={64} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={32} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1.5">
            <CardTitle>Up next</CardTitle>
            <CardDescription>Open tasks, soonest due first</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/tasks">See all tasks</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upNext.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open tasks. Add one to see it here.</p>
          ) : (
            <ul className="divide-y">
              {upNext.map((t) => {
                const overdue = isOverdue(t.due_date, t.status, today)
                return (
                  <li key={t.id} className="grid gap-2 py-3 sm:flex sm:items-center sm:justify-between">
                    <span className="min-w-0 truncate font-medium sm:flex-1">{t.title}</span>
                    <div className="flex items-center gap-4">
                      <PriorityLabel priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span className={cn('text-sm sm:w-28 sm:text-right', overdue ? 'text-overdue font-medium' : 'text-muted-foreground')}>
                        {formatDue(t.due_date)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}

function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail?: string
  tone?: 'critical'
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardDescription className="flex items-center gap-1.5">
          {tone === 'critical' && <AlertTriangle aria-hidden className="text-overdue size-3.5" />}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className={cn('font-heading text-3xl font-semibold tabular-nums', tone === 'critical' && 'text-overdue')}>
          {value}
        </p>
        {detail && <p className="text-muted-foreground mt-1 text-xs">{detail}</p>}
      </CardContent>
    </Card>
  )
}

function pickUpNext(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (a.due_date === b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date < b.due_date ? -1 : 1
    })
    .slice(0, 5)
}
