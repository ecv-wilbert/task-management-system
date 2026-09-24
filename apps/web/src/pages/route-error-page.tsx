import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/lib/seo'

/** Shown instead of a blank screen when a page throws while rendering or loading. */
export function RouteErrorPage() {
  const error = useRouteError()
  usePageMeta({ title: 'Something went wrong', noindex: true })
  if (import.meta.env.DEV) console.error(error)
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="grid min-h-svh place-content-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">{notFound ? 'This page doesn’t exist' : 'Something went wrong'}</h1>
      <p className="text-muted-foreground max-w-sm">
        {notFound
          ? 'Check the address, or head back to the start.'
          : 'Sorry about that. Reloading usually fixes it, and your tasks are safe.'}
      </p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Button asChild variant="outline">
          <Link to="/">Go to the home page</Link>
        </Button>
      </div>
    </div>
  )
}
