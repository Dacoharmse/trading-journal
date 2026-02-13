/**
 * User Store - Zustand state management for user authentication and preferences
 * Manages user state, session data, and preferences with Supabase persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserPreferences, AuthSession } from '@/types/user';
import { createClient } from '@/lib/supabase/client';

// Get the supabase client (singleton)
const getSupabase = () => createClient();

interface UserState {
  // State
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  setSession: (session: AuthSession | null) => void;
  isAuthenticated: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: false,
      error: null,

      // Fetch user and profile from Supabase
      fetchUser: async () => {
        set({ isLoading: true, error: null });

        try {
          const supabase = getSupabase();
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (!authUser) {
            // No authenticated user, use local user for development
            const localUser: User = {
              id: 'local-user',
              email: 'trader@tradingjournal.com',
              subscription_tier: 'free',
              status: 'active',
              email_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              profile: {
                full_name: '',
                experience_level: 'beginner',
                trading_style: 'day_trading',
              },
              preferences: {
                theme: 'dark',
                currency: 'USD',
                timezone: 'UTC',
                language: 'en',
                confluences: [],
              },
            };
            set({ user: localUser, isLoading: false });
            return;
          }

          // Fetch user profile from Supabase
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 is "not found" - ignore it for new users
            throw profileError;
          }

          // Transform profile data to User format
          const user: User = {
            id: authUser.id,
            email: authUser.email!,
            subscription_tier: profile?.subscription_tier || 'free',
            status: 'active',
            email_verified: authUser.email_confirmed_at !== null,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || authUser.created_at,
            profile: {
              full_name: profile?.full_name || '',
              bio: profile?.bio || undefined,
              phone: profile?.phone || undefined,
              country: profile?.country || undefined,
              experience_level: profile?.experience_level || 'beginner',
              years_of_experience: profile?.years_of_experience || undefined,
              trading_style: profile?.trading_style || 'day_trading',
              twitter_handle: profile?.twitter_handle || undefined,
              linkedin_url: profile?.linkedin_url || undefined,
            },
            preferences: {
              theme: profile?.theme || 'dark',
              currency: profile?.currency || 'USD',
              timezone: profile?.timezone || 'UTC',
              language: 'en',
              confluences: profile?.confluences || [],
              default_broker: profile?.default_broker || undefined,
              default_chart_type: profile?.default_chart_type || 'candlestick',
              items_per_page: profile?.items_per_page || 50,
              default_date_range: profile?.default_date_range || '30d',
              show_pnl_percentage: profile?.show_pnl_percentage || false,
              max_risk_per_trade: profile?.max_risk_per_trade || undefined,
              max_daily_loss: profile?.max_daily_loss || undefined,
              max_position_size: profile?.max_position_size || undefined,
            },
          };

          set({ user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      // Set user data
      setUser: (user) => {
        set({ user });
      },

      // Clear user and session (logout)
      clearUser: () => {
        set({ user: null, session: null });
      },

      // Update user preferences in Supabase
      updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });

        try {
          const state = get();
          if (!state.user) {
            set({ error: 'No user logged in', isLoading: false });
            return;
          }

          // If using local user (development), just update locally
          if (state.user.id === 'local-user') {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                preferences: {
                  ...state.user.preferences,
                  ...preferences,
                },
              } : null,
              isLoading: false,
            }));
            return;
          }

          // Update in Supabase - filter out undefined values
          const updateData: Record<string, unknown> = {};
          if (preferences.theme !== undefined) updateData.theme = preferences.theme;
          if (preferences.currency !== undefined) updateData.currency = preferences.currency;
          if (preferences.timezone !== undefined) updateData.timezone = preferences.timezone;
          if (preferences.confluences !== undefined) updateData.confluences = preferences.confluences;
          if (preferences.default_broker !== undefined) updateData.default_broker = preferences.default_broker;
          if (preferences.default_chart_type !== undefined) updateData.default_chart_type = preferences.default_chart_type;
          if (preferences.items_per_page !== undefined) updateData.items_per_page = preferences.items_per_page;
          if (preferences.default_date_range !== undefined) updateData.default_date_range = preferences.default_date_range;
          if (preferences.show_pnl_percentage !== undefined) updateData.show_pnl_percentage = preferences.show_pnl_percentage;
          if (preferences.max_risk_per_trade !== undefined) updateData.max_risk_per_trade = preferences.max_risk_per_trade;
          if (preferences.max_daily_loss !== undefined) updateData.max_daily_loss = preferences.max_daily_loss;
          if (preferences.max_position_size !== undefined) updateData.max_position_size = preferences.max_position_size;

          // Notification preferences
          if (preferences.email_notifications !== undefined) updateData.email_notifications = preferences.email_notifications;
          if (preferences.daily_summary_email !== undefined) updateData.daily_summary_email = preferences.daily_summary_email;
          if (preferences.weekly_report_email !== undefined) updateData.weekly_report_email = preferences.weekly_report_email;
          if (preferences.profit_target_alerts !== undefined) updateData.profit_target_alerts = preferences.profit_target_alerts;
          if (preferences.drawdown_warnings !== undefined) updateData.drawdown_warnings = preferences.drawdown_warnings;
          if (preferences.daily_loss_alerts !== undefined) updateData.daily_loss_alerts = preferences.daily_loss_alerts;
          if (preferences.trade_reminders !== undefined) updateData.trade_reminders = preferences.trade_reminders;
          if (preferences.winning_streak_notifications !== undefined) updateData.winning_streak_notifications = preferences.winning_streak_notifications;
          if (preferences.personal_best_notifications !== undefined) updateData.personal_best_notifications = preferences.personal_best_notifications;
          if (preferences.milestone_notifications !== undefined) updateData.milestone_notifications = preferences.milestone_notifications;

          const supabase = getSupabase();
          const { error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', state.user.id);

          if (error) {
            throw error;
          }

          // Update local state
          set((state) => ({
            user: state.user ? {
              ...state.user,
              preferences: {
                ...state.user.preferences,
                ...preferences,
              },
            } : null,
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      // Update user profile in Supabase
      updateProfile: async (profile) => {
        set({ isLoading: true, error: null });

        try {
          const state = get();
          if (!state.user) {
            set({ error: 'No user logged in', isLoading: false });
            return;
          }

          // If using local user (development), just update locally
          if (state.user.id === 'local-user') {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                ...profile,
                profile: {
                  ...state.user.profile,
                  ...profile.profile,
                },
              } : null,
              isLoading: false,
            }));
            return;
          }

          // Update in Supabase
          const updateData = {
            full_name: profile.profile?.full_name,
            bio: profile.profile?.bio,
            phone: profile.profile?.phone,
            country: profile.profile?.country,
            experience_level: profile.profile?.experience_level,
            years_of_experience: profile.profile?.years_of_experience,
            trading_style: profile.profile?.trading_style,
            twitter_handle: profile.profile?.twitter_handle,
            linkedin_url: profile.profile?.linkedin_url,
          };

          const supabase = getSupabase();
          const { error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', state.user.id);

          if (error) {
            throw error;
          }

          // Update local state
          set((state) => ({
            user: state.user ? {
              ...state.user,
              ...profile,
              profile: {
                ...state.user.profile,
                ...profile.profile,
              },
            } : null,
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      // Set session data
      setSession: (session) => {
        set({ session });
      },

      // Check if user is authenticated
      isAuthenticated: () => {
        const { user, session } = get();
        if (!user || !session) return false;

        // Check if session has expired
        const expiresAt = new Date(session.expires_at);
        const now = new Date();

        return expiresAt > now;
      },
    }),
    {
      name: 'user-storage',
      // Persist user and session in localStorage for quick access
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);
