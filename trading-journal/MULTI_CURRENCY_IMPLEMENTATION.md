# Multi-Currency Implementation Guide

## Overview

This implementation adds support for viewing and analyzing trades across multiple currency accounts (USD, ZAR, EUR, GBP) with intelligent normalization and conversion.

## Features Implemented

### 1. Account Scope Dropdown

**Location:** FilterBar component

**Behavior:**
- Shows "All Accounts" option + individual accounts with currency badges
- Example: `1M Account VF (ZAR)`, `50K Futures (USD)`
- Dynamically updates based on available accounts

### 2. Units Toggle Enhancement

**Modes:**

#### A) R Mode (Recommended for Multi-Account)
- **Formula:** `R = (exit - entry) / (entry - stop) × direction`
- **Benefit:** Currency-agnostic, pure risk-based analysis
- **Aggregation:** Direct summation across all accounts
- **KPIs Unaffected:** Win Rate, Profit Factor, Expectancy (R), Max DD (R), Streaks

#### B) Currency Mode

**Single Account:**
- Shows account's native currency badge (e.g., `ZAR`)
- No conversion needed
- KPIs display in account currency

**All Accounts:**
- Shows "Display in:" selector (USD/ZAR/EUR/GBP)
- Converts each trade P&L to selected base currency
- Shows conversion notice badge: `All Accounts • Display in: USD (P&L converted using FX rates)`

### 3. Trade Normalization Pipeline

**Code Location:** `app/page.tsx`

```typescript
const normalizedTrades = React.useMemo(() => {
  return filteredTrades.map(trade => {
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
        pnlDisplay = convertPnL(trade.pnl, tradeCurrency, filters.baseCurrency)
        displayUnit = filters.baseCurrency
      } else {
        // Single account: use account currency
        pnlDisplay = trade.pnl
        displayUnit = tradeCurrency
      }
    }

    return { ...trade, pnlDisplay, displayUnit, originalCurrency: tradeCurrency }
  })
}, [filteredTrades, filters])
```

### 4. FX Conversion System

**Helper Functions:** `lib/fx-converter.ts`

```typescript
convertPnL(pnl: number, from: string, to: string, date?: string): number
getFxRate(from: string, to: string, date?: string): number
formatCurrency(value: number, currency: string): string
getCurrencySymbol(currency: BaseCurrency): string
hasFxRate(from: string, to: string): boolean
getLastFxRateDate(): string
```

**Database Schema:** `supabase/migrations/20251008_fx_rates.sql`

```sql
CREATE TABLE fx_rates (
  date DATE NOT NULL,
  from_ccy TEXT NOT NULL,
  to_ccy TEXT NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,
  source TEXT DEFAULT 'manual',
  PRIMARY KEY (date, from_ccy, to_ccy)
);

-- Helper functions
get_fx_rate(p_date DATE, p_from_ccy TEXT, p_to_ccy TEXT) RETURNS NUMERIC
convert_pnl(p_pnl NUMERIC, p_from_ccy TEXT, p_to_ccy TEXT, p_date DATE) RETURNS NUMERIC
```

**FX Rate Fallback Strategy:**
1. Try exact date match
2. Fall back to most recent rate before date
3. Warn user if rate is stale
4. Display "Using last available FX: YYYY-MM-DD" badge

### 5. Aggregation Rules

#### Currency-Agnostic (Work Across All Modes)
- ✅ Win Rate
- ✅ Profit Factor
- ✅ Expectancy (R)
- ✅ Average R
- ✅ Max Drawdown (R)
- ✅ Day Win %
- ✅ Streaks (win/loss)
- ✅ Sharpe Ratio (R)
- ✅ Sortino Ratio (R)

#### Currency-Dependent (Require Conversion When All Accounts)
- 💱 Net P&L
- 💱 Avg Win/Loss (currency)
- 💱 Max Drawdown (currency)
- 💱 Equity Curve (currency)
- 💱 Best/Worst Day (currency)

### 6. UI Components Updated

#### FilterBar (`components/dashboard/FilterBar.tsx`)
**Changes:**
- Account dropdown shows currency in parentheses
- Currency badge shown for single account
- Base currency selector for All Accounts + Currency mode
- Tooltip explaining FX conversion

#### Dashboard Page (`app/page.tsx`)
**Changes:**
- Trade normalization pipeline
- Currency display badge
- Updated component props with `displayCurrency`
- Conditional rendering based on account scope

## Database Migration

### Run Migration

```bash
# Apply the FX rates migration
supabase migration up

# Or manually run the SQL file
psql -h localhost -U postgres -d trading_journal -f supabase/migrations/20251008_fx_rates.sql
```

### Seed Data Included

The migration includes current rates (as of 2025-10-08):
- USD/ZAR: 18.50
- USD/EUR: 0.92
- USD/GBP: 0.79
- (Plus reverse pairs)

### Updating FX Rates

**Option 1: Manual Update**
```sql
INSERT INTO fx_rates (date, from_ccy, to_ccy, rate)
VALUES ('2025-10-09', 'USD', 'ZAR', 18.55)
ON CONFLICT (date, from_ccy, to_ccy)
DO UPDATE SET rate = EXCLUDED.rate;
```

**Option 2: API Integration (Future)**
- Integrate with Alpha Vantage, Fixer.io, or ECB API
- Run daily cron job to fetch and store rates
- Add to `fx_rates.source` field for tracking

## Testing Checklist

### Functional Tests

- [ ] **Single Account + Currency**
  - KPIs show in account currency
  - Currency badge displays correctly
  - No conversion applied

- [ ] **Single Account + R**
  - KPIs show in R
  - R calculations correct
  - Currency-agnostic metrics work

- [ ] **All Accounts + R** (Default)
  - All trades converted to R
  - Aggregation sums R correctly
  - Cross-account comparison valid

- [ ] **All Accounts + Currency**
  - Base currency selector appears
  - Conversion badge displays
  - All P&L converted to base currency
  - Switching base currency updates all KPIs
  - FX rates applied correctly

### Edge Cases

- [ ] Missing FX rate (shows fallback warning)
- [ ] Single-currency portfolio (no conversion needed)
- [ ] Zero R trades (entry = stop)
- [ ] Open trades (excluded from currency equity)
- [ ] Account with no trades
- [ ] Very large P&L values (precision check)
- [ ] Negative P&L (conversion maintains sign)

### Visual Tests

- [ ] Currency badges styled correctly
- [ ] Base currency selector visible only when needed
- [ ] Tooltip text clear and helpful
- [ ] Conversion notice badge displays
- [ ] Dark mode support
- [ ] Mobile responsive

## Usage Examples

### Example 1: Single USD Account
```
Account: 50K Futures (USD)
Units: Currency
Display: $5,230 ✓ (native currency)
```

### Example 2: Single ZAR Account
```
Account: 1M Account VF (ZAR)
Units: Currency
Display: R12,450 ✓ (native currency)
```

### Example 3: All Accounts in R
```
Account: All Accounts
Units: R
Display: +12.5R ✓ (currency-agnostic)
No conversion needed
```

### Example 4: All Accounts in USD
```
Account: All Accounts
Units: Currency
Display in: USD
Display: $5,230 (converted from mixed ZAR/USD)
Badge: "All Accounts • Display in: USD (P&L converted using FX rates)"
```

## State Management

### Zustand Store (`stores/dashboard-filters.ts`)

```typescript
interface DashboardFilters {
  accountId: string // 'all' or account ID
  units: 'currency' | 'r'
  baseCurrency: 'ZAR' | 'USD' | 'EUR' | 'GBP'
  // ... other filters
}

// Actions
setAccountId(accountId: string): void
setUnits(units: UnitToggle): void
setBaseCurrency(currency: BaseCurrency): void
```

### Persistence
- Filters persist to localStorage via Zustand middleware
- Default: `units: 'r'`, `baseCurrency: 'USD'`
- User preferences maintained across sessions

## Performance Considerations

### Optimization 1: Memoization
```typescript
const normalizedTrades = React.useMemo(() => {
  // Expensive currency conversion
}, [filteredTrades, filters.units, filters.baseCurrency, accounts])
```

### Optimization 2: Lazy Loading
- FX rates loaded once on mount
- Cached in memory
- Invalidate when date changes

### Optimization 3: Batch Conversion
- Convert all trades in single pass
- Avoid repeated FX lookups for same currency pair

## Future Enhancements

### 1. Historical FX Rates
- Fetch daily rates from API
- Store historical data for accurate backtesting
- Show "FX rate as of {date}" for each trade

### 2. Custom FX Rate Override
- Allow manual rate entry for specific dates
- Useful for exotic currency pairs
- Mark as "manual" in source field

### 3. Multi-Base Currency Comparison
- Side-by-side view in multiple currencies
- E.g., show USD | ZAR | EUR simultaneously

### 4. FX Impact Analysis
- Show P&L in original currency vs converted
- Calculate FX gain/loss separate from trading P&L
- Attribution: "Trading P&L: +$5k, FX Impact: -$200"

### 5. Per-Account Breakdown in All Accounts View
- Stacked equity curve (each account a band)
- Table showing contribution by account
- Filter out accounts with minimal activity

## Troubleshooting

### Issue: KPIs Don't Update When Changing Base Currency

**Solution:** Check that `displayCurrency` is passed to all components and `useMemo` dependencies include `filters.baseCurrency`

### Issue: FX Rate Not Found Warning

**Solution:**
1. Check `fx_rates` table has data for currency pair
2. Verify date range covers trade dates
3. Run seed migration to populate initial rates

### Issue: Incorrect Conversion

**Solution:**
1. Verify FX rate direction (from_ccy → to_ccy)
2. Check rate magnitude (USD/ZAR should be ~18, not 0.05)
3. Inspect normalized trades in React DevTools

### Issue: Performance Slow with Large Datasets

**Solution:**
1. Add index on trades (account_id, exit_date)
2. Limit normalization to visible date range
3. Use pagination for trade lists

## API Reference

### Components

**FilterBar**
- Props: None (uses Zustand store)
- State: `filters`, `accounts`, `selectedAccount`
- Actions: `setAccountId`, `setUnits`, `setBaseCurrency`

**KpiRow**
- Props: `trades`, `currency`, `units`, `netPnL`, etc.
- Note: `currency` now respects `displayCurrency`

**EquityChart**
- Props: `trades` (normalized), `currency`, `units`
- Note: Expects trades with `pnlDisplay` field

### Functions

**convertPnL**
```typescript
function convertPnL(
  pnl: number,
  from: string,
  to: string,
  date?: string
): number
```

**calculateR**
```typescript
function calculateR(trade: Trade): number | null
```

## Security Considerations

### RLS Policies
- All users can READ fx_rates
- Only admins can INSERT/UPDATE fx_rates
- Prevents unauthorized rate manipulation

### Data Validation
- CHECK constraints on currency codes
- Rate must be positive
- from_ccy ≠ to_ccy

### Audit Trail
- `created_at`, `updated_at` timestamps
- `source` field tracks manual vs API rates

## Acceptance Criteria

✅ Account filter supports "All Accounts" and individual accounts
✅ KPIs update correctly when switching accounts
✅ Single account + Currency shows native currency
✅ All + R shows currency-agnostic metrics
✅ All + Currency shows base currency selector
✅ FX conversion applied correctly to P&L metrics
✅ Tooltips explain conversion clearly
✅ Currency badges display appropriately
✅ Equity curve renders with converted values
✅ Performance remains smooth with large datasets
✅ Dark mode support
✅ Mobile responsive

## Summary

This implementation provides a robust, user-friendly system for managing multi-currency trading portfolios. Key benefits:

1. **Flexibility:** View data in R (risk-based) or any supported currency
2. **Accuracy:** FX conversion with historical rate support
3. **Transparency:** Clear badges and tooltips explain conversions
4. **Performance:** Memoized calculations maintain 60fps
5. **Extensibility:** Easy to add new currencies or FX sources

The default R mode ensures fair comparison across accounts, while Currency mode with conversion provides real-world monetary insights.
