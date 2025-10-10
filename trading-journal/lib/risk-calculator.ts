/**
 * Risk Management Calculation Utilities
 * Position sizing, risk metrics, and money management
 */

import type { Trade } from '@/types/supabase'

export interface PositionSizeCalculation {
  positionSize: number
  riskAmount: number
  stopDistance: number
  lotSize: number
  unitsPerLot: number
  maxLoss: number
}

export interface RiskMetrics {
  currentDrawdown: number
  currentDrawdownPercent: number
  accountBalance: number
  accountEquity: number
  dailyRiskUsed: number
  dailyRiskRemaining: number
  weeklyRiskUsed: number
  weeklyRiskRemaining: number
  monthlyRiskUsed: number
  monthlyRiskRemaining: number
  consecutiveLosses: number
  averageRiskPerTrade: number
  largestLoss: number
  openPositionsRisk: number
}

export interface RiskRule {
  id: string
  name: string
  description: string
  type: 'hard_limit' | 'soft_limit' | 'warning'
  status: 'ok' | 'warning' | 'violated'
  current: number
  limit: number
  unit: string
}

export interface RiskSettings {
  maxRiskPerTrade: number
  maxDailyRisk: number
  maxWeeklyRisk: number
  maxMonthlyRisk: number
  maxDrawdown: number
  maxConsecutiveLosses: number
  maxOpenPositions: number
  maxCorrelatedPositions: number
  stopLossBuffer: number
  riskRewardMinimum: number
}

/**
 * Calculate position size based on account risk
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  pipValue: number = 10, // USD value per pip for 1 standard lot
  symbol: string = 'EURUSD'
): PositionSizeCalculation {
  const riskAmount = accountBalance * (riskPercent / 100)
  const stopDistance = Math.abs(entryPrice - stopLoss)

  // Calculate pips (depends on symbol)
  let pips: number
  if (symbol.includes('JPY')) {
    pips = stopDistance * 100 // For JPY pairs
  } else if (symbol.includes('XAU') || symbol.includes('GOLD')) {
    pips = stopDistance / 0.1 // For Gold
  } else {
    pips = stopDistance * 10000 // For standard FX pairs
  }

  // Calculate lot size
  const lotSize = pips > 0 ? riskAmount / (pips * pipValue) : 0
  const positionSize = lotSize * 100000 // Standard lot = 100,000 units

  return {
    positionSize,
    riskAmount,
    stopDistance,
    lotSize,
    unitsPerLot: 100000,
    maxLoss: riskAmount,
  }
}

/**
 * Calculate Kelly Criterion for optimal position sizing
 */
export function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0) return 0

  const winProb = winRate / 100
  const lossProb = 1 - winProb
  const winLossRatio = avgWin / avgLoss

  const kelly = (winProb * winLossRatio - lossProb) / winLossRatio

  // Return fractional kelly (typically use 25-50% of kelly)
  return Math.max(0, Math.min(kelly * 0.25, 0.05)) // Cap at 5% for safety
}

/**
 * Calculate current risk metrics from trades
 */
export function calculateRiskMetrics(
  trades: Trade[],
  accountBalance: number,
  settings: RiskSettings
): RiskMetrics {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const closedTrades = trades.filter((t) => t.closed_at)
  const openTrades = trades.filter((t) => !t.closed_at)

  // Calculate current equity
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const accountEquity = accountBalance + totalPnL

  // Find peak equity
  let peak = accountBalance
  let currentEquity = accountBalance
  const sortedTrades = [...closedTrades].sort(
    (a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime()
  )

  sortedTrades.forEach((trade) => {
    currentEquity += trade.pnl || 0
    if (currentEquity > peak) {
      peak = currentEquity
    }
  })

  const currentDrawdown = peak - accountEquity
  const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0

  // Daily risk
  const todayTrades = closedTrades.filter((t) => t.closed_at?.startsWith(today))
  const dailyLoss = todayTrades
    .filter((t) => (t.r_multiple || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0)
  const dailyRiskUsed = dailyLoss * (accountBalance * 0.01) // Assuming 1% per R
  const dailyRiskRemaining = Math.max(
    0,
    accountBalance * (settings.maxDailyRisk / 100) - dailyRiskUsed
  )

  // Weekly risk
  const weekTrades = closedTrades.filter((t) => new Date(t.closed_at!) > oneWeekAgo)
  const weeklyLoss = weekTrades
    .filter((t) => (t.r_multiple || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0)
  const weeklyRiskUsed = weeklyLoss * (accountBalance * 0.01)
  const weeklyRiskRemaining = Math.max(
    0,
    accountBalance * (settings.maxWeeklyRisk / 100) - weeklyRiskUsed
  )

  // Monthly risk
  const monthTrades = closedTrades.filter((t) => new Date(t.closed_at!) > oneMonthAgo)
  const monthlyLoss = monthTrades
    .filter((t) => (t.r_multiple || 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0)
  const monthlyRiskUsed = monthlyLoss * (accountBalance * 0.01)
  const monthlyRiskRemaining = Math.max(
    0,
    accountBalance * (settings.maxMonthlyRisk / 100) - monthlyRiskUsed
  )

  // Consecutive losses
  let consecutiveLosses = 0
  let currentStreak = 0
  const recentTrades = [...closedTrades].reverse()

  for (const trade of recentTrades) {
    if ((trade.r_multiple || 0) < 0) {
      currentStreak++
    } else {
      break
    }
  }
  consecutiveLosses = currentStreak

  // Average risk per trade
  const averageRiskPerTrade =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0) / closedTrades.length
      : 0

  // Largest loss
  const losses = closedTrades.filter((t) => (t.r_multiple || 0) < 0)
  const largestLoss =
    losses.length > 0 ? Math.min(...losses.map((t) => t.r_multiple || 0)) : 0

  // Open positions risk
  const openPositionsRisk = openTrades.reduce((sum, t) => sum + (t.risk_r || 1), 0)

  return {
    currentDrawdown,
    currentDrawdownPercent,
    accountBalance,
    accountEquity,
    dailyRiskUsed,
    dailyRiskRemaining,
    weeklyRiskUsed,
    weeklyRiskRemaining,
    monthlyRiskUsed,
    monthlyRiskRemaining,
    consecutiveLosses,
    averageRiskPerTrade,
    largestLoss,
    openPositionsRisk,
  }
}

/**
 * Evaluate risk rules and generate warnings
 */
export function evaluateRiskRules(
  metrics: RiskMetrics,
  settings: RiskSettings,
  openPositions: number
): RiskRule[] {
  const rules: RiskRule[] = []

  // Daily risk rule
  const dailyRiskPercent = (metrics.dailyRiskUsed / metrics.accountBalance) * 100
  rules.push({
    id: 'daily-risk',
    name: 'Daily Risk Limit',
    description: 'Maximum risk allowed per day',
    type: dailyRiskPercent >= settings.maxDailyRisk ? 'hard_limit' : dailyRiskPercent >= settings.maxDailyRisk * 0.8 ? 'warning' : 'soft_limit',
    status:
      dailyRiskPercent >= settings.maxDailyRisk
        ? 'violated'
        : dailyRiskPercent >= settings.maxDailyRisk * 0.8
          ? 'warning'
          : 'ok',
    current: dailyRiskPercent,
    limit: settings.maxDailyRisk,
    unit: '%',
  })

  // Weekly risk rule
  const weeklyRiskPercent = (metrics.weeklyRiskUsed / metrics.accountBalance) * 100
  rules.push({
    id: 'weekly-risk',
    name: 'Weekly Risk Limit',
    description: 'Maximum risk allowed per week',
    type: weeklyRiskPercent >= settings.maxWeeklyRisk ? 'hard_limit' : weeklyRiskPercent >= settings.maxWeeklyRisk * 0.8 ? 'warning' : 'soft_limit',
    status:
      weeklyRiskPercent >= settings.maxWeeklyRisk
        ? 'violated'
        : weeklyRiskPercent >= settings.maxWeeklyRisk * 0.8
          ? 'warning'
          : 'ok',
    current: weeklyRiskPercent,
    limit: settings.maxWeeklyRisk,
    unit: '%',
  })

  // Monthly risk rule
  const monthlyRiskPercent = (metrics.monthlyRiskUsed / metrics.accountBalance) * 100
  rules.push({
    id: 'monthly-risk',
    name: 'Monthly Risk Limit',
    description: 'Maximum risk allowed per month',
    type: monthlyRiskPercent >= settings.maxMonthlyRisk ? 'hard_limit' : monthlyRiskPercent >= settings.maxMonthlyRisk * 0.8 ? 'warning' : 'soft_limit',
    status:
      monthlyRiskPercent >= settings.maxMonthlyRisk
        ? 'violated'
        : monthlyRiskPercent >= settings.maxMonthlyRisk * 0.8
          ? 'warning'
          : 'ok',
    current: monthlyRiskPercent,
    limit: settings.maxMonthlyRisk,
    unit: '%',
  })

  // Drawdown rule
  rules.push({
    id: 'max-drawdown',
    name: 'Maximum Drawdown',
    description: 'Maximum allowed equity decline',
    type: metrics.currentDrawdownPercent >= settings.maxDrawdown ? 'hard_limit' : metrics.currentDrawdownPercent >= settings.maxDrawdown * 0.8 ? 'warning' : 'soft_limit',
    status:
      metrics.currentDrawdownPercent >= settings.maxDrawdown
        ? 'violated'
        : metrics.currentDrawdownPercent >= settings.maxDrawdown * 0.8
          ? 'warning'
          : 'ok',
    current: metrics.currentDrawdownPercent,
    limit: settings.maxDrawdown,
    unit: '%',
  })

  // Consecutive losses rule
  rules.push({
    id: 'consecutive-losses',
    name: 'Consecutive Losses',
    description: 'Maximum consecutive losing trades',
    type: metrics.consecutiveLosses >= settings.maxConsecutiveLosses ? 'hard_limit' : metrics.consecutiveLosses >= settings.maxConsecutiveLosses * 0.8 ? 'warning' : 'soft_limit',
    status:
      metrics.consecutiveLosses >= settings.maxConsecutiveLosses
        ? 'violated'
        : metrics.consecutiveLosses >= settings.maxConsecutiveLosses * 0.8
          ? 'warning'
          : 'ok',
    current: metrics.consecutiveLosses,
    limit: settings.maxConsecutiveLosses,
    unit: 'trades',
  })

  // Open positions rule
  rules.push({
    id: 'open-positions',
    name: 'Open Positions',
    description: 'Maximum number of open positions',
    type: openPositions >= settings.maxOpenPositions ? 'hard_limit' : openPositions >= settings.maxOpenPositions * 0.8 ? 'warning' : 'soft_limit',
    status:
      openPositions >= settings.maxOpenPositions
        ? 'violated'
        : openPositions >= settings.maxOpenPositions * 0.8
          ? 'warning'
          : 'ok',
    current: openPositions,
    limit: settings.maxOpenPositions,
    unit: 'positions',
  })

  return rules
}

/**
 * Calculate optimal position size based on Kelly Criterion
 */
export function calculateOptimalPositionSize(
  trades: Trade[],
  accountBalance: number
): { kelly: number; fractionalKelly: number; suggestedRisk: number } {
  const closedTrades = trades.filter((t) => t.closed_at && t.r_multiple !== null)

  if (closedTrades.length < 30) {
    return {
      kelly: 0,
      fractionalKelly: 0,
      suggestedRisk: 1, // Default to 1% if not enough data
    }
  }

  const wins = closedTrades.filter((t) => (t.r_multiple || 0) > 0)
  const losses = closedTrades.filter((t) => (t.r_multiple || 0) < 0)

  const winRate = (wins.length / closedTrades.length) * 100
  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0) / wins.length
      : 0
  const avgLoss =
    losses.length > 0
      ? losses.reduce((sum, t) => sum + Math.abs(t.r_multiple || 0), 0) / losses.length
      : 0

  const kelly = calculateKellyCriterion(winRate, avgWin, avgLoss)
  const fractionalKelly = kelly * 0.5 // Use half-Kelly for safety

  return {
    kelly: kelly * 100,
    fractionalKelly: fractionalKelly * 100,
    suggestedRisk: Math.min(fractionalKelly * 100, 2), // Cap at 2%
  }
}

/**
 * Calculate risk-reward ratio
 */
export function calculateRiskReward(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): number {
  const risk = Math.abs(entryPrice - stopLoss)
  const reward = Math.abs(takeProfit - entryPrice)

  return risk > 0 ? reward / risk : 0
}

/**
 * Validate if trade meets risk requirements
 */
export function validateTradeRisk(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  positionSize: number,
  accountBalance: number,
  settings: RiskSettings
): { valid: boolean; violations: string[] } {
  const violations: string[] = []

  // Check risk-reward ratio
  const rr = calculateRiskReward(entryPrice, stopLoss, takeProfit)
  if (rr < settings.riskRewardMinimum) {
    violations.push(
      `Risk-reward ratio ${rr.toFixed(2)} is below minimum ${settings.riskRewardMinimum}`
    )
  }

  // Check position size doesn't exceed max risk
  const stopDistance = Math.abs(entryPrice - stopLoss)
  const potentialLoss = stopDistance * positionSize
  const riskPercent = (potentialLoss / accountBalance) * 100

  if (riskPercent > settings.maxRiskPerTrade) {
    violations.push(
      `Position risk ${riskPercent.toFixed(2)}% exceeds maximum ${settings.maxRiskPerTrade}%`
    )
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}
