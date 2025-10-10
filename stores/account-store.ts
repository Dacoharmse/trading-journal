import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  TradingAccount,
  AccountInput,
  AccountUpdate,
  calculateAccountMetrics,
} from '@/types/account';
import { Trade } from '@/types/trade';

interface AccountState {
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  addAccount: (input: AccountInput) => TradingAccount;
  updateAccount: (id: string, updates: AccountUpdate) => void;
  deleteAccount: (id: string) => void;
  setAccounts: (accounts: TradingAccount[]) => void;
  selectAccount: (id: string | null) => void;
  recalculateMetrics: (trades: Trade[]) => void;
}

const createAccount = (input: AccountInput): TradingAccount => {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    ...input,
    id,
    metrics: calculateAccountMetrics(
      {
        ...input,
        id,
      },
      [],
    ),
  };
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      selectedAccountId: null,

      addAccount: (input) => {
        const account = createAccount(input);
        set((state) => ({
          accounts: [account, ...state.accounts],
          selectedAccountId: account.id,
        }));
        return account;
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map((account) => {
            if (account.id !== id) return account;

            const updated: TradingAccount = {
              ...account,
              ...updates,
              propFirmSettings: {
                ...account.propFirmSettings,
                ...(updates.propFirmSettings ?? {}),
              },
            };

            return {
              ...updated,
              metrics: account.metrics,
            };
          }),
        }));
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((account) => account.id !== id),
          selectedAccountId:
            state.selectedAccountId === id ? null : state.selectedAccountId,
        }));
      },

      setAccounts: (accounts) => {
        set({ accounts });
      },

      selectAccount: (id) => {
        set({ selectedAccountId: id });
      },

      recalculateMetrics: (trades) => {
        set((state) => ({
          accounts: state.accounts.map((account) => {
            const accountTrades = trades.filter(
              (trade) => trade.account_id === account.id,
            );
            return {
              ...account,
              metrics: calculateAccountMetrics(account, accountTrades),
            };
          }),
        }));
      },
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
