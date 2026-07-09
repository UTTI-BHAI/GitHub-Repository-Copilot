import { Moon, Sun } from 'lucide-react'
import { Switch } from '@/components/ui/Switch'
import { useAppState } from '@/lib/store'

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useAppState()

  if (collapsed) {
    return (
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-mid hover:bg-elevated hover:text-text-hi"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-text-mid hover:bg-elevated">
      <span className="flex items-center gap-2">
        {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        Dark mode
      </span>
      <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
    </div>
  )
}
