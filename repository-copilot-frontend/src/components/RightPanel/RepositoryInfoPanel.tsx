import { CheckCircle2, Hash, MessageSquare, Sparkles } from 'lucide-react'
import type { Session } from '@/types/Session'
import { useAppState } from '@/lib/store'

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-text-low">{label}</span>
      <span className={mono ? 'break-all font-mono text-xs text-text-hi' : 'text-sm text-text-hi'}>
        {value}
      </span>
    </div>
  )
}

export function RepositoryInfoPanel({ session }: { session: Session | null }) {
  const { histories, model } = useAppState()
  const messageCount = session ? histories[session.id]?.length || 0 : 0

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col gap-5 overflow-y-auto scrollbar-thin border-l border-hairline bg-panel p-4">
      <h2 className="font-display text-sm font-semibold text-text-hi">Repository information</h2>

      {!session ? (
        <p className="text-xs leading-relaxed text-text-low">
          Clone a repository to see its indexing status, session details, and chat metadata here.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-gitgreen/30 bg-gitgreen/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gitgreen" />
            <span className="text-xs font-medium text-gitgreen">Repository indexed successfully</span>
          </div>

          <Row label="Repository name" value={session.repo_name} mono />
          <Row label="Repository URL" value={session.url} mono />
          <Row label="Session ID" value={session.id} mono />

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-wide text-text-low">Current model</span>
            <span className="flex items-center gap-1.5 text-sm text-text-hi">
              <Sparkles className="h-3.5 w-3.5 text-violet-bright" />
              {model}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-hairline bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-text-low">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Messages</span>
              </div>
              <p className="mt-1 font-display text-lg font-semibold text-text-hi">{messageCount}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-text-low">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Session</span>
              </div>
              <p className="mt-1 truncate font-mono text-xs text-text-hi">{session.id.slice(0, 8)}</p>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
