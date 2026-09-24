import { CheckSquare, Fingerprint, LayoutDashboard, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { toast } from 'sonner'
import { Logo } from '@/components/logo'
import { SyncStatus } from '@/components/sync-status'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuth } from '@/features/auth/auth-context'
import { takePasskeyOffer } from '@/features/auth/passkey-offer'
import { passkeysSupported } from '@/features/auth/passkeys'
import { usePageMeta } from '@/lib/seo'
import { PasskeysDialog } from '@/features/auth/passkeys-dialog'
import { PunchyLauncher } from '@/features/punchy/punchy-launcher'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/tasks', label: 'Tasks', icon: CheckSquare, end: false },
]

export function AppLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [passkeysOpen, setPasskeysOpen] = useState(false)
  usePageMeta({ title: pathname.startsWith('/app/tasks') ? 'Tasks' : 'Dashboard', noindex: true })

  // Right after sign-up, suggest a passkey once.
  useEffect(() => {
    if (!takePasskeyOffer() || !passkeysSupported()) return
    toast('Sign in faster next time', {
      description: 'Add a passkey to use Face ID, Touch ID or your fingerprint.',
      action: { label: 'Add passkey', onClick: () => setPasskeysOpen(true) },
      duration: 10_000,
    })
  }, [])
  const name = (user?.user_metadata.full_name as string | undefined) ?? user?.email ?? ''
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={item.end ? pathname === item.to : pathname.startsWith(item.to)}>
                      <NavLink to={item.to} end={item.end}>
                        <item.icon aria-hidden />
                        {item.label}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{name}</p>
              {user?.email !== name && <p className="text-muted-foreground truncate text-xs">{user?.email}</p>}
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setPasskeysOpen(true)}>
                <Fingerprint aria-hidden /> Passkeys
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => void signOut()}>
                <LogOut aria-hidden /> Sign out
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <SyncStatus />
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <PunchyLauncher surface="app" />
      <PasskeysDialog open={passkeysOpen} onOpenChange={setPasskeysOpen} />
    </SidebarProvider>
  )
}
