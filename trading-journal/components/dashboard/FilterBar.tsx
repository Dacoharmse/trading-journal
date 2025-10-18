"use client"

import * as React from "react"
import { useDashboardFilters, DateRangePreset, SessionFilter, BaseCurrency } from "@/stores/dashboard-filters"
import { useAccountStore, useTradeStore } from "@/stores"
import { X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

export function FilterBar() {
  const filters = useDashboardFilters((state) => state.filters)
  const setDateRange = useDashboardFilters((state) => state.setDateRange)
  const setAccountId = useDashboardFilters((state) => state.setAccountId)
  const setSymbols = useDashboardFilters((state) => state.setSymbols)
  const setStrategies = useDashboardFilters((state) => state.setStrategies)
  const setSession = useDashboardFilters((state) => state.setSession)
  const toggleExcludeOutliers = useDashboardFilters((state) => state.toggleExcludeOutliers)
  const setUnits = useDashboardFilters((state) => state.setUnits)
  const setBaseCurrency = useDashboardFilters((state) => state.setBaseCurrency)
  const resetFilters = useDashboardFilters((state) => state.resetFilters)

  const accounts = useAccountStore((state) => state.accounts)
  const trades = useTradeStore((state) => state.trades)

  // Get selected account
  const selectedAccount = React.useMemo(() => {
    if (filters.accountId === 'all') return null
    return accounts.find(a => a.id === filters.accountId)
  }, [filters.accountId, accounts])

  // Get unique symbols and strategies from trades
  const uniqueSymbols = React.useMemo(() => {
    const symbols = new Set(trades.map(t => t.symbol).filter(Boolean))
    return Array.from(symbols).sort()
  }, [trades])

  const uniqueStrategies = React.useMemo(() => {
    const strategies = new Set(trades.map(t => t.strategy).filter(Boolean))
    return Array.from(strategies).sort()
  }, [trades])

  const hasActiveFilters = filters.accountId !== 'all' ||
    filters.symbols.length > 0 ||
    filters.strategies.length > 0 ||
    filters.session !== 'all' ||
    filters.excludeOutliers ||
    filters.dateRange !== 'month'

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-50/95 to-gray-100/95 dark:from-neutral-950/95 dark:to-neutral-900/95 backdrop-blur-md border-b border-border/50 shadow-sm">
      <div className="px-8 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Period:</span>
            <div className="flex gap-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg p-1 shadow-sm">
              {(['week', 'month', '3m', 'ytd', 'all'] as DateRangePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDateRange(preset)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.dateRange === preset
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {preset === 'week' ? 'Week' :
                   preset === 'month' ? 'Month' :
                   preset === '3m' ? '3M' :
                   preset === 'ytd' ? 'YTD' :
                   'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Account Filter */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Account:</span>
              <select
                value={filters.accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white/60 dark:bg-neutral-800/60 border border-border/50 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                <option value="all">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Symbols Multi-Select */}
          {uniqueSymbols.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Symbols:</span>
              <select
                multiple
                value={filters.symbols}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setSymbols(selected)
                }}
                className="px-3 py-1.5 text-xs font-medium bg-white/60 dark:bg-neutral-800/60 border border-border/50 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-w-[120px]"
                size={1}
              >
                <option value="" disabled>Select symbols...</option>
                {uniqueSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol} {filters.symbols.includes(symbol) ? '✓' : ''}
                  </option>
                ))}
              </select>
              {filters.symbols.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  {filters.symbols.length}
                </span>
              )}
            </div>
          )}

          {/* Strategies Multi-Select */}
          {uniqueStrategies.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Strategies:</span>
              <select
                multiple
                value={filters.strategies}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  setStrategies(selected)
                }}
                className="px-3 py-1.5 text-xs font-medium bg-white/60 dark:bg-neutral-800/60 border border-border/50 rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm min-w-[120px]"
                size={1}
              >
                <option value="" disabled>Select strategies...</option>
                {uniqueStrategies.map(strategy => (
                  <option key={strategy} value={strategy}>
                    {strategy} {filters.strategies.includes(strategy) ? '✓' : ''}
                  </option>
                ))}
              </select>
              {filters.strategies.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  {filters.strategies.length}
                </span>
              )}
            </div>
          )}

          {/* Session Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Session:</span>
            <div className="flex gap-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg p-1 shadow-sm">
              {(['all', 'asia', 'london', 'ny'] as SessionFilter[]).map((session) => (
                <button
                  key={session}
                  onClick={() => setSession(session)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.session === session
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {session === 'all' ? 'All' :
                   session === 'asia' ? 'Asia' :
                   session === 'london' ? 'London' :
                   'NY'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Exclude Outliers */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeOutliers}
                onChange={toggleExcludeOutliers}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-xs font-medium text-muted-foreground">Exclude Outliers</span>
            </label>

            {/* Units Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Units:</span>
              <div className="flex gap-1 bg-white/60 dark:bg-neutral-800/60 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setUnits('currency')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.units === 'currency'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Currency
                </button>
                <button
                  onClick={() => setUnits('r')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filters.units === 'r'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  R
                </button>
              </div>

              {/* Currency Badge for Single Account */}
              {selectedAccount && filters.units === 'currency' && (
                <span className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800/30 text-neutral-700 dark:text-neutral-400 rounded-md">
                  {selectedAccount.currency}
                </span>
              )}

              {/* Base Currency Selector for All Accounts */}
              {filters.accountId === 'all' && filters.units === 'currency' && (
                <TooltipProvider>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Display in:</span>
                    <select
                      value={filters.baseCurrency}
                      onChange={(e) => setBaseCurrency(e.target.value as BaseCurrency)}
                      className="px-2 py-1 text-xs font-medium bg-white/60 dark:bg-neutral-800/60 border border-border/50 rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="ZAR">ZAR</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          When viewing All Accounts in Currency mode, trade P&L is converted to the selected base currency using stored FX rates.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )}
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-white/60 dark:bg-neutral-800/60 border border-border/50 rounded-lg hover:bg-muted transition-colors shadow-sm"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
