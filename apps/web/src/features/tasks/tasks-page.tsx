import { TASK_STATUSES, TASK_STATUS_LABEL, type Task, type TaskStatus } from '@tms/shared'
import { Circle, CircleCheck, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDue, isOverdue, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { DeleteTaskDialog } from './delete-task-dialog'
import { useTasks, useUpdateTask } from './queries'
import { PriorityLabel, StatusBadge } from './task-badges'
import { TaskFormDialog } from './task-form-dialog'

type Filter = 'all' | TaskStatus

export function TasksPage() {
  const { data: tasks = [], isPending, error } = useTasks()
  const updateTask = useUpdateTask()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>()
  const [deleting, setDeleting] = useState<Task | null>(null)
  const today = todayISO()

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter(
      (t) =>
        (filter === 'all' || t.status === filter) &&
        (!q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)),
    )
  }, [tasks, filter, search])

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }
  const toggleDone = (task: Task) =>
    updateTask.mutate({ id: task.id, patch: { status: task.status === 'done' ? 'todo' : 'done' } })

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {tasks.length === 0 ? 'Nothing here yet.' : `${tasks.length} total`}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden /> New task
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {TASK_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search aria-hidden className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search tasks"
            placeholder="Search tasks"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && !tasks.length ? (
        <p className="text-destructive text-sm">Couldn’t load tasks: {error.message}</p>
      ) : isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="font-medium">{tasks.length === 0 ? 'Your list is empty' : 'No tasks match'}</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {tasks.length === 0
              ? 'Create your first task to start tracking what’s left to do.'
              : 'Try a different filter or search term.'}
          </p>
          {tasks.length === 0 && (
            <Button onClick={openCreate} variant="outline">
              <Plus aria-hidden /> Create a task
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <span className="sr-only">Done</span>
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((task) => {
                const overdue = isOverdue(task.due_date, task.status, today)
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={task.status === 'done' ? `Reopen “${task.title}”` : `Mark “${task.title}” done`}
                        onClick={() => toggleDone(task)}
                      >
                        {task.status === 'done' ? (
                          <CircleCheck className="text-chart-1" />
                        ) : (
                          <Circle className="text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="max-w-[28ch]">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        className={cn(
                          'block truncate text-left font-medium hover:underline',
                          task.status === 'done' && 'text-muted-foreground line-through',
                        )}
                      >
                        {task.title}
                      </button>
                      {task.description && (
                        <p className="text-muted-foreground truncate text-xs">{task.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityLabel priority={task.priority} />
                    </TableCell>
                    <TableCell className={cn('whitespace-nowrap', overdue && 'text-overdue font-medium')}>
                      {formatDue(task.due_date)}
                      {overdue && <span className="sr-only"> (overdue)</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for “${task.title}”`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(task)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleDone(task)}>
                            {task.status === 'done' ? 'Reopen' : 'Mark done'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(task)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editing} />
      <DeleteTaskDialog task={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </div>
  )
}
