"use client"

import * as React from "react"
import { useShallow } from "zustand/react/shallow"
import { useTradeStore, useAccountStore } from "@/stores"
import { useDashboardFilters, computeDateRange } from "@/stores/dashboard-filters"
import { calculateTradeStats, calculateR } from "@/lib/trade-stats"
import { convertPnL, formatCurrency } from "@/lib/fx-converter"
import { createClient } from "@/lib/supabase/client"
import type { Trade } from "@/types/trade"
import {
  FilterBar,
  KpiRow,
  CalendarHeatmap,
  EquityChart,
  BreakdownBars,
  SessionHeatmap,
  Histogram,
  ScatterHoldVsR,
  AccountMeters,
  ExpectancyLadder,
  StreakWidget,
  InsightsBar,
  HoldTimeBands,
  TradeTypeWidget,
  PnLDurationBoxPlot,
  PnLDurationScatter,
  EmotionalStateWidget,
} from "@/components/dashboard"

interface PlaybookForWidget {
  id: string
  name: string
  trade_type?: 'continuation' | 'reversal' | null
  direction?: 'buy' | 'sell' | 'both' | null
}

export default function Home() {
  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  // Playbooks for trade type widget
  const [playbooks, setPlaybooks] = React.useState<PlaybookForWidget[]>([])

  // Dashboard filters (use shallow equality to prevent re-renders)
  const filters = useDashboardFilters(useShallow((state) => state.filters))

  // Get individual date range values for computation
  const { dateRange: dateRangePreset, customStartDate, customEndDate } = filters

  // Compute date range from filter values (memoized to prevent re-creating Date objects)
  const dateRange = React.useMemo(
    () => computeDateRange(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate]
  )

  // Fetch data on mount
  React.useEffect(() => {
    void fetchTrades()
    void fetchAccounts()

    // Fetch playbooks for trade type widget
    const fetchPlaybooks = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('playbooks')
        .select('id, name, trade_type, direction')
        .eq('active', true)
      if (data) {
        setPlaybooks(data as PlaybookForWidget[])
      }
    }
    void fetchPlaybooks()
  }, [fetchTrades, fetchAccounts])

  // Filter trades based on dashboard filters
  const filteredTrades = React.useMemo(() => {
    let result = trades

    // Date range filter
    const { start, end } = dateRange
    result = result.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date)
      return tradeDate >= start && tradeDate <= end
    })

    // Account filter
    if (filters.accountId !== 'all') {
      result = result.filter(t => t.account_id === filters.accountId)
    }

    // Symbol filter
    if (filters.symbols.length > 0) {
      result = result.filter(t => filters.symbols.includes(t.symbol))
    }

    // Strategy filter
    if (filters.strategies.length > 0) {
      result = result.filter(t => t.strategy && filters.strategies.includes(t.strategy))
    }

    // Session filter
    if (filters.session !== 'all') {
      result = result.filter(trade => {
        const hour = new Date(trade.exit_date || trade.entry_date).getHours()
        if (filters.session === 'asia') return hour >= 0 && hour < 8
        if (filters.session === 'london') return hour >= 8 && hour < 16
        if (filters.session === 'ny') return hour >= 16
        return true
      })
    }

    // Exclude outliers (beyond 3 standard deviations)
    if (filters.excludeOutliers && result.length > 0) {
      const pnls = result.map(t => t.pnl)
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length
      const std = Math.sqrt(pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length)
      result = result.filter(t => Math.abs(t.pnl - mean) <= 3 * std)
    }

    return result
  }, [trades, filters, dateRange])

  // Normalize trades for display (convert to common currency or R)
  const normalizedTrades = React.useMemo(() => {
    return filteredTrades.map(trade => {
      // Get trade's account currency
      const tradeAccount = accounts.find(a => a.id === trade.account_id)
      const tradeCurrency = tradeAccount?.currency || 'USD'

      let pnlDisplay: number
      let displayUnit: string

      if (filters.units === 'r') {
        // R mode: use R-multiple
        pnlDisplay = calculateR(trade) || 0
        displayUnit = 'R'
      } else {
        // Currency mode
        if (filters.accountId === 'all') {
          // All accounts: convert to base currency
          pnlDisplay = convertPnL(trade.pnl, tradeCurrency, filters.baseCurrency, trade.exit_date || trade.entry_date)
          displayUnit = filters.baseCurrency
        } else {
          // Single account: use account currency
          pnlDisplay = trade.pnl
          displayUnit = tradeCurrency
        }
      }

      return {
        ...trade,
        pnlDisplay,
        displayUnit,
        originalCurrency: tradeCurrency,
      }
    })
  }, [filteredTrades, filters.units, filters.accountId, filters.baseCurrency, accounts])

  // Calculate stats from normalized trades
  const stats = React.useMemo(() => {
    // Create temporary trades with pnlDisplay as pnl for stats calculation
    const tradesForStats = normalizedTrades.map(t => ({
      ...t,
      pnl: t.pnlDisplay
    }))
    return calculateTradeStats(tradesForStats)
  }, [normalizedTrades])

  // Get display currency
  const displayCurrency = React.useMemo(() => {
    if (filters.units === 'r') return 'R'

    if (filters.accountId !== 'all') {
      const account = accounts.find(a => a.id === filters.accountId)
      return account?.currency || 'USD'
    }

    return filters.baseCurrency
  }, [filters.accountId, filters.units, filters.baseCurrency, accounts])

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Sticky Filter Bar */}
      <FilterBar />

      {/* Insights Bar */}
      <InsightsBar trades={filteredTrades} />

      {/* Main Content */}
      <div className="p-8 space-y-6">
        {/* Currency Display Badge */}
        {filters.accountId === 'all' && filters.units === 'currency' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700 rounded-lg">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              All Accounts • Display in: {filters.baseCurrency}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              (P&L converted using FX rates)
            </span>
          </div>
        )}

        {/* KPI Row */}
        <KpiRow
          trades={filteredTrades}
          netPnL={stats.net_profit ?? 0}
          winRate={stats.win_rate ?? 0}
          profitFactor={stats.profit_factor ?? 0}
          avgWin={stats.avg_win ?? 0}
          avgLoss={stats.avg_loss ?? 0}
          avgHoldMins={stats.avg_trade_duration ? stats.avg_trade_duration * 60 : undefined}
          currency={displayCurrency}
          units={filters.units}
        />

        {/* Edge Analysis Row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <ExpectancyLadder trades={filteredTrades} />
          <StreakWidget
            trades={normalizedTrades as Trade[]}
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
          <TradeTypeWidget trades={filteredTrades} playbooks={playbooks} />
          <HoldTimeBands trades={filteredTrades} />
        </div>

        {/* Calendar & Equity Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <CalendarHeatmap
            trades={normalizedTrades as Trade[]}
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
          <EquityChart
            trades={normalizedTrades as Trade[]}
            units={filters.units}
            currency={displayCurrency}
          />
        </div>

        {/* Performance Breakdowns */}
        <div className="grid gap-4 lg:grid-cols-3">
          <BreakdownBars
            trades={filteredTrades}
            type="dow"
            units={filters.units}
            currency={displayCurrency}
          />
          <BreakdownBars
            trades={filteredTrades}
            type="symbol"
            units={filters.units}
            currency={displayCurrency}
          />
          <BreakdownBars
            trades={filteredTrades}
            type="playbook"
            units={filters.units}
            currency={displayCurrency}
            playbooks={playbooks}
          />
        </div>

        {/* Session Heatmap */}
        <SessionHeatmap trades={filteredTrades} />

        {/* Emotional State Performance */}
        <EmotionalStateWidget trades={filteredTrades} />

        {/* Distribution Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Histogram trades={filteredTrades} />
          <ScatterHoldVsR trades={filteredTrades} />
        </div>

        {/* PnL by Duration Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PnLDurationBoxPlot trades={filteredTrades} currency={displayCurrency} />
          <PnLDurationScatter trades={filteredTrades} currency={displayCurrency} />
        </div>

        {/* Account Meters (if specific account selected) */}
        {filters.accountId !== 'all' && accounts.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            {accounts
              .filter(a => a.id === filters.accountId)
              .map(account => {
                const accountTrades = trades.filter(t => t.account_id === account.id)
                const accountStats = calculateTradeStats(accountTrades)

                return (
                  <AccountMeters
                    key={account.id}
                    account={account}
                    stats={accountStats}
                    currency={account.currency}
                  />
                )
              })}
          </div>
        )}

        {/* Show all account meters when "All Accounts" selected */}
        {filters.accountId === 'all' && accounts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Account Overview</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {accounts.map(account => {
                const accountTrades = trades.filter(t => t.account_id === account.id)
                const accountStats = calculateTradeStats(accountTrades)

                return (
                  <AccountMeters
                    key={account.id}
                    account={account}
                    stats={accountStats}
                    currency={account.currency}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
