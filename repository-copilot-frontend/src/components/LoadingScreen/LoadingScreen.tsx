import { Check, Loader2 } from 'lucide-react'
import type { IndexStage } from '@/types/Repository'
import { cn } from '@/lib/utils'

const STAGES: { key: IndexStage; label: string }[] = [
  { key: 'cloning', label: 'Cloning repository' },
  { key: 'reading', label: 'Reading source files' },
  { key: 'chunking', label: 'Extracting code chunks' },
  { key: 'embedding', label: 'Generating embeddings' },
  { key: 'storing', label: 'Storing vectors' },
  { key: 'ready', label: 'Repository ready' },
]

export function LoadingScreen({ stage }: { stage: IndexStage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <div className="w-full max-w-md rounded-xl2 border border-hairline bg-elevated p-5 shadow-soft animate-fade-in">
      <div className="flex flex-col gap-3">
        {STAGES.map((s, i) => {
          const done = currentIndex > i || stage === 'ready'
          const active = i === currentIndex && stage !== 'ready'
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                  done && 'border-gitgreen bg-gitgreen/15 text-gitgreen',
                  active && 'border-violet bg-violet/15 text-violet-bright',
                  !done && !active && 'border-hairline text-text-low'
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'text-sm',
                  done && 'text-text-mid line-through decoration-hairline',
                  active && 'text-text-hi',
                  !done && !active && 'text-text-low'
                )}
              >
                {s.label}
                {active && <span className="caret animate-blink" />}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
