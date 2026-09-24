import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './auth-context'

/** Route guard: renders child routes only for signed-in users. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Loader2 aria-label="Loading" className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
