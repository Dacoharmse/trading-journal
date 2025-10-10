# Dashboard Integration Guide

This guide shows how to integrate all the new polished dashboard components into `/app/page.tsx`.

## Components Created

All components are in `/components/dashboard/`:

1. **FilterBar** - Sticky filter bar with all controls
2. **KpiRow** - 6 KPI cards with tooltips and empty states
3. **CalendarHeatmap** - Trading calendar with streaks
4. **EquityChart** - Equity curve with DD overlay
5. **BreakdownBars** - Performance by DOW/Symbol/Strategy
6. **SessionHeatmap** - Hour/Session heatmap
7. **Histogram** - R distribution histogram
8. **ScatterHoldVsR** - Hold time vs R scatter plot
9. **AccountMeters** - Prop account progress meters
10. **Gauge** - Reusable circular gauge component

## Step 1: Add Imports

At the top of `/app/page.tsx`, add:

```typescript
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
} from "@/components/dashboard"
import { useDashboardFilters, useDateRange } from "@/stores/dashboard-filters"
import {
  calculateTradeStats,
  calculateNetR,
  calculateExpectancyR,
  calculateRecoveryFactorR,
  calculateDayWinPct,
} from "@/lib/trade-stats"
```

## Step 2: Hook into Dashboard Filters

Inside the `Home` component, add:

```typescript
export default function Home() {
  // Existing hooks
  const trades = useTradeStore((state) => state.trades)
  const fetchTrades = useTradeStore((state) => state.fetchTrades)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  // NEW: Dashboard filters
  const filters = useDashboardFilters((state) => state.filters)
  const dateRange = useDateRange()

  // ... rest of existing code
```

## Step 3: Filter Trades Based on Dashboard Filters

Replace the existing filtering logic with comprehensive filtering:

```typescript
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
```

## Step 4: Calculate Stats from Filtered Trades

```typescript
const stats = React.useMemo(() =>
  calculateTradeStats(filteredTrades),
  [filteredTrades]
)

const currency = React.useMemo(() => {
  if (filters.accountId !== 'all') {
    const account = accounts.find(a => a.id === filters.accountId)
    return account?.currency || 'USD'
  }
  // Use first account currency or default to USD
  return accounts[0]?.currency || 'USD'
}, [filters.accountId, accounts])
```

## Step 5: New Dashboard Layout

Replace the existing dashboard JSX with:

```typescript
return (
  <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
    {/* Sticky Filter Bar */}
    <FilterBar />

    {/* Main Content */}
    <div className="p-8 space-y-6">
      {/* KPI Row */}
      <KpiRow
        trades={filteredTrades}
        netPnL={stats.net_profit}
        winRate={stats.win_rate}
        profitFactor={stats.profit_factor}
        avgWin={stats.avg_win}
        avgLoss={stats.avg_loss}
        avgHoldMins={stats.avg_trade_duration ? stats.avg_trade_duration * 60 : undefined}
        currency={currency}
        units={filters.units}
      />

      {/* Calendar & Equity Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CalendarHeatmap
          trades={filteredTrades}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
        <EquityChart
          trades={filteredTrades}
          units={filters.units}
          currency={currency}
        />
      </div>

      {/* Performance Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownBars
          trades={filteredTrades}
          type="dow"
          units={filters.units}
          currency={currency}
        />
        <BreakdownBars
          trades={filteredTrades}
          type="symbol"
          units={filters.units}
          currency={currency}
        />
        <BreakdownBars
          trades={filteredTrades}
          type="strategy"
          units={filters.units}
          currency={currency}
        />
      </div>

      {/* Session Heatmap */}
      <SessionHeatmap trades={filteredTrades} />

      {/* Distribution Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Histogram trades={filteredTrades} />
        <ScatterHoldVsR trades={filteredTrades} />
      </div>

      {/* Account Meters (if specific account selected) */}
      {filters.accountId !== 'all' && (
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
          <h2 className="text-lg font-semibold mb-4">Account Overview</h2>
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
```

## Step 6: Remove Old Code

You can now remove:
- The old filter dropdown (replaced by FilterBar)
- The old widget implementations (replaced by new components)
- The manual date calculations (now handled by dashboard filters store)

## Benefits of New Architecture

✅ **Sticky filters** - Always accessible, URL-synced, persistent
✅ **Comprehensive KPIs** - All key metrics with tooltips
✅ **Rich visualizations** - Heatmaps, distributions, scatter plots
✅ **Prop account support** - Progress meters for funded traders
✅ **Empty states** - Helpful CTAs when no data
✅ **Accessibility** - Screen reader descriptions on all charts
✅ **Performance** - Memoized calculations, efficient filtering
✅ **Currency/R toggle** - Switch between currency and R values
✅ **Responsive** - Works on all screen sizes

## Testing Checklist

- [ ] Filters update all widgets simultaneously
- [ ] Date range presets work correctly
- [ ] Account filter shows correct data
- [ ] Symbol/Strategy multi-select works
- [ ] Session filter (Asia/London/NY) works
- [ ] Exclude outliers toggle filters correctly
- [ ] Currency/R toggle updates all values
- [ ] Empty states show for no data
- [ ] Tooltips explain formulas
- [ ] Calendar heatmap shows streaks
- [ ] Equity curve shows drawdown
- [ ] Performance breakdowns sortable
- [ ] Session heatmap interactive
- [ ] Distributions render correctly
- [ ] Account meters show prop firm progress
- [ ] Responsive on mobile/tablet
- [ ] Dark/light mode works
- [ ] Reset button clears all filters

## Additional Enhancements

Consider adding:
- Export dashboard as PDF
- Share dashboard link (with filters in URL)
- Custom date range picker (currently uses presets)
- Compare multiple accounts side-by-side
- Annotations on equity curve
- Trade notes/tags quick view
- Performance alerts/notifications
