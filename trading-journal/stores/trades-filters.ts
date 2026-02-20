/**
 * Trades Page Filters Store - Extends dashboard filters with trades-specific options
 * Manages search, direction, result, column visibility, and selection state
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type DirectionFilter = 'all' | 'long' | 'short'
export type ResultFilter = 'all' | 'winner' | 'loser' | 'breakeven'

export interface TradesFilters {
  // Search
  searchQuery: string

  // Additional filters beyond dashboard
  direction: DirectionFilter
  result: ResultFilter

  // Column visibility (stored as array internally, exposed as Set via selectors)
  visibleColumns: string[]

  // Selection (stored as array internally, exposed as Set via selectors)
  selectedTradeIds: string[]

  // Table state
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  pageSize: number
  currentPage: number
}

interface TradesFiltersState {
  filters: TradesFilters

  // Actions
  setSearchQuery: (query: string) => void
  setDirection: (direction: DirectionFilter) => void
  setResult: (result: ResultFilter) => void
  toggleColumn: (column: string) => void
  setVisibleColumns: (columns: string[]) => void
  toggleTradeSelection: (tradeId: string) => void
  selectAllTrades: (tradeIds: string[]) => void
  clearSelection: () => void
  setSortColumn: (column: string) => void
  setPageSize: (size: number) => void
  setCurrentPage: (page: number) => void
  resetFilters: () => void
}

const defaultColumns = [
  'date',
  'account',
  'symbol',
  'direction',
  'entry_time',
  'size',
  'stop_pips',
  'target_pips',
  'exit_time',
  'pnl_currency',
  'r_multiple',
  'playbook',
  'setup_grade',
  'setup_score',
  'session',
  'session_hour',
  'hold_time',
  'outcome',
]

const defaultFilters: TradesFilters = {
  searchQuery: '',
  direction: 'all',
  result: 'all',
  visibleColumns: [...defaultColumns],
  selectedTradeIds: [],
  sortColumn: 'closed_at',
  sortDirection: 'desc',
  pageSize: 50,
  currentPage: 0,
}

export const useTradesFilters = create<TradesFiltersState>()(
  persist(
    (set) => ({
      filters: defaultFilters,

      setSearchQuery: (query) => {
        set((state) => ({
          filters: { ...state.filters, searchQuery: query, currentPage: 0 },
        }))
      },

      setDirection: (direction) => {
        set((state) => ({
          filters: { ...state.filters, direction, currentPage: 0 },
        }))
      },

      setResult: (result) => {
        set((state) => ({
          filters: { ...state.filters, result, currentPage: 0 },
        }))
      },

      toggleColumn: (column) => {
        set((state) => {
          const currentColumns = state.filters.visibleColumns
          const hasColumn = currentColumns.includes(column)
          const newColumns = hasColumn
            ? currentColumns.filter(c => c !== column)
            : [...currentColumns, column]
          return {
            filters: { ...state.filters, visibleColumns: newColumns },
          }
        })
      },

      setVisibleColumns: (columns) => {
        set((state) => ({
          filters: { ...state.filters, visibleColumns: [...columns] },
        }))
      },

      toggleTradeSelection: (tradeId) => {
        set((state) => {
          const currentSelection = state.filters.selectedTradeIds
          const hasTradeId = currentSelection.includes(tradeId)
          const newSelection = hasTradeId
            ? currentSelection.filter(id => id !== tradeId)
            : [...currentSelection, tradeId]
          return {
            filters: { ...state.filters, selectedTradeIds: newSelection },
          }
        })
      },

      selectAllTrades: (tradeIds) => {
        set((state) => ({
          filters: { ...state.filters, selectedTradeIds: [...tradeIds] },
        }))
      },

      clearSelection: () => {
        set((state) => ({
          filters: { ...state.filters, selectedTradeIds: [] },
        }))
      },

      setSortColumn: (column) => {
        set((state) => {
          const isSameColumn = state.filters.sortColumn === column
          return {
            filters: {
              ...state.filters,
              sortColumn: column,
              sortDirection:
                isSameColumn && state.filters.sortDirection === 'asc'
                  ? 'desc'
                  : 'asc',
            },
          }
        })
      },

      setPageSize: (size) => {
        set((state) => ({
          filters: { ...state.filters, pageSize: size, currentPage: 0 },
        }))
      },

      setCurrentPage: (page) => {
        set((state) => ({
          filters: { ...state.filters, currentPage: page },
        }))
      },

      resetFilters: () => {
        set({
          filters: {
            ...defaultFilters,
            visibleColumns: [...defaultColumns],
            selectedTradeIds: [],
          },
        })
      },
    }),
    {
      name: 'trades-filters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: {
          ...state.filters,
          // Don't persist selection or search
          selectedTradeIds: [],
          searchQuery: '',
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Always reset selection and search
          state.filters.selectedTradeIds = []
          state.filters.searchQuery = ''

          // Migrate stale columns: if any old removed column IDs are present, reset to defaults
          const removedColumns = ['entry_price', 'stop_price', 'exit_price', 'strategy', 'confluences', 'mae_r', 'mfe_r']
          const hasStaleColumns = state.filters.visibleColumns.some(c => removedColumns.includes(c))
          if (hasStaleColumns) {
            state.filters.visibleColumns = [...defaultColumns]
          }
        }
      },
    }
  )
)
