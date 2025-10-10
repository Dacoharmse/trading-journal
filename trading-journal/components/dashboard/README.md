# Dashboard Components Documentation

Professional, production-ready dashboard components for the Trading Journal application.

## Overview

This directory contains 10 polished dashboard components designed to provide comprehensive trading analytics with proper accessibility, responsive design, and performance optimization.

## Components

### 1. FilterBar
**Purpose**: Sticky filter bar for dashboard-wide controls

**Features**:
- Date range presets (Week, Month, 3M, YTD, All)
- Account selector (single select)
- Symbol multi-select
- Strategy multi-select
- Session filter (All, Asia, London, NY)
- Exclude outliers toggle
- Currency/R units toggle
- Reset button (when filters active)

**State**: Uses `useDashboardFilters` store
**Position**: Sticky at top with backdrop blur

### 2. KpiRow
**Purpose**: Display key performance indicators

**Metrics**:
1. Net P&L (with Net R subtext)
2. Win Rate (circular gauge + trade count)
3. Profit Factor (color-coded dial)
4. Day Win % (percentage of green days)
5. Avg Win vs Loss (dual bars)
6. Expectancy (R) & Recovery Factor (pills)

**Features**:
- Tooltips with formula explanations
- Empty state with CTAs to Import/Add Trade
- Currency/R value display
- Color coding (green/red/amber)

### 3. CalendarHeatmap
**Purpose**: Visual calendar with daily P&L

**Features**:
- Color-coded cells (intensity = P&L magnitude)
- Best/Worst day callouts
- Current streak indicator
- Best win streak tracking
- Hover tooltips with details
- Responsive grid layout

**Legend**: Red (losses) to Green (profits)

### 4. EquityChart
**Purpose**: Cumulative equity curve with drawdown overlay

**Features**:
- Week/Month toggle
- Currency or R display
- Drawdown area (red shading)
- Max DD annotation with date range
- Zero baseline reference
- Current value indicator
- Responsive SVG chart

**Calculations**: Uses `calculateMaxDrawdownR()` for annotations

### 5. BreakdownBars
**Purpose**: Performance analysis by category

**Types**:
- Day of Week
- Symbol
- Strategy

**Features**:
- Metric selector (Net R, Win Rate, Expectancy, P&L)
- Sort toggle (name vs value)
- Sample size displayed
- Color-coded bars
- Responsive bars

### 6. SessionHeatmap
**Purpose**: Hour-by-hour performance across sessions

**Features**:
- 24-hour x 3-session grid
- Metric toggle (Win Rate, Expectancy R, Net R)
- Color intensity = performance
- Hover tooltips
- Session labels (Asia/London/NY)

**Sessions**:
- Asia: 00:00-08:00
- London: 08:00-16:00
- NY: 16:00-24:00

### 7. Histogram
**Purpose**: R value distribution

**Features**:
- 20 bins (-5R to +5R)
- Zero line emphasis (yellow)
- Color coding (red/neutral/green)
- Total R display
- Win rate display
- Hover tooltips

**Use Case**: Identify if R distribution is skewed

### 8. ScatterHoldVsR
**Purpose**: Relationship between hold time and R

**Features**:
- Interactive scatter plot
- Hover shows trade details (symbol, date, strategy, R)
- Zero baseline reference
- Color: green (profit) / red (loss)
- Responsive SVG

**Insights**: Find optimal hold times for strategies

### 9. AccountMeters
**Purpose**: Prop firm account progress tracking

**Features**:
- Current balance display
- Profit target progress bar
- Max drawdown tracking
- Phase badge (Phase 1/2/Funded)
- Status indicator (In Progress/Target Hit/Limit Breached)
- Stats grid (trades, win rate, PF, net P&L)

**Displays**:
- Only for prop-firm accounts
- Color-coded progress bars
- Percentage indicators

### 10. Gauge
**Purpose**: Reusable circular progress gauge

**Props**:
- `value` (0-100)
- `size` (default 100px)
- `strokeWidth` (default 12px)
- `color` (default green)
- `label` / `sublabel` (optional)
- `showValue` (default true)

**Usage**:
```tsx
<Gauge
  value={75}
  size={80}
  color="#22c55e"
  label="Win Rate"
  sublabel="Last 30 days"
/>
```

## Data Flow

```
Dashboard Filters Store (Zustand)
        ↓
    FilterBar Component
        ↓
    Filtered Trades
        ↓
    Stats Calculations (/lib/trade-stats.ts)
        ↓
    Dashboard Widgets
```

## Metrics Calculations

All metrics use functions from `/lib/trade-stats.ts`:

### R-based Metrics
- `calculateR(trade)` - Individual trade R
- `calculateNetR(trades)` - Sum of all R values
- `calculateExpectancyR(trades)` - Average R per trade
- `calculateSharpeR(trades)` - Sharpe ratio in R
- `calculateSortinoR(trades)` - Sortino ratio in R
- `calculateMaxDrawdownR(trades)` - Max DD with peak/trough
- `calculateRecoveryFactorR(trades)` - Net R / Max DD

### Traditional Metrics
- `calculateTradeStats(trades)` - Win rate, PF, avg win/loss
- `calculateDayWinPct(trades)` - % of green days
- `calculateTraderScore(stats, balance)` - Composite 0-100 score

## Accessibility

All components include:
- ARIA labels
- Screen reader descriptions (`sr-only` divs)
- Keyboard navigation support
- Focus indicators
- Semantic HTML
- Sufficient color contrast

## Performance

Optimizations:
- `React.useMemo` for expensive calculations
- Filtered data passed down (not recalculated)
- SVG for charts (lightweight)
- Lazy loading where appropriate
- No unnecessary re-renders

## Responsive Design

Breakpoints:
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (sm to lg)
- Desktop: > 1024px (lg+)

Grid layouts adapt:
- KPI Row: 2 cols (mobile) → 3 cols (tablet) → 6 cols (desktop)
- Charts: 1 col (mobile) → 2 cols (tablet/desktop)
- Breakdowns: 1 col (mobile) → 3 cols (desktop)

## Styling

**Design System**:
- Glass-morphism cards (`bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm`)
- Consistent shadows (`shadow-lg shadow-black/5`)
- Border radius (`rounded-lg`)
- Color palette: Green (profit), Red (loss), Yellow (neutral), Purple (prop)

**Dark Mode**: All components support dark/light mode via Tailwind classes

## Empty States

Components gracefully handle:
- No trades (KpiRow shows CTAs)
- No R data (Histogram/Scatter show message)
- No filtered results (All widgets adapt)
- Missing fields (Guards with null checks)

## Tooltips

Using Radix UI Tooltip:
- Formula explanations on KPI labels
- Hover details on heatmap cells
- Trade info on scatter points
- Context on all metrics

## Integration Example

```tsx
import {
  FilterBar,
  KpiRow,
  CalendarHeatmap,
  EquityChart,
  BreakdownBars,
} from "@/components/dashboard"
import { useDashboardFilters } from "@/stores/dashboard-filters"

export default function Dashboard() {
  const filters = useDashboardFilters(state => state.filters)
  const filteredTrades = useFilteredTrades() // Your filter logic

  return (
    <>
      <FilterBar />
      <KpiRow trades={filteredTrades} {...stats} />
      <CalendarHeatmap trades={filteredTrades} />
      <EquityChart trades={filteredTrades} units={filters.units} />
      <BreakdownBars trades={filteredTrades} type="dow" />
    </>
  )
}
```

## Testing

Key test scenarios:
1. Empty data (0 trades)
2. Single trade
3. Large dataset (1000+ trades)
4. Missing R data (no stop loss)
5. All filters active
6. Edge cases (all wins, all losses)
7. Mobile viewport
8. Dark mode
9. Keyboard navigation
10. Screen reader compatibility

## Known Limitations

1. **MAE/MFE**: Require intra-trade tick data (not available)
2. **Confluences**: Trade type doesn't have this property yet
3. **Custom date range**: Uses presets only (custom picker TODO)
4. **Sessions**: Based on hour only (doesn't account for holidays/weekends)

## Future Enhancements

- [ ] Export charts as PNG/PDF
- [ ] Annotation tools for equity curve
- [ ] Drill-down from heatmap to trade list
- [ ] Compare multiple periods
- [ ] Custom metric builder
- [ ] Monte Carlo simulations
- [ ] Real-time updates (WebSocket)
- [ ] Benchmark comparisons

## Dependencies

```json
{
  "@radix-ui/react-tooltip": "^1.2.8",
  "lucide-react": "^0.544.0",
  "zustand": "^5.0.8"
}
```

## File Structure

```
components/dashboard/
├── FilterBar.tsx          # Sticky filter controls
├── Gauge.tsx              # Reusable circular gauge
├── KpiRow.tsx             # 6 KPI cards
├── CalendarHeatmap.tsx    # Calendar with streaks
├── EquityChart.tsx        # Equity curve + DD
├── BreakdownBars.tsx      # DOW/Symbol/Strategy bars
├── SessionHeatmap.tsx     # Hour/Session grid
├── Histogram.tsx          # R distribution
├── ScatterHoldVsR.tsx     # Hold time vs R plot
├── AccountMeters.tsx      # Prop account progress
├── index.ts               # Exports
└── README.md              # This file
```

## Support

For issues or questions:
1. Check `/DASHBOARD_INTEGRATION_GUIDE.md`
2. Review `/lib/trade-stats.ts` for calculations
3. Inspect `/stores/dashboard-filters.ts` for state
4. See main `/README.md` for project overview
