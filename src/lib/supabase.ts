import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// Server-side admin client (bypasses RLS) — only for webhooks/server-to-server
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Browser client (for 'use client' components)
export function createBrowserSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
