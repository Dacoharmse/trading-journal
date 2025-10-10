# Dashboard Quick Start Guide

## TL;DR - 5 Minute Setup

### 1. Import Components (1 min)

Add to `/app/page.tsx`:

```typescript
import {
  FilterBar, KpiRow, CalendarHeatmap, EquityChart,
  BreakdownBars, SessionHeatmap, Histogram,
  ScatterHoldVsR, AccountMeters
} from "@/components/dashboard"
import { useDashboardFilters, useDateRange } from "@/stores/dashboard-filters"
```

### 2. Add Filter State (1 min)

```typescript
export default function Home() {
  const filters = useDashboardFilters(state => state.filters)
  const dateRange = useDateRange()
  const trades = useTradeStore(state => state.trades)
  // ... existing code
```

### 3. Filter Trades (1 min)

```typescript
const filteredTrades = React.useMemo(() => {
  let result = trades
  const { start, end } = dateRange

  // Date filter
  result = result.filter(t => {
    const date = new Date(t.exit_date || t.entry_date)
    return date >= start && date <= end
  })

  // Account filter
  if (filters.accountId !== 'all') {
    result = result.filter(t => t.account_id === filters.accountId)
  }

  // Add other filters as needed...
  return result
}, [trades, filters, dateRange])
```

### 4. Render Dashboard (2 min)

```typescript
return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
    <FilterBar />

    <div className="p-8 space-y-6">
      <KpiRow
        trades={filteredTrades}
        netPnL={stats.net_profit}
        winRate={stats.win_rate}
        profitFactor={stats.profit_factor}
        avgWin={stats.avg_win}
        avgLoss={stats.avg_loss}
        avgHoldMins={stats.avg_trade_duration}
        currency="USD"
        units={filters.units}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CalendarHeatmap trades={filteredTrades} startDate={dateRange.start} endDate={dateRange.end} />
        <EquityChart trades={filteredTrades} units={filters.units} currency="USD" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownBars trades={filteredTrades} type="dow" units={filters.units} currency="USD" />
        <BreakdownBars trades={filteredTrades} type="symbol" units={filters.units} currency="USD" />
        <BreakdownBars trades={filteredTrades} type="strategy" units={filters.units} currency="USD" />
      </div>

      <SessionHeatmap trades={filteredTrades} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Histogram trades={filteredTrades} />
        <ScatterHoldVsR trades={filteredTrades} />
      </div>
    </div>
  </div>
)
```

## Done! 🎉

Your dashboard is now fully functional with:
- ✅ Sticky filters
- ✅ 6 KPI cards
- ✅ Calendar heatmap
- ✅ Equity curve
- ✅ Performance breakdowns
- ✅ Session analysis
- ✅ Distributions

## Test It

1. `npm run dev`
2. Go to `/`
3. Try changing filters
4. All widgets should update

## Need More Detail?

See `/DASHBOARD_INTEGRATION_GUIDE.md` for full integration steps.

## Component Props Quick Reference

### KpiRow
```typescript
{
  trades: Trade[]
  netPnL: number
  winRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  avgHoldMins: number | undefined
  currency: string
  units: 'currency' | 'r'
}
```

### CalendarHeatmap
```typescript
{
  trades: Trade[]
  startDate: Date
  endDate: Date
}
```

### EquityChart
```typescript
{
  trades: Trade[]
  units: 'currency' | 'r'
  currency: string
}
```

### BreakdownBars
```typescript
{
  trades: Trade[]
  type: 'dow' | 'symbol' | 'strategy'
  units: 'currency' | 'r'
  currency: string
}
```

### SessionHeatmap
```typescript
{
  trades: Trade[]
}
```

### Histogram
```typescript
{
  trades: Trade[]
}
```

### ScatterHoldVsR
```typescript
{
  trades: Trade[]
}
```

### AccountMeters
```typescript
{
  account: Account
  stats: TradeStats
  currency: string
}
```

## Common Issues

### Filters not working?
- Check `useDashboardFilters` is imported
- Verify `filteredTrades` is computed correctly
- Console log filters to debug

### Empty state showing?
- Verify trades are loaded
- Check filter criteria isn't too restrictive
- Look at console for errors

### Charts not rendering?
- Check trade data has required fields
- Verify calculations don't return null
- Check browser console for errors

### Types errors?
- Run `npm run build` to see all errors
- Check Trade type has all required fields
- Verify imports are correct

## Next Steps

1. ✅ Basic integration (you are here)
2. 📝 Add full filter logic (see integration guide)
3. 🎨 Customize colors/styling
4. 🧪 Test edge cases
5. 📱 Test responsive
6. 🚀 Deploy!
