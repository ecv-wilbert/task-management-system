import { onlineManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from 'next-themes'
import { RouterProvider } from 'react-router'
import { PwaUpdatePrompt } from '@/components/pwa-update-prompt'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/auth-provider'
import { persistOptions, queryClient } from '@/lib/query-client'
import { router } from '@/router'

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => {
          // Replay changes queued while offline (possibly in a previous session).
          if (onlineManager.isOnline()) void queryClient.resumePausedMutations()
        }}
      >
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            {/* Offset so toasts clear the "Ask Punchy" button. */}
            <Toaster position="bottom-right" offset={{ bottom: 80 }} mobileOffset={{ bottom: 72 }} />
            <PwaUpdatePrompt />
          </TooltipProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
