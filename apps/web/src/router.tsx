import { Loader2 } from 'lucide-react'
import { createBrowserRouter } from 'react-router'
import { LoginPage } from '@/features/auth/login-page'
import { RequireAuth } from '@/features/auth/require-auth'
import { LandingPage } from '@/pages/landing-page'
import { NotFoundPage } from '@/pages/not-found-page'

// Signed-in routes are lazy-loaded so the landing page stays light.
// All chunks are still precached by the service worker, so this works offline.
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    // Shown while a lazy /app chunk loads on first visit.
    hydrateFallbackElement: <PageLoader />,
    children: [
      {
        path: '/app',
        lazy: async () => ({ Component: (await import('@/components/layout/app-layout')).AppLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/features/dashboard/dashboard-page')).DashboardPage }),
          },
          {
            path: 'tasks',
            lazy: async () => ({ Component: (await import('@/features/tasks/tasks-page')).TasksPage }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

function PageLoader() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Loader2 aria-label="Loading" className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}
