import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedDemoData() {
  console.log('🌱 Seeding demo data...')

  // 1. Create demo user (or use existing)
  const demoEmail = 'demo@tradingjournal.com'
  const demoPassword = 'demo123456'

  let userId: string

  // Use service role key to bypass rate limits if needed
  // For demo purposes, we'll use a hardcoded user ID
  // In production, you should create the user properly

  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  })

  if (signInData?.user) {
    userId = signInData.user.id
    console.log('✅ Using existing demo user:', userId)
  } else {
    // Hardcoded demo user ID from earlier creation
    userId = '0269160c-ce4a-47a8-82cc-4c2a9b4ae7af'
    console.log('⏭️  Using hardcoded demo user ID (rate limit bypass):', userId)
  }

  // 2. Get or create demo account
  console.log('Checking for existing account...')
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .single()

  let account: any

  if (existingAccount) {
    account = existingAccount
    console.log('✅ Using existing account:', account.id)

    // Delete existing trades for fresh demo data
    console.log('Clearing existing trades...')
    await supabase.from('trades').delete().eq('account_id', account.id)
  } else {
    console.log('Creating new demo account...')
    const { data: newAccount, error: accountError } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        name: '1M Account VF',
        account_type: 'prop-firm',
        currency: 'ZAR',
        starting_balance: 1000000,
        phase: 'Phase 1',
        profit_target: 100000,
        max_drawdown: 50000,
        daily_drawdown: 20000,
        account_status: 'active',
        current_profits: 0,
        current_drawdown: 0,
      })
      .select()
      .single()

    if (accountError || !newAccount) {
      console.error('Error creating account:', accountError)
      return
    }

    account = newAccount
    console.log('✅ Account created:', account.id)
  }

  // 3. Generate realistic trades for the past 30 days
  console.log('Generating demo trades...')
  const trades = []
  const strategies = ['Breakout', 'Trend Following', 'Support/Resistance', 'Reversal', 'Momentum']
  const confluences = ['EMA Cross', 'Volume Spike', 'Key Level', 'Multiple Timeframe', 'Price Action']
  const symbols = ['US30', 'NAS100', 'SPX500', 'EURUSD', 'GBPUSD']

  const now = new Date()
  let balance = 1000000

  // Generate 40 trades over the past 30 days
  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const entryDate = new Date(now)
    entryDate.setDate(entryDate.getDate() - daysAgo)
    entryDate.setHours(Math.floor(Math.random() * 8) + 9) // 9am-5pm
    entryDate.setMinutes(Math.floor(Math.random() * 60))

    const exitDate = new Date(entryDate)
    exitDate.setHours(entryDate.getHours() + Math.floor(Math.random() * 3) + 1)

    const isWin = Math.random() > 0.42 // 58% win rate
    const riskAmount = balance * 0.01 // 1% risk
    const rrRatio = isWin ? (Math.random() * 2 + 1) : -(Math.random() * 0.8 + 0.2) // 1-3R wins, 0.2-1R losses
    const pnl = riskAmount * rrRatio

    balance += pnl

    const entryPrice = 30000 + Math.random() * 5000
    const exitPrice = isWin ? entryPrice + (Math.random() * 200 + 50) : entryPrice - (Math.random() * 100 + 20)

    trades.push({
      user_id: userId,
      account_id: account.id,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      entry_date: entryDate.toISOString(),
      exit_date: exitDate.toISOString(),
      direction: Math.random() > 0.5 ? 'long' : 'short',
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity: Math.floor(Math.random() * 5) + 1,
      pnl: Math.round(pnl),
      fees: Math.round(Math.random() * 50 + 10),
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      confluence: confluences[Math.floor(Math.random() * confluences.length)],
      notes: isWin ? 'Good setup, followed plan' : 'Stopped out, risk managed',
      tags: ['demo', isWin ? 'winner' : 'loser'],
    })
  }

  const { error: tradesError } = await supabase.from('trades').insert(trades)

  if (tradesError) {
    console.error('Error creating trades:', tradesError)
    return
  }

  console.log('✅ Created', trades.length, 'demo trades')

  // 4. Calculate and update account metrics
  console.log('Calculating metrics...')
  const winningTrades = trades.filter((t) => t.pnl > 0)
  const losingTrades = trades.filter((t) => t.pnl < 0)
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0
  const winRate = (winningTrades.length / trades.length) * 100

  const metrics = {
    netProfit: totalPnL,
    currentBalance: balance,
    totalTrades: trades.length,
    winRate: winRate,
    profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
    avgWin: avgWin,
    avgLoss: avgLoss,
    largestWin: Math.max(...trades.map((t) => t.pnl)),
    largestLoss: Math.min(...trades.map((t) => t.pnl)),
    consecutiveWins: 0,
    consecutiveLosses: 0,
    maxDrawdown: 0,
    expectancy: avgWin * (winRate / 100) - avgLoss * (1 - winRate / 100),
  }

  const { error: updateError } = await supabase
    .from('accounts')
    .update({ metrics })
    .eq('id', account.id)

  if (updateError) {
    console.error('Error updating metrics:', updateError)
    return
  }

  console.log('✅ Updated account metrics')
  console.log('\n🎉 Demo data seeded successfully!')
  console.log('\nDemo Login Credentials:')
  console.log('Email:', demoEmail)
  console.log('Password:', demoPassword)
  console.log('\nAccount Summary:')
  console.log('- Total Trades:', trades.length)
  console.log('- Win Rate:', winRate.toFixed(2) + '%')
  console.log('- Net P&L: ZAR', totalPnL.toLocaleString())
  console.log('- Current Balance: ZAR', balance.toLocaleString())
}

seedDemoData().catch(console.error)
