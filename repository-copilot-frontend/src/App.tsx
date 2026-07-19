import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Session as SupabaseSession } from '@supabase/supabase-js'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { AppStateProvider } from '@/lib/store'
import { Home } from '@/pages/Home'
import { Login } from '@/components/Login'
import { supabase } from '@/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
})

export default function App() {
  const [session, setSession] = useState<SupabaseSession | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Restores an existing session on load, so a refresh doesn't sign you out.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    // Fires on sign in, sign out, and token refresh — this is what swaps the
    // login screen for the app without a page reload.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-base" />
  }

  if (!session) {
    return <Login />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppStateProvider>
    </QueryClientProvider>
  )
}
