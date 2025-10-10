/**
 * Supabase Client Configuration
 *
 * This file provides both client-side and server-side Supabase clients
 * for interacting with the database and authentication system.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Client-side Supabase client
 *
 * Use this client for browser-side operations where Row Level Security (RLS)
 * policies should be enforced based on the authenticated user.
 *
 * Features:
 * - Automatic authentication state management
 * - RLS policies enforced
 * - Safe for client-side use
 *
 * @example
 * ```typescript
 * import { supabase } from '@/lib/supabase';
 *
 * // Fetch user's trades
 * const { data, error } = await supabase
 *   .from('trades')
 *   .select('*')
 *   .order('entry_date', { ascending: false });
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Server-side Supabase client (Admin)
 *
 * Use this client ONLY in server-side code (API routes, server components)
 * when you need to bypass Row Level Security policies.
 *
 * WARNING: Never expose this client or the service role key to the client-side.
 * Only use when you need admin-level access to the database.
 *
 * @example
 * ```typescript
 * import { supabaseAdmin } from '@/lib/supabase';
 *
 * // Server-side only: Fetch all users (bypasses RLS)
 * const { data, error } = await supabaseAdmin
 *   .from('users')
 *   .select('*');
 * ```
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    })
  : null;

/**
 * Type-safe database types
 *
 * You can generate these types automatically from your Supabase schema:
 * ```bash
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
 * ```
 */
export type Database = {
  public: {
    Tables: {
      trades: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          account_id: string | null;
          account_name: string | null;
          entry_price: number;
          exit_price: number | null;
          quantity: number;
          trade_type: 'long' | 'short';
          entry_date: string;
          exit_date: string | null;
          pnl: number;
          fees: number;
          notes: string | null;
          tags: string[] | null;
          strategy: string | null;
          image_url: string | null;
          broker: string | null;
          status: 'open' | 'closed';
          risk_reward_ratio: number | null;
          stop_loss: number | null;
          take_profit: number | null;
          asset_class: 'stocks' | 'options' | 'futures' | 'crypto' | 'forex' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          account_id?: string | null;
          account_name?: string | null;
          entry_price: number;
          exit_price?: number | null;
          quantity: number;
          trade_type: 'long' | 'short';
          entry_date: string;
          exit_date?: string | null;
          pnl: number;
          fees?: number;
          notes?: string | null;
          tags?: string[] | null;
          strategy?: string | null;
          image_url?: string | null;
          broker?: string | null;
          status?: 'open' | 'closed';
          risk_reward_ratio?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          asset_class?: 'stocks' | 'options' | 'futures' | 'crypto' | 'forex' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          account_id?: string | null;
          account_name?: string | null;
          entry_price?: number;
          exit_price?: number | null;
          quantity?: number;
          trade_type?: 'long' | 'short';
          entry_date?: string;
          exit_date?: string | null;
          pnl?: number;
          fees?: number;
          notes?: string | null;
          tags?: string[] | null;
          strategy?: string | null;
          image_url?: string | null;
          broker?: string | null;
          status?: 'open' | 'closed';
          risk_reward_ratio?: number | null;
          stop_loss?: number | null;
          take_profit?: number | null;
          asset_class?: 'stocks' | 'options' | 'futures' | 'crypto' | 'forex' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          experience_level: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
          years_of_experience: number | null;
          trading_style: 'day_trading' | 'swing_trading' | 'scalping' | 'position_trading' | 'mixed' | null;
          preferred_markets: string[] | null;
          country: string | null;
          phone: string | null;
          linkedin_url: string | null;
          twitter_handle: string | null;
          default_broker: string | null;
          currency: string | null;
          theme: 'light' | 'dark' | 'system' | null;
          email_notifications: boolean;
          daily_summary_email: boolean;
          weekly_report_email: boolean;
          timezone: string | null;
          default_chart_type: string | null;
          items_per_page: number;
          default_date_range: string | null;
          show_pnl_percentage: boolean;
          max_risk_per_trade: number | null;
          max_daily_loss: number | null;
          max_position_size: number | null;
          subscription_tier: 'free' | 'premium' | 'professional' | 'enterprise';
          account_balance: number | null;
          starting_balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
          years_of_experience?: number | null;
          trading_style?: 'day_trading' | 'swing_trading' | 'scalping' | 'position_trading' | 'mixed' | null;
          preferred_markets?: string[] | null;
          country?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          twitter_handle?: string | null;
          default_broker?: string | null;
          currency?: string | null;
          theme?: 'light' | 'dark' | 'system' | null;
          email_notifications?: boolean;
          daily_summary_email?: boolean;
          weekly_report_email?: boolean;
          timezone?: string | null;
          default_chart_type?: string | null;
          items_per_page?: number;
          default_date_range?: string | null;
          show_pnl_percentage?: boolean;
          max_risk_per_trade?: number | null;
          max_daily_loss?: number | null;
          max_position_size?: number | null;
          subscription_tier?: 'free' | 'premium' | 'professional' | 'enterprise';
          account_balance?: number | null;
          starting_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional' | null;
          years_of_experience?: number | null;
          trading_style?: 'day_trading' | 'swing_trading' | 'scalping' | 'position_trading' | 'mixed' | null;
          preferred_markets?: string[] | null;
          country?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          twitter_handle?: string | null;
          default_broker?: string | null;
          currency?: string | null;
          theme?: 'light' | 'dark' | 'system' | null;
          email_notifications?: boolean;
          daily_summary_email?: boolean;
          weekly_report_email?: boolean;
          timezone?: string | null;
          default_chart_type?: string | null;
          items_per_page?: number;
          default_date_range?: string | null;
          show_pnl_percentage?: boolean;
          max_risk_per_trade?: number | null;
          max_daily_loss?: number | null;
          max_position_size?: number | null;
          subscription_tier?: 'free' | 'premium' | 'professional' | 'enterprise';
          account_balance?: number | null;
          starting_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

/**
 * Helper function to check if user is authenticated
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Helper function to get the current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Helper function to sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
