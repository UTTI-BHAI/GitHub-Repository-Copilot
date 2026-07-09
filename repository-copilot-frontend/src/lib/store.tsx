import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { Session } from '@/types/Session'
import type { ChatMessage } from '@/types/Chat'

const HISTORY_KEY = 'rc.chatHistories'
const THEME_KEY = 'rc.theme'
const SIDEBAR_KEY = 'rc.sidebarCollapsed'
const MODEL_KEY = 'rc.model'

type ChatHistories = Record<string, ChatMessage[]>

function readHistories(): ChatHistories {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

interface AppState {
  sessions: Session[]
  setSessions: Dispatch<SetStateAction<Session[]>>
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  histories: ChatHistories
  appendMessage: (sessionId: string, message: ChatMessage) => void
  updateMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => void
  removeMessage: (sessionId: string, messageId: string) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  rightPanelOpen: boolean
  setRightPanelOpen: (v: boolean) => void
  showRepositoryInput: boolean
  setShowRepositoryInput: (v: boolean) => void
  model: string
  setModel: (id: string) => void
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [histories, setHistories] = useState<ChatHistories>(() => readHistories())
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true'
  )
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [showRepositoryInput, setShowRepositoryInput] = useState(true)
  const [model, setModel] = useState<string>(() => localStorage.getItem(MODEL_KEY) || 'gpt-4.1')

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(histories))
  }, [histories])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  useEffect(() => {
    localStorage.setItem(MODEL_KEY, model)
  }, [model])

  const value = useMemo<AppState>(
    () => ({
      sessions,
      setSessions,
      activeSessionId,
      setActiveSessionId,
      histories,
      appendMessage: (sessionId, message) =>
        setHistories((prev) => ({
          ...prev,
          [sessionId]: [...(prev[sessionId] || []), message],
        })),
      updateMessage: (sessionId, messageId, patch) =>
        setHistories((prev) => ({
          ...prev,
          [sessionId]: (prev[sessionId] || []).map((m) =>
            m.id === messageId ? { ...m, ...patch } : m
          ),
        })),
      removeMessage: (sessionId, messageId) =>
        setHistories((prev) => ({
          ...prev,
          [sessionId]: (prev[sessionId] || []).filter((m) => m.id !== messageId),
        })),
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      sidebarCollapsed,
      setSidebarCollapsed,
      rightPanelOpen,
      setRightPanelOpen,
      showRepositoryInput,
      setShowRepositoryInput,
      model,
      setModel,
    }),
    [sessions, activeSessionId, histories, theme, sidebarCollapsed, rightPanelOpen, model]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
