export type MessageRole = 'user' | 'assistant'

export type FeedbackVote = 'up' | 'down' | null

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  isStreaming?: boolean
  vote?: FeedbackVote
}

export interface ChatRequest {
  session_id: string
  question: string
}

export interface ChatResponse {
  answer: string
}

export interface ModelOption {
  id: string
  label: string
  available: boolean
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'gpt-4.1', label: 'GPT-4.1', available: true },
  { id: 'gpt-5', label: 'GPT-5', available: false },
  { id: 'claude', label: 'Claude', available: false },
  { id: 'gemini', label: 'Gemini', available: false },
  { id: 'groq', label: 'Groq', available: false },
  { id: 'ollama', label: 'Ollama', available: false },
]
