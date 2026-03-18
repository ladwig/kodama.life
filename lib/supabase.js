import { createClient } from '@supabase/supabase-js';

// Server-side only – uses Service Role Key (bypasses RLS)
export function getSupabaseAdmin() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
