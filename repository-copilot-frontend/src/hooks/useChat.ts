import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { askQuestion, fetchMessages, ApiError } from '@/services/api'
import { useAppState } from '@/lib/store'
import type { ChatMessage } from '@/types/Chat'

const STREAM_CHAR_INTERVAL_MS = 12

export function useChat(sessionId: string | null) {
  const { histories, appendMessage, updateMessage, removeMessage, setSessionHistory } =
    useAppState()
  const [isThinking, setIsThinking] = useState(false)
  const [phase, setPhase] = useState<'thinking' | 'generating' | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Sessions whose transcript has already been pulled this mount, so
  // switching back and forth doesn't refetch on every render.
  const loadedRef = useRef<Set<string>>(new Set())

  const messages: ChatMessage[] = sessionId ? histories[sessionId] || [] : []

  // The database is the source of truth for a conversation — localStorage is
  // only a per-browser cache. Loading the transcript on open is what makes
  // chats survive a different browser, a cleared cache, or a server restart.
  useEffect(() => {
    if (!sessionId || loadedRef.current.has(sessionId)) return

    let cancelled = false
    loadedRef.current.add(sessionId)
    setIsLoadingHistory(true)

    fetchMessages(sessionId)
      .then((stored) => {
        if (cancelled) return

        const restored: ChatMessage[] = stored.map((m) => ({
          id: uuid(),
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        }))

        setSessionHistory(sessionId, restored)
      })
      .catch(() => {
        // A failed load is not worth blocking the chat over — whatever is in
        // local state stays, and allow a retry on the next open.
        loadedRef.current.delete(sessionId)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionId, setSessionHistory])

  const streamIn = useCallback(
    (sid: string, messageId: string, fullText: string) =>
      new Promise<void>((resolve) => {
        let i = 0
        const tick = () => {
          i += Math.max(1, Math.round(fullText.length / 120))
          updateMessage(sid, messageId, {
            content: fullText.slice(0, i),
            isStreaming: i < fullText.length,
          })
          if (i < fullText.length) {
            setTimeout(tick, STREAM_CHAR_INTERVAL_MS)
          } else {
            resolve()
          }
        }
        tick()
      }),
    [updateMessage]
  )

  const send = useCallback(
    async (question: string) => {
      if (!sessionId || !question.trim()) return
      setError(null)

      const userMessage: ChatMessage = {
        id: uuid(),
        role: 'user',
        content: question.trim(),
        createdAt: new Date().toISOString(),
      }
      appendMessage(sessionId, userMessage)

      setIsThinking(true)
      setPhase('thinking')

      const assistantId = uuid()
      appendMessage(sessionId, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      })

      try {
        const result = await askQuestion({ session_id: sessionId, question: question.trim() })
        setPhase('generating')
        await streamIn(sessionId, assistantId, result.answer)
      } catch (e) {
        removeMessage(sessionId, assistantId)
        setError(e as ApiError)
      } finally {
        setIsThinking(false)
        setPhase(null)
      }
    },
    [sessionId, appendMessage, removeMessage, streamIn]
  )

  const regenerate = useCallback(
    async (messageId: string) => {
      if (!sessionId) return
      const idx = messages.findIndex((m) => m.id === messageId)
      if (idx < 1) return
      const priorUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
      if (!priorUser) return

      setError(null)
      setIsThinking(true)
      setPhase('thinking')
      updateMessage(sessionId, messageId, { content: '', isStreaming: true })

      try {
        const result = await askQuestion({ session_id: sessionId, question: priorUser.content })
        setPhase('generating')
        await streamIn(sessionId, messageId, result.answer)
      } catch (e) {
        setError(e as ApiError)
        updateMessage(sessionId, messageId, {
          content: '_Regeneration failed. Please try again._',
          isStreaming: false,
        })
      } finally {
        setIsThinking(false)
        setPhase(null)
      }
    },
    [sessionId, messages, updateMessage, streamIn]
  )

  const vote = useCallback(
    (messageId: string, value: 'up' | 'down') => {
      if (!sessionId) return
      const current = messages.find((m) => m.id === messageId)
      updateMessage(sessionId, messageId, { vote: current?.vote === value ? null : value })
    },
    [sessionId, messages, updateMessage]
  )

  return { messages, send, regenerate, vote, isThinking, phase, error, isLoadingHistory }
}
