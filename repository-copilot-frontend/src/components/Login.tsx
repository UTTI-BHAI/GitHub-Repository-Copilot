import { useState } from 'react'
import { Github } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || busy) return

    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // On success the auth listener in App swaps this screen out, so there is
    // nothing to do here except surface a failure.
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="rounded-xl2 border border-hairline bg-elevated p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-2">
            <Github className="h-5 w-5 text-text-low" />
            <h1 className="text-lg font-medium text-text-hi">Repository Copilot</h1>
          </div>

          <p className="mb-6 text-sm text-text-low">
            Sign in to ask questions about a GitHub repository.
          </p>

          <label htmlFor="email" className="mb-1 block text-xs text-text-low">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 h-10 w-full rounded-lg border border-hairline bg-transparent px-3 text-sm text-text-hi focus:outline-none focus:ring-1 focus:ring-hairline"
          />

          <label htmlFor="password" className="mb-1 block text-xs text-text-low">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 h-10 w-full rounded-lg border border-hairline bg-transparent px-3 text-sm text-text-hi focus:outline-none focus:ring-1 focus:ring-hairline"
          />

          {error && <p className="mb-4 text-xs text-gitred">{error}</p>}

          <Button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full justify-center"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  )
}
