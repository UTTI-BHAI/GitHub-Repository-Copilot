import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cloneRepository, ApiError } from '@/services/api'
import { useAppState } from '@/lib/store'
import { repoNameFromUrl, isValidGithubUrl } from '@/lib/utils'
import type { IndexStage } from '@/types/Repository'

// Cosmetic progress copy shown while the real POST /clone request is in flight.
// The backend performs these steps synchronously; since it returns a single
// response rather than a progress stream, we advance through this sequence
// on a timer and reconcile with the real result the moment it arrives.
const STAGE_SEQUENCE: { stage: IndexStage; label: string }[] = [
  { stage: 'cloning', label: 'Cloning repository…' },
  { stage: 'reading', label: 'Reading source files…' },
  { stage: 'chunking', label: 'Extracting code chunks…' },
  { stage: 'embedding', label: 'Generating embeddings…' },
  { stage: 'storing', label: 'Storing vectors…' },
]

export function useCloneRepository() {
  const {
  setSessions,
  setActiveSessionId,
  setShowRepositoryInput,
} = useAppState()
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<IndexStage>('idle')
  const [stageLabel, setStageLabel] = useState<string>('')
  const [error, setError] = useState<ApiError | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const clone = useCallback(
    async (url: string) => {
      setError(null)

      if (!isValidGithubUrl(url)) {
        setError(new ApiError('That does not look like a valid GitHub repository URL.', 'invalid_url'))
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
    [
      setSessions,
      setActiveSessionId,
      setShowRepositoryInput,
      queryClient,
      ]
  )

  const reset = useCallback(() => {
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
