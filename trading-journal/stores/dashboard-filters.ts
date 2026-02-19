/**
 * Dashboard Filters Store - Zustand state management for dashboard filters
 * Manages date range, account, symbol, strategy, and session filters with URL sync
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type DateRangePreset = 'week' | 'month' | '3m' | 'ytd' | 'all' | 'custom'
export type SessionFilter = 'all' | 'asia' | 'london' | 'ny'
export type UnitToggle = 'currency' | 'r'
export type BaseCurrency = 'ZAR' | 'USD' | 'EUR' | 'GBP'

export interface DashboardFilters {
  // Date range
  dateRange: DateRangePreset
  customStartDate: string | null
  customEndDate: string | null

  // Account
  accountId: string // 'all' or specific account ID

  // Multi-select filters
  symbols: string[] // empty = all
  strategies: string[] // empty = all

  // Session
  session: SessionFilter

  // Toggles
  excludeOutliers: boolean
  units: UnitToggle

  // Base currency for multi-account view (only used when accountId === 'all' && units === 'currency')
  baseCurrency: BaseCurrency
}

interface DashboardFiltersState {
  filters: DashboardFilters

  // Actions
  setDateRange: (preset: DateRangePreset) => void
  setCustomDateRange: (start: string, end: string) => void
  setAccountId: (accountId: string) => void
  setSymbols: (symbols: string[]) => void
  setStrategies: (strategies: string[]) => void
  setSession: (session: SessionFilter) => void
  toggleExcludeOutliers: () => void
  setUnits: (units: UnitToggle) => void
  setBaseCurrency: (currency: BaseCurrency) => void
  resetFilters: () => void

  // Computed helpers
  getDateRangeDates: () => { start: Date; end: Date }
}

const defaultFilters: DashboardFilters = {
  dateRange: 'month',
  customStartDate: null,
  customEndDate: null,
  accountId: 'all',
  symbols: [],
  strategies: [],
  session: 'all',
  excludeOutliers: false,
  units: 'r', // Default to R for multi-account view
  baseCurrency: 'USD',
}

export const useDashboardFilters = create<DashboardFiltersState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,

      setDateRange: (preset) => {
        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: preset,
            customStartDate: null,
            customEndDate: null,
          },
        }))
      },

      setCustomDateRange: (start, end) => {
        set((state) => ({
          filters: {
            ...state.filters,
            dateRange: 'custom',
            customStartDate: start,
            customEndDate: end,
          },
        }))
      },

      setAccountId: (accountId) => {
        set((state) => ({
          filters: { ...state.filters, accountId },
        }))
      },

      setSymbols: (symbols) => {
        set((state) => ({
          filters: { ...state.filters, symbols },
        }))
      },

      setStrategies: (strategies) => {
        set((state) => ({
          filters: { ...state.filters, strategies },
        }))
      },

      setSession: (session) => {
        set((state) => ({
          filters: { ...state.filters, session },
        }))
      },

      toggleExcludeOutliers: () => {
        set((state) => ({
          filters: {
            ...state.filters,
            excludeOutliers: !state.filters.excludeOutliers,
          },
        }))
      },

      setUnits: (units) => {
        set((state) => ({
          filters: { ...state.filters, units },
        }))
      },

      setBaseCurrency: (currency) => {
        set((state) => ({
          filters: { ...state.filters, baseCurrency: currency },
        }))
      },

      resetFilters: () => {
        set({ filters: defaultFilters })
      },

      getDateRangeDates: () => {
        const { filters } = get()
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        let start: Date
        let end: Date = today

        switch (filters.dateRange) {
          case 'week':
            start = new Date(today)
            start.setDate(today.getDate() - 7)
            break
          case 'month':
            start = new Date(today)
            start.setDate(today.getDate() - 30)
            break
          case '3m':
            start = new Date(today)
            start.setDate(today.getDate() - 90)
            break
          case 'ytd':
            start = new Date(today.getFullYear(), 0, 1)
            break
          case 'custom':
            start = filters.customStartDate
              ? new Date(filters.customStartDate)
              : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            end = filters.customEndDate ? new Date(filters.customEndDate) : today
            break
          case 'all':
          default:
            start = new Date(2000, 0, 1) // Far past date
            break
        }

        return { start, end }
      },
    }),
    {
      name: 'dashboard-filters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
)

/**
 * Hook to get date range filter values (stable selector)
 * Use React.useMemo in components to compute actual dates
 */
export function useDateRangeFilter() {
  return useDashboardFilters((state) => ({
    dateRange: state.filters.dateRange,
    customStartDate: state.filters.customStartDate,
    customEndDate: state.filters.customEndDate,
  }))
}

/**
 * Helper to compute date range from filter values
 * Use this in a React.useMemo hook in your component
 */
export function computeDateRange(
  dateRange: DateRangePreset,
  customStartDate: string | null,
  customEndDate: string | null
): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // End of today (23:59:59.999) so trades entered today are not filtered out
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  let start: Date
  let end: Date = endOfToday

  switch (dateRange) {
    case 'week':
      start = new Date(today)
      start.setDate(today.getDate() - 7)
      break
    case 'month':
      start = new Date(today)
      start.setDate(today.getDate() - 30)
      break
    case '3m':
      start = new Date(today)
      start.setDate(today.getDate() - 90)
      break
    case 'ytd':
      start = new Date(today.getFullYear(), 0, 1)
      break
    case 'custom':
      start = customStartDate
        ? new Date(customStartDate)
        : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = customEndDate ? new Date(new Date(customEndDate).setHours(23, 59, 59, 999)) : endOfToday
      break
    case 'all':
    default:
      start = new Date(2000, 0, 1) // Far past date
      break
  }

  return { start, end }
}
