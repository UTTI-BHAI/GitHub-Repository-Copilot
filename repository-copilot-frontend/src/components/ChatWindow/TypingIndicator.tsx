export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-low">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-violet-bright [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-violet-bright [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-violet-bright" />
      </span>
      {label}
    </div>
  )
}
