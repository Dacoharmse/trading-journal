'use client'

import React from 'react'
import { Search, Plus, Edit3, Download, Columns3, X } from 'lucide-react'
import { useDashboardFilters, type DateRangePreset, type SessionFilter, type BaseCurrency } from '@/stores/dashboard-filters'
import { useTradesFilters, type DirectionFilter, type ResultFilter } from '@/stores/trades-filters'
import type { Account } from '@/types/supabase'

interface TradesToolbarProps {
  accounts: Account[]
  availableSymbols: string[]
  availableStrategies: string[]
  selectedCount: number
  onOpenTradeForm: () => void
  onBulkEdit: () => void
  onExport: () => void
  onColumnPicker: () => void
}

export function TradesToolbar({
  accounts,
  availableSymbols,
  availableStrategies,
  selectedCount,
  onOpenTradeForm,
  onBulkEdit,
  onExport,
  onColumnPicker,
}: TradesToolbarProps) {
  const dashboardFilters = useDashboardFilters((state) => state.filters)
  const tradesFilters = useTradesFilters((state) => state.filters)

  const {
    setDateRange,
    setAccountId,
    setSymbols,
    setStrategies,
    setSession,
    setUnits,
    setBaseCurrency,
    toggleExcludeOutliers,
  } = useDashboardFilters()

  const { setSearchQuery, setDirection, setResult, clearSelection } = useTradesFilters()

  const selectedAccount = accounts.find((a) => a.id === dashboardFilters.accountId)
  const isMultiAccount = dashboardFilters.accountId === 'all'

  const [searchInput, setSearchInput] = React.useState(tradesFilters.searchQuery)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, setSearchQuery])

  return (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="px-4 py-3 space-y-3">
        {/* Row 1: Search + Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search symbol, notes, strategy, tags..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={onOpenTradeForm}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-700 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trade
          </button>

          <button
            onClick={onBulkEdit}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="w-4 h-4" />
            Bulk Edit {selectedCount > 0 && `(${selectedCount})`}
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={onColumnPicker}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <Columns3 className="w-4 h-4" />
            Columns
          </button>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range */}
          <select
            value={dashboardFilters.dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="ytd">YTD</option>
            <option value="all">All Time</option>
          </select>

          {/* Account */}
          <select
            value={dashboardFilters.accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>

          {/* Currency Badge or Base Currency Selector */}
          {selectedAccount && dashboardFilters.units === 'currency' && (
            <span className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md">
              {selectedAccount.currency}
            </span>
          )}

          {isMultiAccount && dashboardFilters.units === 'currency' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Display in:</span>
              <select
                value={dashboardFilters.baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as BaseCurrency)}
                className="px-2 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
              >
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          )}

          {/* Symbols Multi-Select */}
          <select
            multiple
            value={dashboardFilters.symbols}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value)
              setSymbols(selected)
            }}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 max-h-32 overflow-auto"
            size={1}
          >
            <option value="">All Symbols</option>
            {availableSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>

          {/* Strategies Multi-Select */}
          <select
            multiple
            value={dashboardFilters.strategies}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value)
              setStrategies(selected)
            }}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500 max-h-32 overflow-auto"
            size={1}
          >
            <option value="">All Strategies</option>
            {availableStrategies.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy}
              </option>
            ))}
          </select>

          {/* Session */}
          <select
            value={dashboardFilters.session}
            onChange={(e) => setSession(e.target.value as SessionFilter)}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            <option value="all">All Sessions</option>
            <option value="asia">Asia</option>
            <option value="london">London</option>
            <option value="ny">New York</option>
          </select>

          {/* Direction */}
          <select
            value={tradesFilters.direction}
            onChange={(e) => setDirection(e.target.value as DirectionFilter)}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            <option value="all">All Directions</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>

          {/* Result */}
          <select
            value={tradesFilters.result}
            onChange={(e) => setResult(e.target.value as ResultFilter)}
            className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            <option value="all">All Results</option>
            <option value="winner">Winners</option>
            <option value="loser">Losers</option>
            <option value="breakeven">Break Even</option>
          </select>

          {/* Units Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <button
              onClick={() => setUnits('currency')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                dashboardFilters.units === 'currency'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Currency
            </button>
            <button
              onClick={() => setUnits('r')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                dashboardFilters.units === 'r'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              R
            </button>
          </div>

          {/* Exclude Outliers */}
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={dashboardFilters.excludeOutliers}
              onChange={toggleExcludeOutliers}
              className="w-4 h-4 rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300">Exclude outliers</span>
          </label>
        </div>

        {/* Active Filters Summary */}
        {(selectedCount > 0 || tradesFilters.searchQuery || dashboardFilters.symbols.length > 0 || dashboardFilters.strategies.length > 0) && (
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            {selectedCount > 0 && (
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md">
                {selectedCount} selected
                <button onClick={clearSelection} className="ml-1 hover:text-neutral-900">
                  <X className="w-3 h-3 inline" />
                </button>
              </span>
            )}
            {tradesFilters.searchQuery && (
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                Search: {tradesFilters.searchQuery}
              </span>
            )}
            {dashboardFilters.symbols.length > 0 && (
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                Symbols: {dashboardFilters.symbols.join(', ')}
              </span>
            )}
            {dashboardFilters.strategies.length > 0 && (
              <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                Strategies: {dashboardFilters.strategies.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
