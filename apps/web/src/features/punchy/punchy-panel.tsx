import {
  PUNCHY_LIMITS,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type PunchyAction,
  type PunchySurface,
  type PunchyTaskDraft,
} from '@tms/shared'
import { ArrowUp, CalendarDays, CloudOff, Flag, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskFormDialog } from '@/features/tasks/task-form-dialog'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { formatDue, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { PunchyMessage } from './punchy-launcher'
import { PunchyMark } from './punchy-mark'

const COPY: Record<PunchySurface, { tagline: string; greeting: string; suggestions: string[] }> = {
  landing: {
    tagline: 'Questions about Punchlist',
    greeting: 'Hi, I’m Punchy. Ask me what Punchlist does, how offline works, or how to get started.',
    suggestions: ['What can Punchlist do?', 'Does it work offline?', 'Who can see my tasks?'],
  },
  app: {
    tagline: 'Plans with you, you stay in control',
    greeting: 'Hi, I’m Punchy. I can sum up your list, spot what’s overdue, and draft tasks for you to review.',
    suggestions: ['What’s overdue?', 'What should I tackle first today?', 'Add a task for tonight'],
  },
}

interface Props {
  surface: PunchySurface
  messages: PunchyMessage[]
  pending: boolean
  onSend: (question: string) => void
  onClear: () => void
  onClose: () => void
}

export function PunchyPanel({ surface, messages, pending, onSend, onClear, onClose }: Props) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [question, setQuestion] = useState('')
  const [draft, setDraft] = useState<PunchyTaskDraft | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const copy = COPY[surface]
  const canSend = online && !pending

  // Block bodies on purpose: an effect must return nothing or a cleanup function, and
  // newer browsers return a Promise from scrollIntoView(), which crashes React on unmount.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending])

  const submit = (text: string) => {
    if (!canSend || !text.trim()) return
    onSend(text)
    setQuestion('')
  }

  // Actions only navigate or open the task form for review. Punchy never writes on its own.
  const run = (action: PunchyAction) => {
    switch (action.type) {
      case 'sign_up':
        return navigate('/login', { state: { from: '/app', tab: 'sign-up' } })
      case 'sign_in':
        return navigate('/login')
      case 'open_dashboard':
        return navigate('/app')
      case 'open_tasks':
        return navigate('/app/tasks')
      case 'create_task':
        return action.draft && setDraft(action.draft)
    }
  }

  return (
    <section
      role="dialog"
      aria-label="Punchy"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="bg-card fixed inset-x-2 bottom-2 z-40 flex h-[min(36rem,calc(100svh-1rem))] flex-col overflow-hidden rounded-2xl border shadow-[0_24px_60px_-20px_oklch(0.3_0.06_258/50%)] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem] md:right-6 md:bottom-6"
    >
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <PunchyMark />
        <div className="min-w-0 flex-1">
          <p className="font-heading leading-tight font-semibold">Punchy</p>
          <p className="text-muted-foreground truncate text-xs">{copy.tagline}</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Start a new chat" title="New chat">
            <RotateCcw />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close Punchy" title="Close">
          <X />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="grid gap-3">
          <Bubble role="punchy">{copy.greeting}</Bubble>
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {copy.suggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" className="rounded-full" disabled={!canSend} onClick={() => submit(s)}>
                  {s}
                </Button>
              ))}
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="grid gap-2">
              <Bubble role={m.role} error={m.error}>
                {m.text}
              </Bubble>
              {m.actions?.map(
                (a, i) => a.draft && <DraftCard key={i} draft={a.draft} onReview={() => run(a)} />,
              )}
              {!!m.actions?.some((a) => !a.draft) && (
                <div className="flex flex-wrap gap-2">
                  {m.actions.map(
                    (a, i) =>
                      !a.draft && (
                        <Button key={i} variant="secondary" size="sm" onClick={() => run(a)}>
                          {a.label}
                        </Button>
                      ),
                  )}
                </div>
              )}
            </div>
          ))}
          {pending && (
            <p className="text-muted-foreground flex items-center gap-1 text-sm" role="status">
              <span className="sr-only">Punchy is thinking</span>
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="grid gap-2 border-t px-3 pt-3 pb-2">
        {!online && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CloudOff aria-hidden className="size-3.5" /> Punchy needs a connection. Your tasks still work offline.
          </p>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(question)
          }}
        >
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={PUNCHY_LIMITS.questionChars}
            placeholder={surface === 'app' ? 'Ask about your tasks…' : 'Ask about Punchlist…'}
            aria-label="Message Punchy"
            disabled={!online}
            className="h-9"
          />
          <Button type="submit" size="icon-lg" disabled={!canSend || !question.trim()} aria-label="Send">
            <ArrowUp />
          </Button>
        </form>
        <p className="text-muted-foreground px-1 text-[0.7rem] leading-snug">
          Punchy only helps with Punchlist and never changes anything without you.
        </p>
      </footer>

      {surface === 'app' && (
        <TaskFormDialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)} draft={draft ?? undefined} />
      )}
    </section>
  )
}

function Bubble({ role, error, children }: { role: 'user' | 'punchy'; error?: boolean; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        'max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line',
        role === 'user'
          ? 'bg-primary text-primary-foreground justify-self-end rounded-br-md'
          : 'bg-muted justify-self-start rounded-bl-md',
        error && 'bg-destructive/10 text-destructive',
      )}
    >
      {children}
    </p>
  )
}

/** A suggested task, shown in full so the user sees what they'd be adding before opening the form. */
function DraftCard({ draft, onReview }: { draft: PunchyTaskDraft; onReview: () => void }) {
  const today = todayISO()
  const due = draft.due_date === today ? 'Today' : draft.due_date ? formatDue(draft.due_date) : null
  return (
    <div className="bg-background grid max-w-[88%] gap-2 justify-self-start rounded-xl border p-3">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">Suggested task</p>
      <p className="text-sm leading-snug font-semibold">{draft.title}</p>
      {draft.description && <p className="text-muted-foreground line-clamp-3 text-xs whitespace-pre-line">{draft.description}</p>}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {draft.priority && (
          <span className={cn('inline-flex items-center gap-1', draft.priority === 'high' && 'text-overdue font-medium')}>
            <Flag aria-hidden className="size-3" /> {TASK_PRIORITY_LABEL[draft.priority]}
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="size-3" /> {due}
          </span>
        )}
        {draft.status && draft.status !== 'todo' && <span>{TASK_STATUS_LABEL[draft.status]}</span>}
      </div>
      <Button size="sm" className="justify-self-start" onClick={onReview}>
        Review and add
      </Button>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return <span aria-hidden className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full" style={{ animationDelay: delay }} />
}
