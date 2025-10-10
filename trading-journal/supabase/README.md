# Supabase Database Setup

This directory contains the database schema for the Trading Journal application.

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard at https://supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `schema.sql` and paste it into the editor
5. Click **Run** to execute the SQL

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the trading-journal directory
cd /path/to/trading-journal

# Run the migration
supabase db push
```

## What Gets Created

The schema creates:

### Tables

1. **accounts** - Trading accounts (live, demo, prop-firm, paper)
   - Stores account details, balances, and prop firm settings
   - Protected by Row Level Security (RLS) policies

2. **user_profiles** (updated) - User profiles and preferences
   - Adds `confluences` column for storing trading confluences

### Indexes

- Fast lookups by user_id, account_type, and is_active

### Row Level Security

All tables have RLS enabled with policies that ensure:
- Users can only view their own data
- Users can insert, update, and delete their own records
- Data is isolated per user

### Functions

- `calculate_account_balance()` - Automatically calculates account balance based on starting balance and trade P&L
- `update_updated_at_column()` - Automatically updates the `updated_at` timestamp

## Verifying the Setup

After running the schema, verify everything is set up correctly:

1. Go to **Table Editor** in Supabase dashboard
2. You should see:
   - `accounts` table
   - `user_profiles` table with `confluences` column
   - `trades` table (should already exist)

3. Go to **Database** → **Policies**
4. Verify RLS policies are enabled for the `accounts` table

## Development Mode

The application will work in **local development mode** without authentication:
- Uses a local user ID: `local-user`
- Data is synced to localStorage for offline development
- When you authenticate with Supabase, data will automatically sync to the database

## Production Mode

When deployed with Supabase authentication:
- All data is stored in Supabase
- Row Level Security ensures data privacy
- Real-time subscriptions keep data in sync across devices
