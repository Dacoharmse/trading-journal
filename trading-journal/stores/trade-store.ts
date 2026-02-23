/**
 * Trade Store - Zustand state management for trades
 * Manages trades, filters, and selected trade state with localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trade, TradeFilter } from '@/types/trade';
import { useAccountStore } from './account-store';
import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Notification trigger helper ──────────────────────────────────────────────
// Runs server-side checks after a trade is added or closed.
// Sends winning streak, personal best, and milestone emails when relevant.
async function checkNotificationsAfterTrade(
  supabase: SupabaseClient,
  userId: string,
  trades: Trade[],
  event: 'add' | 'close',
) {
  try {
    const session = (await supabase.auth.getSession()).data.session
    if (!session?.access_token) return

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }

    const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl != null)
    const totalTrades = closedTrades.length

    // ── Milestone check (on add) ──────────────────────────────────────────────
    if (event === 'add') {
      const milestones = [10, 25, 50, 100, 250, 500, 1000]
      if (milestones.includes(totalTrades)) {
        const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
        const netPnL = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
        void fetch('/api/notifications/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'milestone',
            milestone: totalTrades,
            totalTrades,
            winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
            netPnL,
            currency: '$',
          }),
        })
      }
      return
    }

    // ── Winning streak check (on close) ──────────────────────────────────────
    // Group by date and find consecutive profitable days
    const byDate = new Map<string, number>()
    for (const t of closedTrades) {
      const key = (t.entry_date ?? '').slice(0, 10)
      byDate.set(key, (byDate.get(key) ?? 0) + (t.pnl ?? 0))
    }
    const sortedDays = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
    let streak = 0
    let streakPnL = 0
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (sortedDays[i][1] > 0) {
        streak++
        streakPnL += sortedDays[i][1]
      } else break
    }
    if (streak > 0 && streak % 3 === 0) {
      // Notify at 3, 6, 9 … day streaks
      void fetch('/api/notifications/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'winning_streak',
          streakDays: streak,
          totalPnL: streakPnL,
          currency: '$',
        }),
      })
    }

    // ── Personal best check (on close) ───────────────────────────────────────
    if (sortedDays.length >= 2) {
      const today = sortedDays[sortedDays.length - 1]
      const todayPnL = today[1]
      const previousBest = Math.max(...sortedDays.slice(0, -1).map(([, v]) => v))
      if (todayPnL > 0 && todayPnL > previousBest) {
        const d = new Date(today[0] + 'T00:00')
        const dateLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        void fetch('/api/notifications/send', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'personal_best',
            date: dateLabel,
            newBest: todayPnL,
            previousBest,
            currency: '$',
            totalTrades: closedTrades.filter(t => (t.entry_date ?? '').startsWith(today[0])).length,
          }),
        })
      }
    }
  } catch {
    // Notification failures must never break trade operations
  }
}

interface TradeState {
  // State
  trades: Trade[];
  selectedTrade: Trade | null;
  filters: TradeFilter;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;

  // Actions
  addTrade: (trade: Trade) => Promise<void>;
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  setSelectedTrade: (trade: Trade | null) => void;
  setFilter: (filter: Partial<TradeFilter>) => void;
  clearFilters: () => void;
  setTrades: (trades: Trade[]) => void;
  fetchTrades: () => Promise<void>;
}

const initialFilters: TradeFilter = {
  sort_by: 'entry_date',
  sort_order: 'desc',
  page: 1,
  limit: 50,
};

export const useTradeStore = create<TradeState>()(
  persist(
    (set) => ({
      // Initial state
      trades: [],
      selectedTrade: null,
      filters: initialFilters,
      isLoading: false,
      error: null,
      hasFetched: false,

      // Add a new trade
      addTrade: async (trade) => {
        set({ isLoading: true, error: null });

        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;

          if (!user) {
            // Local development mode - add without Supabase
            let updatedTrades: Trade[] = [];
            set((state) => {
              updatedTrades = [trade, ...state.trades];
              return { trades: updatedTrades, isLoading: false };
            });
            useAccountStore.getState().recalculateMetrics(updatedTrades);
            return;
          }

          const { error } = await supabase.from('trades').insert(trade);

          if (error) {
            const errorMsg = `Database error: ${error.message} (Code: ${error.code})`;
            set({ error: errorMsg, isLoading: false });
                        throw new Error(errorMsg);
          }

          let updatedTrades: Trade[] = [];
          set((state) => {
            updatedTrades = [trade, ...state.trades];
            return { trades: updatedTrades, isLoading: false };
          });
          useAccountStore.getState().recalculateMetrics(updatedTrades);

          // Fire notification checks (fire-and-forget)
          void checkNotificationsAfterTrade(supabase, user.id, updatedTrades, 'add')
        } catch (error: any) {
          const errorMsg = error.message || 'Unknown error adding trade';
          set({ error: errorMsg, isLoading: false });
                    throw error; // Re-throw so caller can handle it
        }
      },

      // Update an existing trade
      updateTrade: async (id, updates) => {
        set({ isLoading: true, error: null });

        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;

          if (!user) {
            // Local development mode - update without Supabase
            let updatedTrades: Trade[] = [];
            set((state) => {
              updatedTrades = state.trades.map((trade) =>
                trade.id === id ? { ...trade, ...updates } : trade
              );
              return {
                trades: updatedTrades,
                selectedTrade:
                  state.selectedTrade?.id === id
                    ? { ...state.selectedTrade, ...updates }
                    : state.selectedTrade,
                isLoading: false,
              };
            });
            useAccountStore.getState().recalculateMetrics(updatedTrades);
            return;
          }

          const { error } = await supabase
            .from('trades')
            .update(updates)
            .eq('id', id);

          if (error) throw error;

          let updatedTrades: Trade[] = [];
          set((state) => {
            updatedTrades = state.trades.map((trade) =>
              trade.id === id ? { ...trade, ...updates } : trade
            );
            return {
              trades: updatedTrades,
              selectedTrade:
                state.selectedTrade?.id === id
                  ? { ...state.selectedTrade, ...updates }
                  : state.selectedTrade,
              isLoading: false,
            };
          });
          useAccountStore.getState().recalculateMetrics(updatedTrades);

          // Fire notification checks when a trade is closed (fire-and-forget)
          if (updates.status === 'closed' || updates.pnl !== undefined) {
            void checkNotificationsAfterTrade(supabase, user.id, updatedTrades, 'close')
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
                  }
      },

      // Delete a trade
      deleteTrade: async (id) => {
        set({ isLoading: true, error: null });

        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;

          if (!user) {
            // Local development mode - delete without Supabase
            let updatedTrades: Trade[] = [];
            set((state) => {
              updatedTrades = state.trades.filter((trade) => trade.id !== id);
              return {
                trades: updatedTrades,
                selectedTrade:
                  state.selectedTrade?.id === id ? null : state.selectedTrade,
                isLoading: false,
              };
            });
            useAccountStore.getState().recalculateMetrics(updatedTrades);
            return;
          }

          const { error } = await supabase.from('trades').delete().eq('id', id);

          if (error) throw error;

          let updatedTrades: Trade[] = [];
          set((state) => {
            updatedTrades = state.trades.filter((trade) => trade.id !== id);
            return {
              trades: updatedTrades,
              selectedTrade:
                state.selectedTrade?.id === id ? null : state.selectedTrade,
              isLoading: false,
            };
          });
          useAccountStore.getState().recalculateMetrics(updatedTrades);
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
                  }
      },

      // Set selected trade
      setSelectedTrade: (trade) => {
        set({ selectedTrade: trade });
      },

      // Update filters (merge with existing)
      setFilter: (filter) => {
        set((state) => ({
          filters: { ...state.filters, ...filter },
        }));
      },

      // Clear all filters
      clearFilters: () => {
        set({ filters: initialFilters });
      },

      // Set all trades (useful for initial load or bulk updates)
      setTrades: (trades) => {
        set({ trades });
        useAccountStore.getState().recalculateMetrics(trades);
      },

      // Fetch trades from API route (bypasses RLS which hangs on browser client)
      fetchTrades: async () => {
        set({ isLoading: true, error: null });

        try {
          // Fetch all trades via server API — large limit to get everything in one shot
          const res = await fetch('/api/trades?limit=10000&offset=0');

          if (res.status === 401) {
            // Not authenticated
            set({ isLoading: false, hasFetched: true });
            return;
          }

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const message = body.error || `Failed to fetch trades (${res.status})`;
            set({ error: message, isLoading: false, hasFetched: true });
            return;
          }

          const { trades: data } = await res.json();
          const trades = (data ?? []) as Trade[];

          set({ trades, isLoading: false, hasFetched: true });
          useAccountStore.getState().recalculateMetrics(trades);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error fetching trades';
          set({ error: message, isLoading: false, hasFetched: true });
        }
      },
    }),
    {
      name: 'trade-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trades: state.trades,
        filters: state.filters,
        // Don't persist transient UI state or selected trade
      }),
    }
  )
);
