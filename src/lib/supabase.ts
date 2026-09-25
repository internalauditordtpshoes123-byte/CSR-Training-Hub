import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid URL and Key are provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  typeof rawUrl === 'string' &&
  rawUrl.startsWith('https://') &&
  !rawUrl.includes('placeholder') &&
  typeof rawKey === 'string' &&
  rawKey.trim().length > 20 &&
  !rawKey.startsWith('sb_publishable_') // invalid key pattern
);

const supabaseUrl = isSupabaseConfigured && rawUrl ? rawUrl : 'https://placeholder-project.supabase.co';
const supabasePublishableKey = isSupabaseConfigured && rawKey ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.mock';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

