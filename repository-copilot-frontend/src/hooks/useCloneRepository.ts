import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cloneRepository, fetchRepositoryStatus, ApiError } from '@/services/api'
import { useAppState } from '@/lib/store'
import { repoNameFromUrl, isValidGithubUrl } from '@/lib/utils'
import type { IndexStage } from '@/types/Repository'

// POST /clone now returns 202 immediately and indexing continues in the
// background, so completion is decided by polling GET
// /repositories/{id}/status — not by the clone response.
//
// The backend reports a single "indexing" state rather than sub-steps, so
// these labels rotate for the sake of showing movement. They describe what
// the server is doing; they do not track it step by step.
const STAGE_SEQUENCE: { stage: IndexStage; label: string }[] = [
  { stage: 'cloning', label: 'Cloning repository…' },
  { stage: 'reading', label: 'Reading source files…' },
  { stage: 'chunking', label: 'Extracting code chunks…' },
  { stage: 'embedding', label: 'Generating embeddings…' },
  { stage: 'storing', label: 'Storing vectors…' },
]

const POLL_INTERVAL_MS = 2000

export function useCloneRepository() {
  const { setSessions, setActiveSessionId, setShowRepositoryInput } = useAppState()
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<IndexStage>('idle')
  const [stageLabel, setStageLabel] = useState<string>('')
  const [error, setError] = useState<ApiError | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Indexing a large repository takes minutes, so stop polling if the user
  // navigates away rather than leaving a timer running against a dead view.
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [])

  const waitUntilIndexed = useCallback(async (repositoryId: number) => {
    while (!cancelledRef.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

      if (cancelledRef.current) return false

      const status = await fetchRepositoryStatus(repositoryId)

      if (status.index_status === 'ready') return true

      if (status.index_status === 'failed') {
        throw new ApiError(
          status.error || 'Indexing failed. Try cloning the repository again.',
          'clone_failed'
        )
      }
      // 'pending' or 'indexing' — keep waiting.
    }

    return false
  }, [])

  const clone = useCallback(
    async (url: string) => {
      setError(null)
      cancelledRef.current = false

      if (!isValidGithubUrl(url)) {
        setError(
          new ApiError('That does not look like a valid GitHub repository URL.', 'invalid_url')
        )
        setStage('error')
        return null
      }

      setStage(STAGE_SEQUENCE[0].stage)
      setStageLabel(STAGE_SEQUENCE[0].label)

      let idx = 0
      timerRef.current = setInterval(() => {
        idx = Math.min(idx + 1, STAGE_SEQUENCE.length - 1)
        setStage(STAGE_SEQUENCE[idx].stage)
        setStageLabel(STAGE_SEQUENCE[idx].label)
      }, 900)

      try {
        const result = await cloneRepository({ url })

        // A repository indexed earlier is ready straight away; a new one
        // has to finish in the background first.
        if (result.index_status !== 'ready') {
          const finished = await waitUntilIndexed(result.repository_id)
          if (!finished) {
            clearTimer()
            return null
          }
        }

        clearTimer()
        setStage('ready')
        setStageLabel('Repository ready')

        setSessions((prev) => {
          const exists = prev.some((s) => s.id === result.session_id)
          if (exists) return prev
          return [...prev, { id: result.session_id, repo_name: result.repo_name, url }]
        })
        setActiveSessionId(result.session_id)

        setShowRepositoryInput(false)

        queryClient.invalidateQueries({
          queryKey: ['sessions'],
        })

        return result
      } catch (e) {
        clearTimer()
        setStage('error')
        setError(e as ApiError)
        return null
      }
    },
    [setSessions, setActiveSessionId, setShowRepositoryInput, queryClient, waitUntilIndexed]
  )

  const reset = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    setStage('idle')
    setStageLabel('')
    setError(null)
  }, [])

  return {
    clone,
    reset,
    stage,
    stageLabel,
    error,
    isCloning: stage !== 'idle' && stage !== 'ready' && stage !== 'error',
    repoNameFromUrl,
  }
}