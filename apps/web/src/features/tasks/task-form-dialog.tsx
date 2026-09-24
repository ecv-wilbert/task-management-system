import { zodResolver } from '@hookform/resolvers/zod'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  taskFormSchema,
  type Task,
  type TaskFormValues,
} from '@tms/shared'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTask, useUpdateTask } from './queries'

const EMPTY: TaskFormValues = { title: '', description: '', status: 'todo', priority: 'medium', due_date: '' }

function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    due_date: task.due_date ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Task to edit. Omit to create a new one. */
  task?: Task
  /** Prefill for a new task (e.g. a Punchy suggestion). Ignored when editing. */
  draft?: Partial<TaskFormValues>
}

export function TaskFormDialog({ open, onOpenChange, task, draft }: Props) {
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const isEdit = !!task

  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskFormSchema), mode: 'onTouched', defaultValues: EMPTY })
  const { errors } = form.formState

  useEffect(() => {
    if (open) form.reset(task ? toFormValues(task) : { ...EMPTY, ...draft })
  }, [open, task, draft, form])

  const onSubmit = (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      priority: values.priority,
      due_date: values.due_date || null,
    }
    // Fire and close: the cache updates optimistically, and offline changes queue.
    if (task) {
      updateTask.mutate({ id: task.id, patch: payload })
      toast.success('Task saved')
    } else {
      createTask.mutate({ id: crypto.randomUUID(), ...payload })
      toast.success('Task created')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update the details and save.' : 'Add something that needs doing.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="title">
              Title
              <span aria-hidden className="text-destructive -ml-1">
                *
              </span>
            </Label>
            <Input id="title" autoFocus aria-required aria-invalid={!!errors.title} {...form.register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" rows={3} aria-invalid={!!errors.description} {...form.register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TASK_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {TASK_PRIORITY_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" aria-invalid={!!errors.due_date} {...form.register('due_date')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save changes' : 'Create task'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
