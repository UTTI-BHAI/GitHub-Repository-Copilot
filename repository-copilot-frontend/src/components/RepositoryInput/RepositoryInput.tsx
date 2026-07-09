import { useState } from 'react'
import { ArrowRight, Github } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface RepositoryInputProps {
  onSubmit: (url: string) => void
  disabled: boolean
  errorMessage?: string | null
}

export function RepositoryInput({ onSubmit, disabled, errorMessage }: RepositoryInputProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || disabled) return
    onSubmit(url.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl2 border bg-elevated p-1.5 pl-4 shadow-soft transition-shadow focus-within:shadow-glow',
          errorMessage ? 'border-gitred/50' : 'border-hairline'
        )}
      >
        <Github className="h-4 w-4 shrink-0 text-text-low" />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled}
          placeholder="Paste GitHub Repository URL..."
          className="h-10 w-full flex-1 bg-transparent font-mono text-sm text-text-hi placeholder:font-body placeholder:text-text-low focus:outline-none disabled:opacity-50"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
        <Button type="submit" disabled={disabled || !url.trim()} className="shrink-0">
          Clone Repository
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {errorMessage && <p className="mt-2 text-xs text-gitred">{errorMessage}</p>}
    </form>
  )
}
