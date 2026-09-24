import { useMutation, useMutationState, useQuery } from '@tanstack/react-query'
import type { Task } from '@tms/shared'
import { fetchTasks, type CreateTaskInput, type UpdateTaskInput } from './api'
import { taskKeys } from './keys'

export function useTasks() {
  return useQuery({ queryKey: taskKeys.all, queryFn: fetchTasks })
}

// Behaviour for these lives in mutations.ts (registered as defaults).
export const useCreateTask = () => useMutation<Task, Error, CreateTaskInput>({ mutationKey: taskKeys.create })
export const useUpdateTask = () => useMutation<Task, Error, UpdateTaskInput>({ mutationKey: taskKeys.update })
export const useDeleteTask = () => useMutation<void, Error, string>({ mutationKey: taskKeys.remove })

/** Number of task changes queued while offline, waiting to sync. */
export function usePendingTaskChanges(): number {
  return useMutationState({
    filters: { mutationKey: taskKeys.all, predicate: (m) => m.state.isPaused },
  }).length
}
