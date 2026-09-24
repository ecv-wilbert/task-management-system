import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

const NEXT = { system: 'light', light: 'dark', dark: 'system' } as const
const ICON = { system: Monitor, light: Sun, dark: Moon } as const

export function ThemeToggle() {
  const { theme = 'system', setTheme } = useTheme()
  const current = (theme in NEXT ? theme : 'system') as keyof typeof NEXT
  const Icon = ICON[current]
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Switch to ${NEXT[current]}`}
      onClick={() => setTheme(NEXT[current])}
    >
      <Icon />
    </Button>
  )
}
