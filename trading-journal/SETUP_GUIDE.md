# Trading Journal - Complete Setup Guide

## ✅ Current Status

Your Trading Journal is **running and ready** at:
- **Local URL:** http://localhost:3000
- **Network URL:** http://192.168.1.154:3000

## 📋 What's Been Completed

### 1. Environment Setup ✓
- ✅ Supabase credentials configured in `.env.local`
- ✅ Development server running on port 3000

### 2. New Features Added ✓
The following fields have been added to your trading journal:

#### **Trade Outcome Section:**
- **P/L Amount** - Profit/loss in your account currency (USD, ZAR, etc.)
- **Actual R:R** - Actual risk/reward ratio achieved
- **Outcome** - Win/Loss/Break-even classification

#### **Timeframe Fields:**
- **Entry Timeframe** - The timeframe you entered the trade on (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
- **Analysis Timeframe** - Optional higher timeframe for analysis/confirmation

## 🗄️ Database Setup (Required)

### Step 1: Run the Migration
You need to add the new columns to your Supabase database:

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `dcodkkmamshucctkywbf`

2. **Open SQL Editor:**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration Script:**
   - Open the file: `migration-add-new-fields.sql` (located in your project root)
   - Copy the entire contents
   - Paste it into the Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

4. **Verify Success:**
   - You should see: "Success. No rows returned"
   - This means the columns were added successfully!

### Alternative: Quick Copy-Paste Migration

If you prefer, copy this SQL and run it in Supabase SQL Editor:

```sql
-- Add new columns to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS pnl_amount NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS pnl_currency TEXT,
ADD COLUMN IF NOT EXISTS actual_rr NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win', 'loss', 'breakeven')),
ADD COLUMN IF NOT EXISTS entry_timeframe TEXT,
ADD COLUMN IF NOT EXISTS analysis_timeframe TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON public.trades(outcome);
CREATE INDEX IF NOT EXISTS idx_trades_entry_timeframe ON public.trades(entry_timeframe);
CREATE INDEX IF NOT EXISTS idx_trades_pnl_currency ON public.trades(pnl_currency);
```

## 🚀 Using the Application

### Accessing the App
1. **Open your browser** and go to: http://localhost:3000
2. The app is now running with all new features!

### Recording a Trade
1. Click **"New Trade"** button in the sidebar
2. Fill in the form - you'll now see:

   **Setup Overview Section:**
   - Account (required)
   - Symbol (required)
   - Direction (Long/Short)
   - Entry Date & Time
   - **Entry Timeframe** ⭐ NEW
   - **Analysis Timeframe** ⭐ NEW (optional)

   **Trade Outcome Section:**
   - Actual Result (pips)
   - Close Reason
   - Exit Time
   - **P/L Amount** ⭐ NEW - Shows your account currency (USD/ZAR)
   - **Actual R:R** ⭐ NEW
   - **Outcome** ⭐ NEW - Win/Loss/Break-even

3. Click **Save** to record your trade

### Features Overview

#### Dashboard
- View your trading statistics and performance
- Filter by date range, accounts, sessions
- See your equity curve and performance metrics

#### Trades Page
- View all your trades in a list
- Filter and search trades
- Edit or delete trades
- Import trades from CSV

#### Analytics
- Deep dive into your trading performance
- View performance by symbol, strategy, timeframe
- Analyze win rates, profit factors, and more

#### Accounts
- Manage multiple trading accounts
- Support for Live, Demo, and Prop Firm accounts
- Track account metrics and balances

## 📊 Database Schema

Your `trades` table now includes these new fields:

| Column Name | Type | Description |
|-------------|------|-------------|
| `pnl_amount` | NUMERIC(15,2) | Profit/loss amount in account currency |
| `pnl_currency` | TEXT | Currency code (USD, ZAR, EUR, etc.) |
| `actual_rr` | NUMERIC(10,2) | Actual risk/reward ratio achieved |
| `outcome` | TEXT | Trade outcome: 'win', 'loss', or 'breakeven' |
| `entry_timeframe` | TEXT | Entry timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M) |
| `analysis_timeframe` | TEXT | Analysis timeframe (optional) |

## 🔧 Troubleshooting

### Server Not Running
If the server isn't running, start it with:
```bash
cd "trading-journal/trading-journal"
npm run dev
```

### Database Connection Issues
1. Check that your `.env.local` file has the correct credentials
2. Verify you ran the migration script in Supabase
3. Check that your Supabase project is active

### Fields Not Showing in Form
1. Hard refresh your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Make sure you're using the **New Trade** button (not Import)

### Migration Already Applied
If you see an error like "column already exists", that's fine! It means the migration was already run. The `IF NOT EXISTS` clause prevents errors.

## 📁 Project Structure

```
trading-journal/
├── components/
│   ├── trades/
│   │   └── NewTradeSheet.tsx       # Main trade form (with new fields)
│   ├── dashboard/
│   │   └── KpiRow.tsx              # Dashboard metrics
│   └── new-trade-dialog.tsx        # Alternative trade form
├── types/
│   └── trade.ts                    # Trade TypeScript definitions
├── lib/
│   ├── db-schema.sql              # Full database schema
│   └── supabase/
├── .env.local                     # Environment variables (Supabase credentials)
└── migration-add-new-fields.sql   # Migration script for new fields
```

## 🎯 Next Steps

### 1. Test the Application
- [ ] Open http://localhost:3000
- [ ] Click "New Trade"
- [ ] Verify all new fields are visible
- [ ] Try recording a test trade

### 2. Run the Database Migration
- [ ] Go to Supabase Dashboard
- [ ] Run the migration script
- [ ] Verify columns were added

### 3. Start Trading!
- [ ] Record your first real trade
- [ ] Explore the dashboard
- [ ] Check out the analytics page

## 💡 Tips

### Best Practices
1. **Always fill in Entry Timeframe** - This helps you analyze which timeframes work best
2. **Use Analysis Timeframe** - Record the higher timeframe you used for confirmation
3. **Record P/L Amount** - Track your actual monetary gains/losses
4. **Set Outcome** - Quickly classify trades as wins, losses, or break-evens
5. **Track Actual R:R** - Compare your planned vs. actual risk/reward

### Account Currencies
- The P/L Amount field automatically shows your account's currency
- Supported currencies: USD, ZAR, EUR, GBP, CAD, AUD, JPY
- Set your account currency when creating/editing accounts

## 🆘 Need Help?

### Common Questions

**Q: I don't see the new fields in the form?**
A: Make sure you're clicking "New Trade" and not using the old dialog. The new fields are in the NewTradeSheet component.

**Q: Can I use different timeframes for different trades?**
A: Yes! Each trade can have its own entry and analysis timeframe.

**Q: What if I trade on multiple timeframes?**
A: Use Entry Timeframe for the chart you actually executed on, and Analysis Timeframe for your confirmation chart.

**Q: Do I have to fill in all the new fields?**
A: Only Entry Timeframe is required. The others (Analysis Timeframe, P/L Amount, Actual R:R, Outcome) are optional but recommended.

## 📞 Support

If you encounter any issues:
1. Check this guide first
2. Verify the migration was run successfully
3. Check the browser console for errors (F12)
4. Ensure the development server is running

---

## 🎉 You're All Set!

Your Trading Journal is ready to use with all the new features. Happy trading! 📈
