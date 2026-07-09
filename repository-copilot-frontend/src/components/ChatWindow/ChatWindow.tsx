import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ChatMessageBubble } from './ChatMessage'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { useChat } from '@/hooks/useChat'
import type { Session } from '@/types/Session'

export function ChatWindow({ session }: { session: Session }) {
  const { messages, send, regenerate, vote, isThinking, phase, error } = useChat(session.id)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="rounded-xl2 border border-hairline bg-elevated px-4 py-3 text-sm text-text-mid animate-fade-in">
              <span className="font-mono text-violet-bright">{session.repo_name}</span> is indexed and
              ready. Ask anything — routing, architecture, a specific function, or how two files relate.
            </div>
          )}

          {messages.map((message, idx) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isLatestAssistant={idx === messages.length - 1 && message.role === 'assistant'}
              onRegenerate={() => regenerate(message.id)}
              onVote={(v) => vote(message.id, v)}
            />
          ))}

          {isThinking && phase && (
            <TypingIndicator label={phase === 'thinking' ? 'Thinking…' : 'Generating answer…'} />
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-gitred/30 bg-gitred/10 px-3 py-2 text-xs text-gitred">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error.message}
            </div>
          )}
        </div>
      </div>

      <MessageInput onSend={send} disabled={isThinking} />
    </div>
  )
}
