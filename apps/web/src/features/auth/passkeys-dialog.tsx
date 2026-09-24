import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Fingerprint, KeyRound, Loader2, Trash2 } from 'lucide-react'
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
import { useOnlineStatus } from '@/hooks/use-online-status'
import { supabase } from '@/lib/supabase'
import { passkeyErrorMessage, passkeysSupported } from './passkeys'

const passkeyKeys = { all: ['passkeys'] as const }

// Passkey changes need a live challenge from the server, so unlike task writes
// they are never queued offline ('always' = run now or fail, never pause).
async function listPasskeys() {
  const { data, error } = await supabase.auth.passkey.list()
  if (error) throw error
  return data
}
async function addPasskey() {
  const { error } = await supabase.auth.registerPasskey()
  if (error) throw error
}
async function removePasskey(passkeyId: string) {
  const { error } = await supabase.auth.passkey.delete({ passkeyId })
  if (error) throw error
}

const when = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')

export function PasskeysDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient()
  const online = useOnlineStatus()
  const supported = passkeysSupported()
  const list = useQuery({ queryKey: passkeyKeys.all, queryFn: listPasskeys, enabled: open && online, networkMode: 'always' })
  const refresh = () => qc.invalidateQueries({ queryKey: passkeyKeys.all })

  const add = useMutation({
    mutationFn: addPasskey,
    networkMode: 'always',
    onSuccess: () => toast.success('Passkey added. Next time, sign in with one tap.'),
    onError: (err) => {
      const message = passkeyErrorMessage(err, 'add')
      if (message) toast.error(message)
    },
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: removePasskey,
    networkMode: 'always',
    onSuccess: () => toast.success('Passkey removed'),
    onError: () => toast.error('Couldn’t remove the passkey. Please try again.'),
    onSettled: refresh,
  })

  const passkeys = list.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Passkeys</DialogTitle>
          <DialogDescription>
            Sign in with Face ID, Touch ID, your fingerprint or your device PIN instead of a password. Your password
            keeps working too.
          </DialogDescription>
        </DialogHeader>

        {!supported ? (
          <p className="text-muted-foreground text-sm">This browser doesn’t support passkeys yet.</p>
        ) : !online ? (
          <p className="text-muted-foreground text-sm">Connect to the internet to manage passkeys.</p>
        ) : list.isPending ? (
          <div className="grid place-items-center py-6">
            <Loader2 aria-label="Loading" className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : list.isError ? (
          <p className="text-destructive text-sm">Couldn’t load your passkeys. Please try again.</p>
        ) : passkeys.length === 0 ? (
          <div className="grid justify-items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center">
            <Fingerprint aria-hidden className="text-muted-foreground size-6" />
            <p className="text-sm font-medium">No passkeys yet</p>
            <p className="text-muted-foreground text-sm">Add one on each device you use Punchlist on.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <KeyRound aria-hidden className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.friendly_name || 'Passkey'}</p>
                  <p className="text-muted-foreground text-xs">
                    Added {when(p.created_at)}
                    {p.last_used_at ? ` · Last used ${when(p.last_used_at)}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${p.friendly_name || 'passkey'}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(p.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button type="button" disabled={!supported || !online || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Fingerprint aria-hidden />}
            Add a passkey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
