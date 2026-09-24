import { z } from 'zod'
import type { Database } from './database.types.ts'

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']
export type TaskStatus = Database['public']['Enums']['task_status']
export type TaskPriority = Database['public']['Enums']['task_priority']
export type Profile = Database['public']['Tables']['profiles']['Row']

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const satisfies readonly TaskStatus[]
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const satisfies readonly TaskPriority[]

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

/** Form-level validation. Mirrors the CHECK constraints in the tasks table. */
export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().trim().max(5000, 'Max 5000 characters'),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  // yyyy-mm-dd from <input type="date">, or empty string for "no due date"
  due_date: z.union([z.iso.date(), z.literal('')]),
})

export type TaskFormValues = z.infer<typeof taskFormSchema>
