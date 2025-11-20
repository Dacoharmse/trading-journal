# Risk Management System - Implementation Guide

## Overview

Your Trading Journal now has a comprehensive risk management system that allows you to:
- Set risk limits per account (percentage or monetary value)
- Get warnings when exceeding risk limits during trade recording
- Require and log reasons for exceeding risk limits
- Track all risk violations with an audit trail

## 🎯 Features Implemented

### 1. **Account Risk Limits**
Each trading account can now have customized risk management settings:

- **Risk Limit Type**: Choose between:
  - **Percentage**: Risk as % of account balance (e.g., 2% = $200 on $10,000 account)
  - **Monetary**: Fixed amount in account currency (e.g., $500 USD or R1000 ZAR)

- **Risk Limit Value**: The actual limit amount (e.g., 2.0 for 2% or 500 for $500)

- **Session Risk Enabled**: Toggle to enable/disable risk limit enforcement

### 2. **Risk Warning Dialog**
When recording a trade that exceeds your risk limits, you'll see a professional warning dialog showing:

- Your configured risk limit
- The amount you're attempting to risk
- How much you're exceeding the limit by (amount and percentage)
- A required text field to provide a reason for the override

**The system will NOT let you proceed without providing a detailed reason!**

### 3. **Risk Violations Audit Trail**
All risk limit overrides are logged in the database with:
- Timestamp
- Account and trade information
- Risk limit that was exceeded
- Actual risk taken
- Your reason for the override

This creates a complete audit trail for reviewing your risk discipline.

## 📊 Database Changes

### New Columns in `accounts` Table
```sql
- risk_limit_type (TEXT): 'percentage' or 'monetary'
- risk_limit_value (NUMERIC): The limit amount
- session_risk_enabled (BOOLEAN): Whether to enforce limits
```

### New `risk_violations` Table
Tracks all instances where you exceeded risk limits:
```sql
- id (UUID)
- user_id (UUID)
- account_id (UUID)
- trade_id (UUID)
- violation_type (TEXT): 'session_limit', 'daily_limit', 'position_size'
- risk_limit (NUMERIC)
- actual_risk (NUMERIC)
- limit_type (TEXT): 'percentage' or 'monetary'
- reason (TEXT): Your explanation
- override_approved (BOOLEAN)
- created_at (TIMESTAMP)
```

## 🚀 How to Use

### Step 1: Run the Database Migration

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `dcodkkmamshucctkywbf`

2. **Open SQL Editor:**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration:**
   - Open the file: `migration-add-risk-limits.sql`
   - Copy the entire contents
   - Paste it into the Supabase SQL Editor
   - Click **Run** (or press Ctrl+Enter)

4. **Verify Success:**
   - You should see: "Success. No rows returned"

### Step 2: Configure Account Risk Limits

1. **Navigate to Accounts Page**
   - Click "Accounts" in the sidebar
   - Either create a new account or click "Edit" on an existing account

2. **Scroll to "Risk Management Settings"**
   You'll see three new fields:

   - **Risk Limit Type**: Choose "Percentage of Balance" or "Fixed Amount"
   - **Risk Limit Value**: Enter your limit (e.g., 2.0 for 2% or 500 for $500)
   - **Enable session-based risk limits**: Toggle ON to enforce

3. **Save the Account**
   - Click "Add Account" or "Update Account" button

### Step 3: Record Trades with Risk Protection

1. **Record a Trade Normally**
   - Click "New Trade" in the sidebar
   - Fill in all trade details as usual

2. **If You Exceed Your Risk Limit**
   A warning dialog will appear showing:
   - Your risk limit (e.g., 2.0%)
   - What you're attempting to risk (e.g., 3.5%)
   - How much you're over by (e.g., 1.5% - 75% over limit)

3. **Provide a Reason**
   - You MUST enter a detailed reason (minimum 10 characters)
   - Example reasons:
     - "Exceptional setup with 1:5 R:R on HTF confirmation and strong fundamentals"
     - "NFP news trade with clear invalidation and wider stop required"
     - "Multiple confluence zones aligned on daily + 4H timeframes"

4. **Choose Your Action**
   - **Cancel Trade**: Go back and adjust your risk
   - **Proceed Anyway**: Save the trade with the violation reason logged

## 📖 Example Workflows

### Example 1: Setting Up Risk Limits

**Scenario**: You have a $10,000 live account and want to risk max 2% per session.

**Steps**:
1. Go to Accounts page
2. Click "Edit" on your live account
3. Scroll to "Risk Management Settings"
4. Set **Risk Limit Type** to "Percentage of Balance"
5. Set **Risk Limit Value** to "2.0"
6. Toggle **Enable session-based risk limits** to ON
7. Click "Update Account"

**Result**: You can now risk up to $200 per session (2% of $10,000).

### Example 2: Recording a Normal Trade

**Scenario**: Recording a trade with 1% risk (within your 2% limit).

**Steps**:
1. Click "New Trade"
2. Fill in trade details
3. Set **Risk (R)** to "1.0"
4. Click "Save Trade"

**Result**: Trade saved without any warnings.

### Example 3: Exceeding Risk Limit

**Scenario**: You want to risk 2.5% (exceeding your 2% limit).

**Steps**:
1. Click "New Trade"
2. Fill in trade details
3. Set **Risk (R)** to "2.5"
4. Click "Save Trade"

**Result**: Warning dialog appears!

**Dialog shows**:
```
Risk Limit Exceeded
Session Risk Limit for Main Live Account

Your Risk Limit: 2.00%
Attempting to Risk: 2.50%
Exceeded By: 0.50% (25% over limit)
```

**You must provide a reason**:
```
Reason for Exceeding Risk Limit *
[Text box with minimum 10 characters]

Example: "High-probability breakout setup with exceptional
R:R ratio and multiple confirmations on HTF. Price at key
support with bullish divergence on daily chart."
```

**Choose**:
- **Cancel Trade**: Go back and change risk to 2% or less
- **Proceed Anyway**: Save with reason logged

## 🔍 Viewing Risk Violations

Currently, risk violations are stored in the database. You can view them:

### Option 1: Supabase Dashboard
1. Go to your Supabase Dashboard
2. Click "Table Editor"
3. Select "risk_violations" table
4. View all your violations with reasons

### Option 2: SQL Query
```sql
SELECT
  created_at,
  violation_type,
  risk_limit,
  actual_risk,
  limit_type,
  reason
FROM risk_violations
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

## ⚙️ Configuration Options

### Risk Limit Types

#### Percentage of Balance
- **Best for**: Accounts with variable balance
- **Calculation**: `risk_amount = (percentage / 100) * account_balance`
- **Example**: 2% of $10,000 = $200 max risk

#### Fixed Monetary Amount
- **Best for**: Prop firms with fixed risk rules
- **Calculation**: `risk_amount = fixed_amount`
- **Example**: $500 max risk regardless of balance

### Violation Types

Currently implemented:
- **session_limit**: Daily/session risk exceeded

Future support:
- **daily_limit**: Total daily risk across multiple sessions
- **position_size**: Individual position too large

## 🛠️ Technical Details

### Files Modified

#### Database Schema
- `migration-add-risk-limits.sql` - New migration script
- `lib/db-schema.sql` - Updated with new fields (for reference)

#### Type Definitions
- `types/supabase.ts` - Added RiskViolation interface and updated Account
- `types/account.ts` - Added risk limit fields to TradingAccount

#### Components
- `components/risk-management/RiskWarningDialog.tsx` - NEW: Warning dialog
- `components/trades/NewTradeSheet.tsx` - Added risk validation logic
- `app/accounts/page.tsx` - Added risk limit configuration UI

### How It Works

1. **When you configure an account**:
   - Risk settings are saved to the `accounts` table
   - Type, value, and enabled flag are stored

2. **When you record a trade**:
   - System checks if `session_risk_enabled` is true
   - Fetches today's trades for that account
   - Calculates total risk (existing + new trade)
   - Compares against risk limit
   - If exceeded, shows warning dialog

3. **When you proceed with violation**:
   - Trade is saved normally
   - Violation record is created in `risk_violations` table
   - Includes your reason, timestamps, and amounts

### Risk Calculation Logic

```typescript
// For percentage-based limits
const todayRiskSum = sum of risk_r for today's trades
const newTradeRisk = trade.risk_r
const totalRisk = todayRiskSum + newTradeRisk
const limit = account.riskLimitValue  // e.g., 2.0

if (totalRisk > limit) {
  // Show warning
}
```

## 📝 Best Practices

### Setting Risk Limits

1. **Start Conservative**: Begin with 1-2% per session
2. **Match Your Strategy**: Scalpers might use 1%, swingers 2-3%
3. **Consider Account Type**:
   - Live accounts: 1-2%
   - Demo accounts: 2-5% (for learning)
   - Prop firms: Follow their rules (usually 0.5-1%)

### Providing Violation Reasons

**Good Reasons** (detailed and specific):
- ✅ "Exceptional NFP setup with clear 1:3 R:R, multiple HTF confluences, and tight stop at key level"
- ✅ "End of month target push - price at yearly support with bullish divergence on daily + weekly"
- ✅ "High-conviction breakout above 6-month resistance with volume confirmation"

**Bad Reasons** (vague or emotional):
- ❌ "Good setup"
- ❌ "Feeling confident"
- ❌ "Trying to make back losses"
- ❌ "YOLO"

### Reviewing Violations

**Weekly Review**:
1. Check your `risk_violations` table
2. Count how many times you exceeded limits
3. Read your reasons - were they actually valid?
4. Were the violation trades profitable?

**Questions to Ask**:
- Did I exceed limits more than 10% of the time?
- Were my reasons legitimate or excuses?
- Should I adjust my limits?
- Do I have a discipline problem?

## 🐛 Troubleshooting

### Warning Not Showing

**Problem**: Risk warning dialog doesn't appear when it should.

**Solutions**:
1. Check that `session_risk_enabled` is ON for the account
2. Verify `risk_limit_value` is set correctly
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Check browser console for errors (F12)

### Migration Failed

**Problem**: Error running migration script.

**Solutions**:
1. Check if columns already exist: `SELECT * FROM accounts LIMIT 1`
2. If columns exist, migration was already run
3. If error persists, check connection to Supabase

### Risk Calculation Incorrect

**Problem**: Total risk shown doesn't match expected.

**Solutions**:
1. Check what timezone your `entry_date` is in
2. Verify other trades recorded today
3. Check if account currency matches
4. For percentage: verify `initial_balance` in account

## 💡 Future Enhancements

Potential improvements for the future:

1. **Weekly/Monthly Limits**: Track risk over longer periods
2. **Position Correlation**: Limit correlated positions (EUR/USD + GBP/USD)
3. **Streak Protection**: Stricter limits after consecutive losses
4. **Risk Dashboard**: Visual analytics of your risk usage
5. **Auto-adjust Limits**: Reduce limits after hitting max drawdown
6. **Custom Violation Types**: Create your own risk rules

## 📞 Support

If you encounter any issues:

1. Check this guide first
2. Verify the migration was run successfully
3. Check browser console for errors (F12)
4. Ensure Supabase connection is active

---

## 🎉 You're All Set!

Your Trading Journal now has professional-grade risk management!

Remember:
- ⚡ Set your risk limits in Accounts page
- 🛡️ System will warn you when exceeding limits
- 📝 Always provide thoughtful reasons for overrides
- 📊 Review your violations regularly to maintain discipline

**Happy trading! May your risk be controlled and your profits be plenty! 📈**
