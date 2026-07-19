import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog'
import { ModelSelector } from '@/components/ModelSelector/ModelSelector'

import { cn } from '@/lib/utils'

type Tab = 'settings' | 'about'

export function SettingsDialog({
  children,
  defaultTab = 'settings',
}: {
  children: React.ReactNode
  defaultTab?: Tab
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(defaultTab)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setTab(defaultTab) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent title={tab === 'settings' ? 'Settings' : 'About'}>
        <div className="mb-4 flex gap-1 rounded-lg bg-elevated p-1">
          {(['settings', 'about'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors',
                tab === t ? 'bg-violet text-white' : 'text-text-mid hover:text-text-hi'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'settings' ? (
          <div className="space-y-4">

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-low">
                Default model
              </p>
              <ModelSelector />
              <p className="mt-1.5 text-xs text-text-low">
                Additional providers are wired into the UI and will activate as backend support ships.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-text-mid">
            <p>
              <span className="font-display font-semibold text-text-hi">Repository Copilot</span> reads,
              indexes, and answers questions about any public GitHub repository using AST-based chunking,
              hybrid retrieval, and an LLM grounded in your codebase.
            </p>
            <p className="font-mono text-xs text-text-low">v1.0.0 · build 2026.07</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
