/**
 * Trade Store - Zustand state management for trades
 * Manages trades, filters, and selected trade state with localStorage persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trade, TradeFilter } from '@/types/trade';
import { useAccountStore } from './account-store';

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

      // Fetch trades from Supabase
      fetchTrades: async () => {
        set({ isLoading: true, error: null });

        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();

          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;

          if (!user) {
            set({ trades: [], isLoading: false, hasFetched: true });
            return;
          }

          const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id)
            .order('entry_date', { ascending: false });

          if (error) {
            set({ error: error.message, isLoading: false, hasFetched: true });
            return;
          }

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
