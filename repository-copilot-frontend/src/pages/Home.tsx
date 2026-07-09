import { GitBranch } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { TopBar } from '@/components/TopBar/TopBar'
import { RepositoryInput } from '@/components/RepositoryInput/RepositoryInput'
import { LoadingScreen } from '@/components/LoadingScreen/LoadingScreen'
import { ChatWindow } from '@/components/ChatWindow/ChatWindow'
import { RepositoryInfoPanel } from '@/components/RightPanel/RepositoryInfoPanel'
import { useSessions } from '@/hooks/useSessions'
import { useCloneRepository } from '@/hooks/useCloneRepository'
import { useAppState } from '@/lib/store'

export function Home() {
  const { isLoading: loadingSessions } = useSessions()
  const {
  sessions,
  activeSessionId,
  rightPanelOpen,
  showRepositoryInput,
} = useAppState()
  const { clone, stage, stageLabel, error, isCloning, reset } = useCloneRepository()

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const showHero = showRepositoryInput

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink">
      <Sidebar loadingSessions={loadingSessions} />

      <div className="flex min-w-0 flex-1 flex-col">
        {!showHero && <TopBar session={activeSession} thinking={false} />}

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col">
            {showHero ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/15 shadow-glow">
                    <GitBranch className="h-6 w-6 text-violet-bright" />
                  </div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-text-hi md:text-4xl">
                    Repository Copilot
                  </h1>
                  <p className="max-w-md text-sm text-text-mid">
                    Paste a public GitHub repository. It gets cloned, chunked, embedded, and indexed —
                    then you can ask it anything.
                  </p>
                </div>

                <RepositoryInput
                  onSubmit={(url) => clone(url)}
                  disabled={isCloning}
                  errorMessage={error?.message}
                />

                {isCloning && <LoadingScreen stage={stage} />}
              </div>
            ) : activeSession ? (
              <ChatWindow key={activeSession.id} session={activeSession} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-low">
                Select a repository from the sidebar to continue.
              </div>
            )}
          </div>

          {!showHero && rightPanelOpen && <RepositoryInfoPanel session={activeSession} />}
        </div>
      </div>
    </div>
  )
}
