import axios, { AxiosError } from 'axios'
import { supabase } from '@/lib/supabase'
import type { CloneRequest, CloneResponse, Session } from '@/types/Session'
import type { ChatRequest, ChatResponse } from '@/types/Chat'

// Base URL resolves to the FastAPI backend. In dev this is proxied via vite.config.ts,
// in production set VITE_API_BASE_URL to the deployed backend origin.
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the signed-in user's token to every request. getSession() reads the
// token from storage and refreshes it when expired, so nothing downstream has
// to think about token lifetimes.
apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }

  return config
})

export class ApiError extends Error {
  kind:
    | 'network'
    | 'backend_offline'
    | 'clone_failed'
    | 'already_indexed'
    | 'qdrant_unavailable'
    | 'llm_unavailable'
    | 'invalid_url'
    | 'empty_repository'
    | 'unauthorized'
    | 'not_ready'
    | 'unknown'

  constructor(message: string, kind: ApiError['kind'] = 'unknown') {
    super(message)
    this.kind = kind
  }
}

function classifyError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ detail?: string | { message?: string } }>
    if (!err.response) {
      return new ApiError(
        'Cannot reach the backend. Confirm the FastAPI server is running.',
        'backend_offline'
      )
    }

    const rawDetail = err.response.data?.detail
    const detail =
      typeof rawDetail === 'string' ? rawDetail : rawDetail?.message || ''
    const status = err.response.status

    if (status === 401) {
      return new ApiError('Your session expired. Sign in again.', 'unauthorized')
    }
    // The backend returns 409 while a repository is still being indexed.
    if (status === 409) {
      return new ApiError(
        detail || 'This repository is still being indexed.',
        'not_ready'
      )
    }
    if (status === 422 || /invalid.*url/i.test(detail)) {
      return new ApiError('That does not look like a valid GitHub repository URL.', 'invalid_url')
    }
    if (/already indexed/i.test(detail)) {
      return new ApiError('This repository has already been indexed.', 'already_indexed')
    }
    if (/qdrant/i.test(detail)) {
      return new ApiError('The vector store is temporarily unavailable.', 'qdrant_unavailable')
    }
    if (/llm|model|gemini|embedding/i.test(detail)) {
      return new ApiError('The language model is temporarily unavailable.', 'llm_unavailable')
    }
    if (/empty/i.test(detail)) {
      return new ApiError('This repository has no readable source files.', 'empty_repository')
    }
    if (status >= 500) {
      return new ApiError(detail || 'Cloning the repository failed. Please try again.', 'clone_failed')
    }
    return new ApiError(detail || 'Something went wrong. Please try again.', 'unknown')
  }
  return new ApiError('An unexpected error occurred.', 'unknown')
}

export interface RepositoryStatus {
  repository_id: number
  repo_name: string
  index_status: 'pending' | 'indexing' | 'ready' | 'failed'
  chunk_count: number | null
  error: string | null
  ready: boolean
}

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function cloneRepository(payload: CloneRequest): Promise<CloneResponse> {
  try {
    // Returns 202 immediately — indexing continues in the background and the
    // caller polls fetchRepositoryStatus until it reports ready.
    const { data } = await apiClient.post<CloneResponse>('/clone', payload)
    return data
  } catch (error) {
    throw classifyError(error)
  }
}

export async function fetchRepositoryStatus(
  repositoryId: number
): Promise<RepositoryStatus> {
  try {
    const { data } = await apiClient.get<RepositoryStatus>(
      `/repositories/${repositoryId}/status`
    )
    return data
  } catch (error) {
    throw classifyError(error)
  }
}

export async function askQuestion(payload: ChatRequest): Promise<ChatResponse> {
  try {
    const { data } = await apiClient.post<ChatResponse>('/chat', payload)
    return data
  } catch (error) {
    throw classifyError(error)
  }
}

export async function fetchMessages(chatId: string): Promise<StoredMessage[]> {
  try {
    const { data } = await apiClient.get<StoredMessage[]>(`/chats/${chatId}/messages`)
    return data
  } catch (error) {
    throw classifyError(error)
  }
}

export async function fetchSessions(): Promise<Session[]> {
  try {
    const { data } = await apiClient.get<Session[]>('/sessions')
    return data
  } catch (error) {
    throw classifyError(error)
  }
}