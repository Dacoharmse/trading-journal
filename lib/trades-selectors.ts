import { Trade } from '@/types/supabase'

/**
 * Calculate R-multiple for a trade
 * R = ((exit - entry) / (entry - stop)) * direction
 */
export function calculateR(trade: Trade): number | null {
  if (!trade.entry_price || !trade.stop_price || !trade.exit_price) return null

  const risk = Math.abs(trade.entry_price - trade.stop_price)
  if (risk === 0) return null

  const pnl = trade.exit_price - trade.entry_price
  const direction = trade.direction === 'long' ? 1 : -1

  return (pnl / risk) * direction
}

/**
 * Calculate total fees for a trade
 */
export function calculateTotalFees(trade: Trade): number {
  const commission = trade.commission || 0
  const swap = trade.swap || 0
  const slippage = trade.slippage || 0
  return commission + swap + slippage
}

/**
 * Calculate net P&L (gross - fees)
 */
export function calculateNetPnL(trade: Trade): number {
  const gross = trade.pnl || 0
  const fees = calculateTotalFees(trade)
  return gross - fees
}

/**
 * Calculate hold time in minutes
 */
export function calculateHoldTime(trade: Trade): number | null {
  if (!trade.entry_date || !trade.exit_date) return null

  const entry = new Date(trade.entry_date)
  const exit = new Date(trade.exit_date)

  return Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60))
}

/**
 * Format hold time as human-readable string
 */
export function formatHoldTime(minutes: number | null): string {
  if (minutes === null) return 'N/A'

  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`

  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return `${days}d ${hours}h`
}

/**
 * Format P&L with currency symbol and thousands separator
 */
export function formatPnL(value: number, currency: string = 'USD'): string {
  const symbol = getCurrencySymbol(currency)
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  return value >= 0 ? `+${symbol}${formatted}` : `-${symbol}${formatted}`
}

/**
 * Format R-multiple
 */
export function formatR(r: number | null): string {
  if (r === null) return 'N/A'
  const sign = r >= 0 ? '+' : ''
  return `${sign}${r.toFixed(2)}R`
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    ZAR: 'R',
    EUR: '€',
    GBP: '£',
  }
  return symbols[currency] || currency
}

/**
 * Calculate profit factor from array of trades (in R)
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
  return totalWins / totalLosses
}

/**
 * Calculate expectancy (mean R) from array of trades
 */
export function calculateExpectancy(trades: Trade[]): number | null {
  const rValues = trades.map(calculateR).filter((r): r is number => r !== null)

  if (rValues.length === 0) return null

  const sum = rValues.reduce((acc, r) => acc + r, 0)
  return sum / rValues.length
}

/**
 * Calculate win rate from array of trades
 */
export function calculateWinRate(trades: Trade[]): number | null {
  const rValues = trades.map(calculateR).filter((r): r is number => r !== null)

  if (rValues.length === 0) return null

  const wins = rValues.filter(r => r > 0).length
  return (wins / rValues.length) * 100
}

/**
 * Calculate total P&L in currency
 */
export function calculateTotalPnL(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
}

/**
 * Calculate total R
 */
export function calculateTotalR(trades: Trade[]): number {
  return trades.reduce((sum, trade) => {
    const r = calculateR(trade)
    return sum + (r || 0)
  }, 0)
}

/**
 * Remove outliers (2.5% tails by R)
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
 */
export function getTradeResult(trade: Trade): 'winner' | 'loser' | 'breakeven' {
  const r = calculateR(trade)
  if (r === null) return 'breakeven'
  if (r > 0.1) return 'winner'
  if (r < -0.1) return 'loser'
  return 'breakeven'
}

/**
 * Get direction icon
 */
export function getDirectionIcon(direction: 'long' | 'short'): string {
  return direction === 'long' ? '▲' : '▼'
}

/**
 * Get P&L color class
 */
export function getPnLColorClass(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

/**
 * Get direction color class
 */
export function getDirectionColorClass(trade: Trade): string {
  const r = calculateR(trade)
  if (r === null) return 'text-gray-600 dark:text-gray-400'

  const isWinner = r > 0
  const isLong = trade.direction === 'long'

  if (isWinner && isLong) return 'text-green-600 dark:text-green-400'
  if (isWinner && !isLong) return 'text-green-600 dark:text-green-400'
  if (!isWinner && isLong) return 'text-red-600 dark:text-red-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Parse comma-separated tags
 */
export function parseTags(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

/**
 * Parse comma-separated confluences
 */
export function parseConfluences(confluences: string | null): string[] {
  if (!confluences) return []
  return confluences.split(',').map(c => c.trim()).filter(Boolean)
}

/**
 * Format tags/confluences for display
 */
export function formatChips(items: string[], maxVisible: number = 3): { visible: string[]; overflow: number } {
  if (items.length <= maxVisible) {
    return { visible: items, overflow: 0 }
  }

  return {
    visible: items.slice(0, maxVisible),
    overflow: items.length - maxVisible,
  }
}
