import { clientForUser } from '../_shared/supabase.ts'

export { getUserId } from '../_shared/supabase.ts'

export async function fetchTasksForPunchy(jwt: string) {
  const { data, error } = await clientForUser(jwt)
    .from('tasks')
    .select('title, description, status, priority, due_date, completed_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data
}
