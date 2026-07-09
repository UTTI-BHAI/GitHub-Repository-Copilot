import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { askQuestion, ApiError } from '@/services/api'
import { useAppState } from '@/lib/store'
import type { ChatMessage } from '@/types/Chat'

const STREAM_CHAR_INTERVAL_MS = 12

export function useChat(sessionId: string | null) {
  const { histories, appendMessage, updateMessage, removeMessage } = useAppState()
  const [isThinking, setIsThinking] = useState(false)
  const [phase, setPhase] = useState<'thinking' | 'generating' | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const messages: ChatMessage[] = sessionId ? histories[sessionId] || [] : []

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

  return { messages, send, regenerate, vote, isThinking, phase, error }
}
