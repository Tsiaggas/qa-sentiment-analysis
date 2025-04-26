import { createBrowserClient } from '@supabase/ssr'

// Note: supabase BrowerClient is interchangeable with supabase ServerClient type
// @see https://github.com/supabase/auth-helpers/issues/622

// Δημιουργεί ένα Supabase client που λειτουργεί στον browser (Client Components)
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 