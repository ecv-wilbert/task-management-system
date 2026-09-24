import type { QueryClient } from '@tanstack/react-query'
import type { Task } from '@tms/shared'
import { toast } from 'sonner'
import { createTask, deleteTask, updateTask, type CreateTaskInput, type UpdateTaskInput } from './api'
import { taskKeys } from './keys'

type Snapshot = { previous?: Task[] }

/**
 * Registers optimistic create/update/delete as mutation defaults.
 * Defaults (rather than inline useMutation options) are required for offline
 * support: paused mutations are persisted to IndexedDB without their
 * functions, and resumed after reload by looking up these defaults by key.
 */
export function registerTaskMutations(qc: QueryClient) {
  const snapshot = async (): Promise<Snapshot> => {
    await qc.cancelQueries({ queryKey: taskKeys.all })
    return { previous: qc.getQueryData<Task[]>(taskKeys.all) }
  }
  const rollback = (message: string) => (err: Error, _vars: unknown, ctx: Snapshot | undefined) => {
    if (ctx?.previous) qc.setQueryData(taskKeys.all, ctx.previous)
    toast.error(message, { description: err.message })
  }
  const refetch = () => qc.invalidateQueries({ queryKey: taskKeys.all })

  qc.setMutationDefaults(taskKeys.create, {
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onMutate: async (input: CreateTaskInput) => {
      const ctx = await snapshot()
      const now = new Date().toISOString()
      const optimistic: Task = {
        ...input,
        user_id: '',
        completed_at: input.status === 'done' ? now : null,
        created_at: now,
        updated_at: now,
      }
      qc.setQueryData<Task[]>(taskKeys.all, (old = []) => [optimistic, ...old])
      return ctx
    },
    onError: rollback('Couldn’t create the task'),
    onSettled: refetch,
  })

  qc.setMutationDefaults(taskKeys.update, {
    mutationFn: (input: UpdateTaskInput) => updateTask(input),
    onMutate: async ({ id, patch }: UpdateTaskInput) => {
      const ctx = await snapshot()
      qc.setQueryData<Task[]>(taskKeys.all, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t)),
      )
      return ctx
    },
    onError: rollback('Couldn’t save your changes'),
    onSettled: refetch,
  })

  qc.setMutationDefaults(taskKeys.remove, {
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id: string) => {
      const ctx = await snapshot()
      qc.setQueryData<Task[]>(taskKeys.all, (old = []) => old.filter((t) => t.id !== id))
      return ctx
    },
    onError: rollback('Couldn’t delete the task'),
    onSettled: refetch,
  })
}
