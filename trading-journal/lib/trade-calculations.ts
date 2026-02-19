/**
 * Unified Trade Calculation Functions
 * Consolidated from trades-selectors.ts and trade-stats.ts
 * Single source of truth for all trade calculations
 */

import { Trade } from '@/types/supabase'

/**
 * Calculate R-multiple for a trade
 * R = ((exit - entry) / (entry - stop)) * direction
 * @param trade - Trade object from database
 * @returns R-multiple or null if insufficient data
 */
export function calculateR(trade: Trade): number | null {
  // Check for required fields - handle both stop_loss and stop_price
  const stopPrice = trade.stop_price
  if (!trade.entry_price || !stopPrice || !trade.exit_price) {
    // Fallback: if r_multiple is pre-calculated in DB, use it
    return trade.r_multiple ?? null
  }

  const risk = Math.abs(trade.entry_price - stopPrice)
  if (risk === 0) return null

  const pnl = trade.exit_price - trade.entry_price
  const direction = trade.direction === 'long' ? 1 : -1

  return Number(((pnl / risk) * direction).toFixed(2))
}

/**
 * Calculate expectancy (mean R) from array of trades
 * @param trades - Array of trades
 * @returns Average R-multiple or null if no valid trades
 */
export function calculateExpectancyR(trades: Trade[]): number {
  const rValues = trades
    .map(calculateR)
    .filter((r): r is number => r !== null)

  if (rValues.length === 0) return 0

  const sum = rValues.reduce((acc, r) => acc + r, 0)
  return Number((sum / rValues.length).toFixed(2))
}

/**
 * Calculate Net R (sum of all R values)
 * @param trades - Array of trades
 * @returns Total R-multiple
 */
export function calculateNetR(trades: Trade[]): number {
  const rValues = trades
    .map(calculateR)
    .filter((r): r is number => r !== null)

  const sum = rValues.reduce((acc, r) => acc + r, 0)
  return Number(sum.toFixed(2))
}

/**
 * Calculate total R
 * @param trades - Array of trades
 * @returns Total R-multiple (alias for calculateNetR)
 */
export function calculateTotalR(trades: Trade[]): number {
  return calculateNetR(trades)
}

/**
 * Calculate win rate from array of trades
 * @param trades - Array of trades
 * @returns Win rate as percentage (0-100) or null if no valid trades
 */
export function calculateWinRate(trades: Trade[]): number | null {
  const rValues = trades.map(calculateR).filter((r): r is number => r !== null)

  if (rValues.length === 0) return null

  const wins = rValues.filter(r => r > 0).length
  return Number(((wins / rValues.length) * 100).toFixed(2))
}

/**
 * Calculate profit factor from array of trades (in R)
 * @param trades - Array of trades
 * @returns Profit factor or null if no losses
 */
export function calculateProfitFactor(trades: Trade[]): number | null {
  let totalWins = 0
  let totalLosses = 0

  trades.forEach(trade => {
    const r = calculateR(trade)
    if (r === null) return

    if (r > 0) totalWins += r
    else if (r < 0) totalLosses += Math.abs(r)
  })

  if (totalLosses === 0) return totalWins > 0 ? Infinity : null
  return Number((totalWins / totalLosses).toFixed(2))
}

/**
 * Calculate Sharpe Ratio in R
 * Sharpe = (mean(R) / stdev(R)) * sqrt(N)
 * @param trades - Array of trades
 * @returns Sharpe ratio or null if insufficient data
 */
export function calculateSharpeR(trades: Trade[]): number | null {
  const rValues = trades
    .map(calculateR)
    .filter((r): r is number => r !== null)

  if (rValues.length < 2) return null

  const mean = rValues.reduce((acc, r) => acc + r, 0) / rValues.length
  const variance = rValues.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / rValues.length
  const stdev = Math.sqrt(variance)

  if (stdev === 0) return null

  const sharpe = (mean / stdev) * Math.sqrt(rValues.length)
  return Number(sharpe.toFixed(2))
}

/**
 * Calculate Sortino Ratio in R
 * Sortino = (mean(R) / downside_stdev(R)) * sqrt(N)
 * @param trades - Array of trades
 * @returns Sortino ratio or null if insufficient data
 */
export function calculateSortinoR(trades: Trade[]): number | null {
  const rValues = trades
    .map(calculateR)
    .filter((r): r is number => r !== null)

  if (rValues.length < 2) return null

  const mean = rValues.reduce((acc, r) => acc + r, 0) / rValues.length
  const downsideValues = rValues.filter(r => r < 0)

  if (downsideValues.length === 0) return null

  const downsideVariance = downsideValues.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideValues.length
  const downsideStdev = Math.sqrt(downsideVariance)

  if (downsideStdev === 0) return null

  const sortino = (mean / downsideStdev) * Math.sqrt(rValues.length)
  return Number(sortino.toFixed(2))
}

/**
 * Calculate Maximum Drawdown in R
 * @param trades - Array of trades
 * @returns Object with max drawdown info
 */
export function calculateMaxDrawdownR(trades: Trade[]): {
  maxDrawdownR: number
  maxDrawdownCurrency: number
  peakIndex: number
  troughIndex: number
  peakDate: string | null
  troughDate: string | null
} {
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.exit_date || a.entry_date).getTime()
    const dateB = new Date(b.exit_date || b.entry_date).getTime()
    return dateA - dateB
  })

  let cumulativeR = 0
  let cumulativeCurrency = 0
  let peakR = 0
  let peakCurrency = 0
  let maxDrawdownR = 0
  let maxDrawdownCurrency = 0
  let peakIndex = 0
  let troughIndex = 0
  let peakDate: string | null = null
  let troughDate: string | null = null

  sortedTrades.forEach((trade, index) => {
    const r = calculateR(trade) || 0
    cumulativeR += r
    cumulativeCurrency += trade.pnl

    if (cumulativeR > peakR) {
      peakR = cumulativeR
      peakIndex = index
      peakDate = new Date(trade.exit_date || trade.entry_date).toISOString()
    }

    if (cumulativeCurrency > peakCurrency) {
      peakCurrency = cumulativeCurrency
    }

    const drawdownR = peakR - cumulativeR
    const drawdownCurrency = peakCurrency - cumulativeCurrency

    if (drawdownR > maxDrawdownR) {
      maxDrawdownR = drawdownR
      troughIndex = index
      troughDate = new Date(trade.exit_date || trade.entry_date).toISOString()
    }

    if (drawdownCurrency > maxDrawdownCurrency) {
      maxDrawdownCurrency = drawdownCurrency
    }
  })

  return {
    maxDrawdownR: Number(maxDrawdownR.toFixed(2)),
    maxDrawdownCurrency: Number(maxDrawdownCurrency.toFixed(2)),
    peakIndex,
    troughIndex,
    peakDate,
    troughDate,
  }
}

/**
 * Calculate Recovery Factor in R
 * Recovery Factor = Net R / |Max Drawdown R|
 * @param trades - Array of trades
 * @returns Recovery factor
 */
export function calculateRecoveryFactorR(trades: Trade[]): number {
  const netR = calculateNetR(trades)
  const { maxDrawdownR } = calculateMaxDrawdownR(trades)

  if (maxDrawdownR === 0) return 0

  return Number((netR / Math.abs(maxDrawdownR)).toFixed(2))
}

/**
 * Calculate Day Win Percentage
 * Percentage of days with positive net P&L
 * @param trades - Array of trades
 * @returns Day win percentage (0-100)
 */
export function calculateDayWinPct(trades: Trade[]): number {
  const dailyPnL = new Map<string, number>()

  trades.forEach((trade) => {
    const date = new Date(trade.exit_date || trade.entry_date)
    const key = date.toISOString().slice(0, 10)
    const current = dailyPnL.get(key) || 0
    dailyPnL.set(key, current + trade.pnl)
  })

  if (dailyPnL.size === 0) return 0

  const greenDays = Array.from(dailyPnL.values()).filter(pnl => pnl > 0).length
  return Number(((greenDays / dailyPnL.size) * 100).toFixed(2))
}

/**
 * Calculate total fees for a trade
 * @param trade - Trade object
 * @returns Total fees
 */
export function calculateTotalFees(trade: Trade): number {
  const commission = trade.commission || 0
  const swap = trade.swap || 0
  const slippage = trade.slippage || 0
  return commission + swap + slippage
}

/**
 * Calculate net P&L (gross - fees)
 * @param trade - Trade object
 * @returns Net P&L
 */
export function calculateNetPnL(trade: Trade): number {
  const gross = trade.pnl || 0
  const fees = calculateTotalFees(trade)
  return gross - fees
}

/**
 * Calculate hold time in minutes
 * @param trade - Trade object
 * @returns Hold time in minutes or null
 */
export function calculateHoldTime(trade: Trade): number | null {
  if (!trade.entry_date || !trade.exit_date) return null

  // Use time components (open_time/close_time) when available for intraday accuracy
  const entryTime = trade.open_time || trade.entry_time
  const exitTime = trade.close_time || trade.exit_time

  const entryStr = entryTime
    ? `${trade.entry_date}T${entryTime}:00`
    : trade.entry_date
  const exitStr = exitTime
    ? `${trade.exit_date}T${exitTime}:00`
    : trade.exit_date

  const entry = new Date(entryStr)
  const exit = new Date(exitStr)
  const diff = Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60))
  return diff >= 0 ? diff : null
}

/**
 * Calculate total P&L in currency
 * @param trades - Array of trades
 * @returns Total P&L
 */
export function calculateTotalPnL(trades: Trade[]): number {
  return Number(trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0).toFixed(2))
}

/**
 * Remove outliers (2.5% tails by R)
 * @param trades - Array of trades
 * @returns Filtered array without outliers
 */
export function removeOutliers(trades: Trade[]): Trade[] {
  const rValues = trades
    .map(trade => ({ trade, r: calculateR(trade) }))
    .filter((item): item is { trade: Trade; r: number } => item.r !== null)
    .sort((a, b) => a.r - b.r)

  if (rValues.length < 10) return trades // Need minimum sample size

  const lowerIdx = Math.floor(rValues.length * 0.025)
  const upperIdx = Math.ceil(rValues.length * 0.975) - 1

  const lowerBound = rValues[lowerIdx].r
  const upperBound = rValues[upperIdx].r

  return trades.filter(trade => {
    const r = calculateR(trade)
    return r !== null && r >= lowerBound && r <= upperBound
  })
}

/**
 * Get trade result category
 * @param trade - Trade object
 * @returns Trade result category
 */
export function getTradeResult(trade: Trade): 'winner' | 'loser' | 'breakeven' {
  const r = calculateR(trade)
  if (r === null) return 'breakeven'
  if (r > 0.1) return 'winner'
  if (r < -0.1) return 'loser'
  return 'breakeven'
}
