import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseServiceRoleKey) {
  // Provide a more helpful error message during development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Admin features will not work. Ensure it is set in your .env.local file.');
    // Avoid throwing in dev if someone just wants to view UI without full backend setup
  } else {
      throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
}

// Create a singleton Supabase client instance using the service role key
// IMPORTANT: This client bypasses all RLS policies.
// Use it ONLY in server-side code (Server Actions, API routes) where admin privileges are required.
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
    // Return null or throw error if key is missing in production
    if (!supabaseServiceRoleKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Service role key is missing, cannot create admin client.');
        }
        console.error('Service role key is missing, admin client creation skipped.');
        return null; // Return null in non-production if key is missing
    }

    if (!supabaseAdminClient) {
        supabaseAdminClient = createClient(
            supabaseUrl!,
            supabaseServiceRoleKey,
            {
                auth: {
                    // It's generally recommended to disable auto-refresh for service roles
                    // as they are long-lived and don't rely on user sessions.
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );
    }
    return supabaseAdminClient;
};

// Optional: Export the client directly if preferred, though the getter handles initialization safely
// export const supabaseAdmin = getSupabaseAdmin(); 