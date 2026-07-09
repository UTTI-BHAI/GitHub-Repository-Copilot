export type IndexStage =
  | 'idle'
  | 'cloning'
  | 'reading'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'ready'
  | 'error'

export interface RepositoryInfo {
  name: string
  url: string
  sessionId: string
  indexed: boolean
}

/** Cosmetic language color map for the sidebar's signature language-dot marker. */
export const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3FB950',
  TypeScript: '#6CD4FF',
  JavaScript: '#E8A33D',
  Go: '#6CD4FF',
  Rust: '#F85149',
  Java: '#E8A33D',
  Ruby: '#F85149',
  'C++': '#9686FF',
  Default: '#7C6AEF',
}
