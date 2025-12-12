/**
 * Supabase Client - Browser-side client
 * Uses singleton pattern to prevent multiple GoTrueClient instances
 * Uses cookie storage for SSR compatibility
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton instance
let supabaseInstance: SupabaseClient | null = null

/**
 * Creates a Supabase client for browser-side use (singleton)
 * Use this in client components and pages
 */
export function createClient() {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Environment variables validation (lazy - only when client is created)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Create new instance with cookie storage (for SSR compatibility)
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return supabaseInstance
}
