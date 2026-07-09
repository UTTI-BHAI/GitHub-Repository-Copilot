import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 items-center justify-between gap-2 rounded-lg border border-hairline bg-elevated px-3 text-sm text-text-hi hover:bg-elevated2 focus:outline-none focus:ring-2 focus:ring-violet/50',
        className
      )}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="h-3.5 w-3.5 text-text-mid" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-hairline bg-elevated2 p-1 shadow-glass animate-fade-in"
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  value,
  children,
  disabled,
}: {
  value: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-text-hi outline-none data-[highlighted]:bg-elevated data-[disabled]:cursor-not-allowed data-[disabled]:text-text-low'
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-violet-bright" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}
