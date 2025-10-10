# Pips/R-First Workflow Implementation

This document describes the new pips/R-first trade journaling workflow.

## Overview

The workflow prioritizes pips/points and R-multiples over entry/exit prices, making trade capture faster during live trading and backtesting. Charts can be pasted directly from clipboard or TradingView.

## Database Schema

### New Tables

1. **strategies** - Trading playbooks with rules and session preferences
2. **confluences** - Catalog of confluence factors for trade analysis
3. **symbols** - Global symbol metadata (pip size, asset class, etc.)
4. **account_symbols** - Which symbols each account trades
5. **trade_confluences** - Many-to-many join for trades and confluences

### Trade Table Updates

New columns added to `trades` table:
- `pips` - Realized pips/points (+/-)
- `stop_pips` - Planned stop distance
- `target_pips` - Planned target distance
- `rr_planned` - Planned R:R ratio (e.g., 2 for 1:2)
- `risk_r` - Risk per trade in R (usually 1.0)
- `r_multiple` - Realized R (auto-calculated)
- `media_urls` - Array of chart images/URLs
- `strategy_id` - FK to strategies table
- `symbol_id` - FK to symbols table
- `session` - Trading session (Asia/London/NY)
- `open_time`, `close_time` - Time fields

## Components

### NewTradeSheet (`/components/trades/NewTradeSheet.tsx`)

Main trade entry form with sections:
1. **Trade Basics** - Account, Symbol, Direction, Session, Date/Times
2. **Risk & Result** - Pips, Stop, Target, R:R, Risk R
   - Auto-calculates realized R from pips and stop
   - Live preview of R-multiple
3. **Playbook** - Strategy dropdown, Confluences multi-select
4. **Chart Images** - Paste/upload/drag-drop support
5. **Notes** - Trade observations

### ChartPaste (`/components/trades/ChartPaste.tsx`)

Chart upload component with:
- Clipboard paste support (Ctrl/Cmd+V)
- Drag-and-drop file upload
- TradingView URL detection and preview
- Image compression before upload
- Thumbnail grid with remove buttons
- Uploads to Supabase Storage `trade-media` bucket

### Strategies Page (`/app/strategies/page.tsx`)

CRUD interface for trading strategies:
- Name, Type (Breakout/Reversion/Trend/News/ICT/Other)
- Sessions (Asia/London/NY)
- Rules (Markdown text area)
- Active toggle (show in trade form)
- Grid layout with edit/delete actions

### Confluences Page (`/app/confluences/page.tsx`)

CRUD interface for confluence factors:
- Label (e.g., "PDH/PDL", "VWAP", "50EMA")
- Description (optional)
- Active toggle
- Table layout with inline editing

### AccountSymbols Component (`/components/settings/AccountSymbols.tsx`)

Symbol assignment for accounts:
- Shows which symbols an account can trade
- Add/remove symbols with dropdown
- Filters trade form symbol list per account

## Utility Functions

### trade-math.ts

- `rFromPips()` - Calculate R-multiple from pips
- `formatR()` - Format R values for display
- `formatPips()` - Format pips/points with labels
- `parseRR()` - Parse "1:2" notation to number
- `calculatePlannedRR()` - Compute R:R from target/stop
- `calculatePositionSize()` - Position sizing based on risk
- `validateTradeNumber()` - Input validation

### storage.ts

- `uploadTradeMedia()` - Upload file to Supabase Storage
- `deleteTradeMedia()` - Delete file from storage
- `uploadMultipleTradeMedia()` - Batch upload
- `validateMediaFile()` - Check file type/size
- `compressImage()` - Client-side image compression
- `extractTradingViewUrl()` - Parse TradingView URLs from text

## Setup Instructions

### 1. Run Database Migrations

**Option A: Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Open `supabase/migrations/20251008_strategies_confluences_symbols.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor and click "Run"

**Option B: Supabase CLI** (if installed)

```bash
supabase db push
```

### 2. Configure Storage

The migration creates a `trade-media` bucket with RLS policies. Verify in:
https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets

### 3. Seed Initial Data

The migration includes common symbols (EURUSD, GBPUSD, XAUUSD, etc.). Add more via SQL Editor or the app UI.

### 4. Assign Symbols to Accounts

1. Go to Settings page
2. For each account, use the AccountSymbols component to select tradeable symbols
3. Or run SQL:

```sql
INSERT INTO account_symbols (account_id, symbol_id)
SELECT 'YOUR_ACCOUNT_ID', id FROM symbols WHERE code IN ('EURUSD', 'GBPUSD', 'XAUUSD');
```

### 5. Create Strategies & Confluences

1. Navigate to `/strategies` and create your trading strategies
2. Navigate to `/confluences` and add confluence factors
3. These will appear in the New Trade form

## Usage Workflow

### Creating a Trade

1. Click "New Trade" button
2. **Trade Basics**: Select account (filters symbols), symbol, direction, session, date
3. **Risk & Result**: Enter realized pips and stop distance
   - Watch the live R-multiple preview
   - Optionally enter target pips and planned R:R
4. **Playbook**: Select strategy and confluences
5. **Chart**: Paste screenshot (Ctrl/Cmd+V) or upload/drag-drop images
6. **Notes**: Add observations
7. Click "Save"

### Pips/R Calculation

The form auto-calculates:

```
R-multiple = (pips / stop_pips) * risk_r
```

Example:
- Pips: +30
- Stop: 20 pips
- Risk R: 1.0
- **Result: +1.5R**

### FX vs Indices/Metals

The form detects asset class from the selected symbol:
- **FX**: Shows "pips" label (1 pip = 0.0001, except JPY = 0.01)
- **Index/Metal/Crypto**: Shows "points" label

### Chart Paste

Three ways to add charts:
1. **Clipboard**: Copy image → Click drop zone → Ctrl/Cmd+V
2. **TradingView URL**: Copy share link → Paste into drop zone
3. **Upload**: Click drop zone or drag-and-drop files

Images are compressed before upload and stored in Supabase Storage.

## Data Model Relationships

```
accounts
  ↓
account_symbols ←→ symbols
  ↓
trades ←→ strategies
  ↓
trade_confluences ←→ confluences
```

## File Structure

```
/app
  /strategies/page.tsx          # Strategies CRUD
  /confluences/page.tsx         # Confluences CRUD
  /trades/page.tsx              # Main trades page (existing)

/components
  /trades
    /NewTradeSheet.tsx          # New trade form (pips/R-first)
    /ChartPaste.tsx             # Chart upload component
  /settings
    /AccountSymbols.tsx         # Symbol assignment per account

/lib
  /trade-math.ts                # R calculation utilities
  /storage.ts                   # Supabase storage helpers

/supabase/migrations
  /20251008_strategies_confluences_symbols.sql  # Schema changes

/types
  /supabase.ts                  # Updated with new types
```

## Validation Rules

- **Account**: Required
- **Symbol**: Required (filtered by account)
- **Date**: Required
- **Pips**: Optional (can be negative)
- **Stop Pips**: Must be ≥ 0 if provided
- **Target Pips**: Must be ≥ 0 if provided
- **Risk R**: Must be between 0.25 and 5.0
- **R:R**: Must be ≥ 0 if provided

## Features

✅ Pips/R-first workflow (entry/exit prices optional)
✅ Account → Symbol dependency (filtered by account_symbols)
✅ Strategy and Confluence catalogs with CRUD
✅ Chart paste from clipboard
✅ TradingView URL support
✅ Drag-and-drop upload
✅ Image compression before upload
✅ Auto-calculated R-multiple
✅ Live R preview in form
✅ Multi-select confluences
✅ Session tagging (Asia/London/NY)
✅ Dark mode support
✅ Responsive layout
✅ TypeScript type safety

## Next Steps

1. **Run the migrations** to create new tables
2. **Seed symbols** for your trading instruments
3. **Assign symbols to accounts** via Settings
4. **Create strategies and confluences** for your playbook
5. **Test the NewTradeSheet** component with real data

## Troubleshooting

### Symbols not appearing in form
- Check account_symbols table has rows for the selected account
- Verify symbol_id foreign key is correct

### Upload fails
- Check Supabase Storage bucket `trade-media` exists
- Verify RLS policies allow insert for user_id

### R-multiple not calculating
- Ensure pips and stop_pips are both provided
- Check that stop_pips > 0

### Strategy/Confluence not showing
- Verify `active = true` in database
- Check RLS policies allow user to select their data

## API Reference

See inline JSDoc comments in:
- `lib/trade-math.ts`
- `lib/storage.ts`
- Component prop types in each `.tsx` file
