import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/lib/seo'

export function NotFoundPage() {
  usePageMeta({ title: 'Page not found', noindex: true })
  return (
    <div className="grid min-h-svh place-content-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">This page doesn’t exist</h1>
      <p className="text-muted-foreground">Check the address, or head back to the start.</p>
      <Button asChild className="justify-self-center">
        <Link to="/">Go to the home page</Link>
      </Button>
    </div>
  )
}
