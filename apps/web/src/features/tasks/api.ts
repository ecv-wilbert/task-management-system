import type { Task, TaskUpdate } from '@tms/shared'
import { supabase } from '@/lib/supabase'

/** Raw Supabase calls. Components use the hooks in queries.ts, not these. */

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export type CreateTaskInput = Pick<Task, 'id' | 'title' | 'description' | 'status' | 'priority' | 'due_date'>

export async function createTask(input: CreateTaskInput): Promise<Task> {
  // upsert (not insert) so a replayed offline mutation is idempotent.
  const { data, error } = await supabase.from('tasks').upsert(input).select().single()
  if (error) throw error
  return data
}

export interface UpdateTaskInput {
  id: string
  patch: Omit<TaskUpdate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>
}

export async function updateTask({ id, patch }: UpdateTaskInput): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
