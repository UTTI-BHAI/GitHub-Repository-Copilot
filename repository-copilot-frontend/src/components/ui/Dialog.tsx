import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string
  children: React.ReactNode
  title: string
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl2 border border-hairline bg-panel p-6 shadow-glass animate-fade-in',
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogPrimitive.Title className="font-display text-lg font-semibold text-text-hi">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-md p-1 text-text-mid hover:bg-elevated hover:text-text-hi">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
