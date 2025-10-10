import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TradingAccount,
  AccountInput,
  AccountUpdate,
  calculateAccountMetrics,
} from '@/types/account';
import { Trade } from '@/types/trade';
import { supabase } from '@/lib/supabase';

interface AccountState {
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAccounts: () => Promise<void>;
  addAccount: (input: AccountInput) => Promise<TradingAccount | null>;
  updateAccount: (id: string, update: AccountUpdate) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (id: string | null) => void;
  recalculateMetrics: (trades: Trade[]) => void;
  getSelectedAccount: () => TradingAccount | null;
}

const createDefaultMetrics = () => ({
  netProfit: 0,
  totalFees: 0,
  currentBalance: 0,
  bestDay: 0,
  worstDay: 0,
  maxDrawdown: 0,
  dailyDrawdown: 0,
});

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,
      isLoading: false,
      error: null,

      fetchAccounts: async () => {
        set({ isLoading: true, error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            set({ accounts: [], isLoading: false });
            return;
          }

          const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform database rows to TradingAccount format
          const accounts: TradingAccount[] = (data || []).map((row) => ({
            id: row.id,
            name: row.name,
            broker: row.broker,
            accountType: row.account_type as any,
            currency: row.currency,
            startingBalance: Number(row.starting_balance),
            tradingPairs: row.trading_pairs || [],
            isActive: row.is_active,
            propFirmSettings: row.account_type === 'prop-firm' ? {
              phase: row.phase as any,
              profitTarget: row.profit_target ? Number(row.profit_target) : undefined,
              maxDrawdown: row.max_drawdown ? Number(row.max_drawdown) : undefined,
              dailyDrawdown: row.daily_drawdown ? Number(row.daily_drawdown) : undefined,
              status: row.account_status as any,
              currentProfits: row.current_profits ? Number(row.current_profits) : undefined,
              currentDrawdown: row.current_drawdown ? Number(row.current_drawdown) : undefined,
            } : undefined,
            metrics: createDefaultMetrics(),
          }));

          set({ accounts, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Error fetching accounts:', error);
        }
      },

      addAccount: async (input: AccountInput) => {
        set({ isLoading: true, error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (!user) {
            set({ error: 'User not authenticated', isLoading: false });
            return null;
          }

          const { data, error } = await supabase
            .from('accounts')
            .insert({
              user_id: user.id,
              name: input.name,
              broker: input.broker,
              account_type: input.accountType,
              currency: input.currency,
              starting_balance: input.startingBalance,
              current_balance: input.startingBalance,
              trading_pairs: input.tradingPairs || [],
              is_active: input.isActive ?? true,
              phase: input.propFirmSettings?.phase,
              profit_target: input.propFirmSettings?.profitTarget,
              max_drawdown: input.propFirmSettings?.maxDrawdown,
              daily_drawdown: input.propFirmSettings?.dailyDrawdown,
              account_status: input.propFirmSettings?.status || 'new',
              current_profits: input.propFirmSettings?.currentProfits,
              current_drawdown: input.propFirmSettings?.currentDrawdown,
            })
            .select()
            .single();

          if (error) throw error;

          // Transform to TradingAccount format
          const newAccount: TradingAccount = {
            id: data.id,
            name: data.name,
            broker: data.broker,
            accountType: data.account_type as any,
            currency: data.currency,
            startingBalance: Number(data.starting_balance),
            tradingPairs: data.trading_pairs || [],
            isActive: data.is_active,
            propFirmSettings: data.account_type === 'prop-firm' ? {
              phase: data.phase as any,
              profitTarget: data.profit_target ? Number(data.profit_target) : undefined,
              maxDrawdown: data.max_drawdown ? Number(data.max_drawdown) : undefined,
              dailyDrawdown: data.daily_drawdown ? Number(data.daily_drawdown) : undefined,
              status: data.account_status as any,
              currentProfits: data.current_profits ? Number(data.current_profits) : undefined,
              currentDrawdown: data.current_drawdown ? Number(data.current_drawdown) : undefined,
            } : undefined,
            metrics: createDefaultMetrics(),
          };

          set((state) => ({
            accounts: [newAccount, ...state.accounts],
            isLoading: false,
          }));

          return newAccount;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Error adding account:', error);
          return null;
        }
      },

      updateAccount: async (id: string, update: AccountUpdate) => {
        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase
            .from('accounts')
            .update({
              name: update.name,
              broker: update.broker,
              account_type: update.accountType,
              currency: update.currency,
              starting_balance: update.startingBalance,
              trading_pairs: update.tradingPairs,
              is_active: update.isActive,
              phase: update.propFirmSettings?.phase,
              profit_target: update.propFirmSettings?.profitTarget,
              max_drawdown: update.propFirmSettings?.maxDrawdown,
              daily_drawdown: update.propFirmSettings?.dailyDrawdown,
              account_status: update.propFirmSettings?.status,
              current_profits: update.propFirmSettings?.currentProfits,
              current_drawdown: update.propFirmSettings?.currentDrawdown,
            })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            accounts: state.accounts.map((account) =>
              account.id === id
                ? {
                    ...account,
                    ...update,
                  }
                : account
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Error updating account:', error);
        }
      },

      deleteAccount: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            accounts: state.accounts.filter((account) => account.id !== id),
            selectedAccountId:
              state.selectedAccountId === id ? null : state.selectedAccountId,
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Error deleting account:', error);
        }
      },

      selectAccount: (id: string | null) => {
        set({ selectedAccountId: id });
      },

      recalculateMetrics: (trades: Trade[]) => {
        set((state) => ({
          accounts: state.accounts.map((account) => ({
            ...account,
            metrics: calculateAccountMetrics(account, trades),
          })),
        }));
      },

      getSelectedAccount: () => {
        const state = get();
        if (!state.selectedAccountId) return null;
        return (
          state.accounts.find((acc) => acc.id === state.selectedAccountId) || null
        );
      },
    }),
    {
      name: 'account-storage',
      // Only persist selectedAccountId, fetch accounts from Supabase on load
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId
      }),
    }
  )
);
