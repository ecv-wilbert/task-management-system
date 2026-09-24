import { FunctionsHttpError } from '@supabase/supabase-js'
import { sanitizePunchyReply, type PunchyReply, type PunchyRequest } from '@tms/shared'
import { deviceHeaders } from '@/lib/device'
import { supabase } from '@/lib/supabase'

/**
 * Asks the `punchy` Edge Function. supabase-js attaches the user's JWT when
 * signed in; the function reads their tasks itself, so none are sent from here.
 */
export async function askPunchy(req: PunchyRequest): Promise<PunchyReply> {
  const { data, error } = await supabase.functions.invoke('punchy', { body: req, headers: await deviceHeaders() })
  if (error) {
    const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
    throw new Error(typeof body?.error === 'string' ? body.error : 'Punchy couldn’t be reached. Try again shortly.')
  }
  // The server already sanitised this; checking again keeps the UI honest if the contract drifts.
  const reply = sanitizePunchyReply(data?.reply, req.surface)
  if (!reply) throw new Error('Punchy sent an answer it shouldn’t have. Try asking another way.')
  return reply
}
