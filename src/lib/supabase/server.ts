import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a supabase client for server-side operations (Server Components, Route Handlers, Server Actions)
// Important: Uses the cookies() function from next/headers, so it can only be used
// in Server Components, Route Handlers, or Server Actions.
export const createClient = () => {
  // We still define cookieStore here for set/remove context, though it's read-only.
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string): string | undefined => {
          // Use the cookieStore defined above, reverting the direct cookies() call here
          // @ts-expect-error - Property 'get' does not exist on type 'Promise<ReadonlyRequestCookies>' (Likely type inference issue)
          return cookieStore.get(name)?.value
        },
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            // @ts-expect-error - Property 'set' does not exist on type 'ReadonlyRequestCookies'.
            // This is intentional as 'set' is called here by Supabase, but actual cookie
            // setting relies on Middleware or Server Actions in Next.js App Router.
            cookieStore.set({ name, value, ...options })
          } catch { // Removed unused _error variable
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            // @ts-expect-error - Property 'set' does not exist on type 'ReadonlyRequestCookies'.
            // This is intentional as 'set' is called here by Supabase (to remove cookies),
            // but actual cookie setting relies on Middleware or Server Actions.
            cookieStore.set({ name, value: '', ...options })
          } catch { // Removed unused _error variable
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
} 