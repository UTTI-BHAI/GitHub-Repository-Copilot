import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSessions } from '@/services/api'
import { useAppState } from '@/lib/store'

export function useSessions() {
  const {
  setSessions,
  activeSessionId,
  setActiveSessionId,
  setShowRepositoryInput,
} = useAppState()

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (query.data) {
      setSessions(query.data)

      if (query.data.length === 0) {
        setShowRepositoryInput(true)
      } else {
        setShowRepositoryInput(false)

        if (!activeSessionId) {
          setActiveSessionId(
            query.data[query.data.length - 1].id
          )
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  return query
}
