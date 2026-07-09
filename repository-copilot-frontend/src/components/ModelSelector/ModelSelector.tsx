import { Cpu } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { MODEL_OPTIONS } from '@/types/Chat'
import { useAppState } from '@/lib/store'

export function ModelSelector() {
  const { model, setModel } = useAppState()

  return (
    <Select value={model} onValueChange={setModel}>
      <SelectTrigger className="min-w-[9.5rem]">
        <Cpu className="h-3.5 w-3.5 text-violet-bright" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODEL_OPTIONS.map((option) => (
          <SelectItem key={option.id} value={option.id} disabled={!option.available}>
            <span className="flex items-center gap-2">
              {option.label}
              {!option.available && (
                <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-text-low">
                  soon
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
