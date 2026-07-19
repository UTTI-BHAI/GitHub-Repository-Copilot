import { createClient } from '@supabase/supabase-js'

// The publishable (anon) key is designed to be public — it identifies the
// project, it doesn't grant privileges. Row Level Security is what actually
// protects the tables. The service_role key is the one that must never
// appear in frontend code.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env file'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)