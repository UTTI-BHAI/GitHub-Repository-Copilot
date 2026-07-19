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

  const handleGoogle = async () => {
    setError(null)

    // Sends the browser to Google, which returns to Supabase, which returns
    // here. redirectTo must also be listed under Redirect URLs in the
    // Supabase dashboard or the round trip is rejected.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl2 border border-hairline bg-elevated p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-2">
            <Github className="h-5 w-5 text-text-low" />
            <h1 className="text-lg font-medium text-text-hi">Repository Copilot</h1>
          </div>

          <p className="mb-6 text-sm text-text-mid">
            Sign in to ask questions about a GitHub repository.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            className="mb-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-elevated2 text-sm text-text-hi transition hover:bg-hairline"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-[11px] uppercase tracking-wider text-text-low">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email" className="mb-1 block text-xs text-text-low">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 h-10 w-full rounded-lg border border-hairline bg-transparent px-3 text-sm text-text-hi focus:outline-none focus:ring-1 focus:ring-violet"
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
              className="mb-4 h-10 w-full rounded-lg border border-hairline bg-transparent px-3 text-sm text-text-hi focus:outline-none focus:ring-1 focus:ring-violet"
            />

            {error && <p className="mb-4 text-xs text-gitred">{error}</p>}

            <Button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full justify-center"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Google's mark, inlined so the button doesn't depend on an external asset.
function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.27 4 24 4 13.5 4 5 12.5 5 23s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.05 6.05 29.27 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 42c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 33.1 26.7 34 24 34c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 37.6 16.2 42 24 42z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 40.2 43 36 43 23c0-1.3-.1-2.3-.4-2.5z"
      />
    </svg>
  )
}