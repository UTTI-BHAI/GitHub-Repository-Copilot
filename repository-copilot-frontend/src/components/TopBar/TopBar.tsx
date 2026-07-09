import { CheckCircle2, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { ModelSelector } from '@/components/ModelSelector/ModelSelector'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAppState } from '@/lib/store'
import type { Session } from '@/types/Session'

export function TopBar({ session, thinking }: { session: Session | null; thinking: boolean }) {
  const { rightPanelOpen, setRightPanelOpen } = useAppState()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-panel/80 px-4 backdrop-blur-xs">
      <div className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-text-mid">
        {session ? (
          <>
            <span className="text-text-low">repo</span>
            <ChevronRight className="h-3 w-3 text-text-low" />
            <span className="truncate text-text-hi">{session.repo_name}</span>
            <ChevronRight className="h-3 w-3 text-text-low" />
            <span className="truncate text-violet-bright">
              {thinking ? 'thinking' : 'session'}
              {thinking && <span className="caret animate-blink text-violet-bright" />}
            </span>
            <span className="ml-2 hidden items-center gap-1 rounded-full bg-gitgreen/10 px-2 py-0.5 text-[11px] text-gitgreen md:flex">
              <CheckCircle2 className="h-3 w-3" /> indexed
            </span>
          </>
        ) : (
          <span className="text-text-low">No repository selected</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ModelSelector />
        <Tooltip content={rightPanelOpen ? 'Hide repository panel' : 'Show repository panel'}>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-mid hover:bg-elevated hover:text-text-hi"
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
