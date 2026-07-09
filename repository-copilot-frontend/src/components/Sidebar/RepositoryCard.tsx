import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { LANGUAGE_COLORS } from '@/types/Repository'

interface RepositoryCardProps {
  name: string
  active: boolean
  messageCount: number
  onClick: () => void
}

// Deterministic "commit rhythm" sparkline derived from the repo name, purely
// cosmetic — echoes GitHub's contribution graph as the sidebar's signature motif.
function useActivityPattern(seed: string) {
  return useMemo(() => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997
    return Array.from({ length: 7 }, (_, i) => ((hash >> i) & 3) + 1)
  }, [seed])
}

function languageFor(name: string) {
  const keys = Object.keys(LANGUAGE_COLORS)
  const idx = name.charCodeAt(0) % (keys.length - 1)
  return keys[idx]
}

export function RepositoryCard({ name, active, messageCount, onClick }: RepositoryCardProps) {
  const pattern = useActivityPattern(name)
  const language = languageFor(name)
  const dotColor = LANGUAGE_COLORS[language] || LANGUAGE_COLORS.Default

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        active ? 'bg-elevated2 shadow-glow' : 'hover:bg-elevated'
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-mono text-[13px]',
            active ? 'text-text-hi' : 'text-text-mid group-hover:text-text-hi'
          )}
        >
          {name}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-text-low">
          <span className="flex items-end gap-[2px]">
            {pattern.map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm bg-current opacity-50"
                style={{ height: `${h * 2 + 2}px`, color: dotColor }}
              />
            ))}
          </span>
          {messageCount > 0 && <span>{messageCount} msgs</span>}
        </span>
      </span>
    </button>
  )
}
