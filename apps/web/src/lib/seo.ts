import { useEffect } from 'react'

const SITE = 'Punchlist'
export const DEFAULT_TITLE = 'Punchlist · The task manager that works offline'

/**
 * Per-page <title> and robots meta for this client-rendered app. The landing
 * page keeps the defaults from index.html; private pages pass noindex (Vercel
 * also sends X-Robots-Tag for them, for crawlers that don't run JS).
 */
export function usePageMeta({ title, noindex = false }: { title?: string; noindex?: boolean }) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : DEFAULT_TITLE
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.name = 'robots'
        document.head.appendChild(robots)
      }
      robots.content = 'noindex, nofollow'
    } else {
      robots?.remove()
    }
  }, [title, noindex])
}
