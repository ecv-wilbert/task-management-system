import { createClient } from '@supabase/supabase-js'
import type { Database } from '@tms/shared'
import { env } from './env'

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
