import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  className?: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full bg-elevated2 border border-hairline transition-colors data-[state=checked]:bg-violet',
        className
      )}
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  )
}
