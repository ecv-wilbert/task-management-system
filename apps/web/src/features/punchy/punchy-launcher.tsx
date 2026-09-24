import { useMutation } from '@tanstack/react-query'
import { PUNCHY_LIMITS, toPunchyTurn, type PunchyAction, type PunchySurface, type PunchyTurn } from '@tms/shared'
import { format } from 'date-fns'
import { lazy, Suspense, useState } from 'react'
import { todayISO } from '@/lib/dates'
import { askPunchy } from './api'
import { PunchyMark } from './punchy-mark'

export interface PunchyMessage {
  id: string
  role: 'user' | 'punchy'
  text: string
  actions?: PunchyAction[]
  error?: boolean
}

// The panel (and the task form it can open) loads on first open, so the
// landing page only pays for this small button.
const PunchyPanel = lazy(() => import('./punchy-panel').then((m) => ({ default: m.PunchyPanel })))

/** Floating "Ask Punchy" button + chat. Owns the conversation so it survives page changes inside the layout. */
export function PunchyLauncher({ surface }: { surface: PunchySurface }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<PunchyMessage[]>([])
  // 'always': a chat question must never be paused, persisted and replayed like offline task writes.
  const ask = useMutation({ mutationKey: ['punchy'], mutationFn: askPunchy, networkMode: 'always' })

  const add = (m: Omit<PunchyMessage, 'id'>) => setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...m }])

  const send = (question: string) => {
    const text = question.trim().slice(0, PUNCHY_LIMITS.questionChars)
    if (!text || ask.isPending) return
    const history: PunchyTurn[] = messages
      .filter((m) => !m.error)
      .slice(-PUNCHY_LIMITS.historyTurns)
      .map((m) => toPunchyTurn(m.role, m.text, m.actions))
    add({ role: 'user', text })
    ask.mutate(
      { surface, question: text, history, today: todayISO(), now: format(new Date(), 'HH:mm') },
      {
        onSuccess: (reply) => add({ role: 'punchy', text: reply.answer, actions: reply.actions }),
        onError: (err) => add({ role: 'punchy', text: err.message, error: true }),
      },
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-card text-foreground hover:bg-muted focus-visible:ring-ring/50 fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm font-medium shadow-[0_12px_32px_-12px_oklch(0.3_0.06_258/45%)] transition-colors outline-none focus-visible:ring-3 md:right-6 md:bottom-6"
      >
        <PunchyMark className="size-8 rounded-full" />
        Ask Punchy
      </button>
    )
  }

  return (
    <Suspense fallback={null}>
      <PunchyPanel
        surface={surface}
        messages={messages}
        pending={ask.isPending}
        onSend={send}
        onClear={() => setMessages([])}
        onClose={() => setOpen(false)}
      />
    </Suspense>
  )
}
