import { useRef, useState, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (text: string) => void
  disabled: boolean
  placeholder?: string
}

export function MessageInput({ onSend, disabled, placeholder }: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="border-t border-hairline bg-panel/80 px-4 py-3 backdrop-blur-xs">
      <div
        className={cn(
          'mx-auto flex max-w-3xl items-end gap-2 rounded-xl2 border border-hairline bg-elevated p-2 shadow-soft transition-shadow focus-within:shadow-glow'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoGrow(e.target)
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder ?? 'Ask anything about this repository...'}
          className="max-h-40 w-full flex-1 resize-none bg-transparent px-2 py-2 text-sm text-text-hi placeholder:text-text-low focus:outline-none disabled:opacity-50"
        />
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          aria-label="Send message"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-text-low">
        Press Enter to send · Shift+Enter for a new line
      </p>
    </div>
  )
}
