import {
  GitBranch,
  Github,
  Info,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { RepositoryCard } from './RepositoryCard'
import { SettingsDialog } from '@/components/SettingsDialog/SettingsDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAppState } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function Sidebar({ loadingSessions }: { loadingSessions: boolean }) {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    histories,
    sidebarCollapsed,
    setSidebarCollapsed,
    setShowRepositoryInput,
  } = useAppState()

  // The auth listener in App picks this up and returns to the login screen.
  const signOut = () => supabase.auth.signOut()

  if (sidebarCollapsed) {
    return (
      <aside className="flex h-full w-[60px] flex-col items-center gap-3 border-r border-hairline bg-panel py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15">
          <GitBranch className="h-4 w-4 text-violet-bright" />
        </div>
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-text-mid hover:bg-elevated hover:text-text-hi"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-1">
          <Tooltip content="Sign out">
            <button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-mid hover:bg-elevated hover:text-text-hi"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-hairline bg-panel">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15">
            <GitBranch className="h-4 w-4 text-violet-bright" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-text-hi">
            Repository Copilot
          </span>
        </div>
        <Tooltip content="Collapse sidebar">
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-mid hover:bg-elevated hover:text-text-hi"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2.5 pb-2">
        <button
          onClick={() => {
            setActiveSessionId(null)
            setShowRepositoryInput(true)
          }}
          className="mb-3 w-full rounded-lg bg-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + New Repository
        </button>
        <p className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-text-low">
          Recent repositories
        </p>
        <div className="flex flex-col gap-0.5">
          {loadingSessions &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}

          {!loadingSessions && sessions.length === 0 && (
            <p className="px-2 py-3 text-xs leading-relaxed text-text-low">
              No repositories yet. Paste a GitHub URL to start your first session.
            </p>
          )}

          {!loadingSessions &&
            sessions.map((session) => (
              <RepositoryCard
                key={session.id}
                name={session.repo_name}
                active={session.id === activeSessionId}
                messageCount={histories[session.id]?.length || 0}
                onClick={() => {
                  setActiveSessionId(session.id)
                  setShowRepositoryInput(false)
                }}
              />
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-hairline px-2.5 py-2.5">
        <SettingsDialog defaultTab="settings">
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-mid hover:bg-elevated hover:text-text-hi">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </SettingsDialog>
        <SettingsDialog defaultTab="about">
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-mid hover:bg-elevated hover:text-text-hi">
            <Info className="h-4 w-4" /> About
          </button>
        </SettingsDialog>
        <a
          href="https://github.com/UTTI-BHAI/GitHub-Repository-Copilot"
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-mid hover:bg-elevated hover:text-text-hi'
          )}
        >
          <Github className="h-4 w-4" /> GitHub
        </a>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-mid hover:bg-elevated hover:text-text-hi"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}