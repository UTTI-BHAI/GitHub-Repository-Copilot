import { useState, type HTMLAttributes } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/Chat'
import { formatTimestamp, cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

interface ChatMessageProps {
  message: ChatMessageType
  onRegenerate?: () => void
  onVote?: (value: 'up' | 'down') => void
  isLatestAssistant?: boolean
}

function extractText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.value
  if (node.children) return node.children.map(extractText).join('')
  return ''
}

/** <pre> block wrapper that adds a "Copy code" button, per spec. */
function CodeBlock(props: HTMLAttributes<HTMLPreElement> & { node?: any }) {
  const { children, node, ...rest } = props
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = extractText(node)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group/code relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-hairline bg-elevated2 px-2 py-1 text-[11px] text-text-mid opacity-0 transition-opacity hover:text-text-hi group-hover/code:opacity-100"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy code'}
      </button>
      <pre {...rest}>{children}</pre>
    </div>
  )
}

export function ChatMessageBubble({ message, onRegenerate, onVote, isLatestAssistant }: ChatMessageProps) {
  const [copiedMessage, setCopiedMessage] = useState(false)
  const isUser = message.role === 'user'

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 1500)
  }

  return (
    <div
      className={cn(
        'group flex w-full animate-fade-in gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
          isUser ? 'bg-elevated2 text-text-hi' : 'bg-violet/15 text-violet-bright'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : 'RC'}
      </div>

      <div className={cn('flex max-w-[78%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-xl2 px-4 py-2.5 shadow-soft',
            isUser
              ? 'rounded-tr-sm bg-violet text-white'
              : 'rounded-tl-sm border border-hairline bg-elevated text-text-hi'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          ) : message.content ? (
            <div className="md-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{ pre: CodeBlock }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && <span className="caret animate-blink text-violet-bright" />}
            </div>
          ) : (
            <div className="flex gap-1 py-1">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-low [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-low [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-text-low" />
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 px-1 text-[11px] text-text-low opacity-0 transition-opacity group-hover:opacity-100',
            isUser && 'flex-row-reverse'
          )}
        >
          <span>{formatTimestamp(message.createdAt)}</span>

          {!message.isStreaming && (
            <>
              <Tooltip content={copiedMessage ? 'Copied' : 'Copy message'}>
                <button onClick={handleCopyMessage} className="rounded p-1 hover:bg-elevated hover:text-text-hi">
                  {copiedMessage ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </Tooltip>

              {!isUser && (
                <>
                  <Tooltip content="Regenerate answer">
                    <button
                      onClick={onRegenerate}
                      className="rounded p-1 hover:bg-elevated hover:text-text-hi"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Good answer">
                    <button
                      onClick={() => onVote?.('up')}
                      className={cn(
                        'rounded p-1 hover:bg-elevated hover:text-text-hi',
                        message.vote === 'up' && 'text-gitgreen'
                      )}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Bad answer">
                    <button
                      onClick={() => onVote?.('down')}
                      className={cn(
                        'rounded p-1 hover:bg-elevated hover:text-text-hi',
                        message.vote === 'down' && 'text-gitred'
                      )}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
