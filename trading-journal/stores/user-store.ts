/**
 * User Store - Zustand state management for user authentication and preferences
 * Manages user state, session data, and preferences with Supabase persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserPreferences, AuthSession } from '@/types/user';
import { supabase } from '@/lib/supabase';

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
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            // PGRST116 is "not found" - ignore it for new users
            throw error;
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
            },
          };

          set({ user, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Error fetching user:', error);
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

          // Update in Supabase
          const { error } = await supabase
            .from('user_profiles')
            .update({
              theme: preferences.theme,
              currency: preferences.currency,
              timezone: preferences.timezone,
              confluences: preferences.confluences,
            })
            .eq('user_id', state.user.id);

          if (error) throw error;

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
          console.error('Error updating preferences:', error);
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
          const { error } = await supabase
            .from('user_profiles')
            .update({
              full_name: profile.profile?.full_name,
              bio: profile.profile?.bio,
              phone: profile.profile?.phone,
              country: profile.profile?.country,
              experience_level: profile.profile?.experience_level,
              years_of_experience: profile.profile?.years_of_experience,
              trading_style: profile.profile?.trading_style,
              twitter_handle: profile.profile?.twitter_handle,
              linkedin_url: profile.profile?.linkedin_url,
            })
            .eq('user_id', state.user.id);

          if (error) throw error;

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
          console.error('Error updating profile:', error);
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
